-- ==============================================================================
-- SENTHUR FINANCE - PRIVATE STORAGE BUCKET & RLS POLICIES
-- Supabase Storage Configuration
-- Migration: 20261029000001_storage_setup.sql
-- ==============================================================================

-- 1. Create Private Storage Bucket for proofs, KYC, receipts, and avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false, -- Private bucket: access only via signed URLs or authenticated RLS
    52428800, -- 50MB maximum file size
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'application/pdf',
        'video/mp4',
        'video/quicktime'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800;

-- 2. Storage Objects RLS Policies
-- Objects are organized by tenant: "{organization_id}/{category}/{filename}"

-- Helper function to extract organization UUID from storage path
CREATE OR REPLACE FUNCTION public.get_storage_path_org_id(name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    first_part TEXT;
BEGIN
    first_part := split_part(name, '/', 1);
    RETURN first_part::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Allow authenticated members to read objects belonging to their organization
CREATE POLICY "tenant_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
    );

-- Allow authenticated staff, admin, owner to upload objects to their organization folder
CREATE POLICY "tenant_storage_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(public.get_storage_path_org_id(name)) IN ('owner', 'admin', 'staff')
    );

-- Allow admins & owners to delete objects in their organization folder
CREATE POLICY "tenant_storage_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(public.get_storage_path_org_id(name)) IN ('owner', 'admin')
    );
