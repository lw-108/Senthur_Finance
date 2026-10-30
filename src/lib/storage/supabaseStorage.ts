import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/supabase/activeOrg';
import { StorageProvider, UploadProgressCallback, UploadResult } from './index';

export class SupabaseStorageProvider implements StorageProvider {
  private bucket = 'documents';

  async uploadFile(
    fileUri: string,
    destinationPath: string,
    mimeType: string = 'image/jpeg',
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult> {
    if (!isSupabaseConfigured()) {
      // In offline/unconfigured mode, return local URI
      onProgress?.(100);
      return {
        url: fileUri,
        storagePath: destinationPath,
        mime: mimeType,
      };
    }

    const orgId = await getActiveOrganizationId();
    // Enforce multi-tenant path convention: {organization_id}/{relative_path}
    const safePath = destinationPath.startsWith(`${orgId}/`)
      ? destinationPath
      : `${orgId}/${destinationPath.replace(/^\/+/, '')}`;

    onProgress?.(15);

    // Read file bytes across web and native
    const response = await fetch(fileUri);
    const blob = await response.blob();
    onProgress?.(40);

    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(safePath, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`[Supabase Storage] Upload failed: ${error.message}`);
    }

    onProgress?.(85);

    // Private bucket: generate signed URL for authorized access (valid for 1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(safePath, 3600);

    const accessUrl = signedData?.signedUrl || fileUri;
    onProgress?.(100);

    return {
      url: accessUrl,
      storagePath: safePath,
      sizeBytes: blob.size,
      mime: mimeType,
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.storage.from(this.bucket).remove([storagePath]);
    if (error) {
      console.warn(`[Supabase Storage] Delete failed for ${storagePath}:`, error.message);
    }
  }

  async getPublicUrl(storagePath: string): Promise<string> {
    if (!isSupabaseConfigured()) return storagePath;

    // Documents bucket is private; create a signed URL
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      const { data: pubData } = supabase.storage.from(this.bucket).getPublicUrl(storagePath);
      return pubData.publicUrl;
    }

    return data.signedUrl;
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!isSupabaseConfigured()) return storagePath;

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  }
}
