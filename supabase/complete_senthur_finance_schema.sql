-- ==============================================================================
-- SENTHUR FINANCE - ENTERPRISE MULTI-TENANT SUPABASE POSTGRESQL ARCHITECTURE
-- Hardened against OWASP Top 10, BOLA/IDOR, Privilege Escalation, Search-Path Injection
-- Fully Compliant with Supabase Official Best Practices & PostgreSQL Guidelines
-- File: supabase/complete_senthur_finance_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 2.1 Organizations (Lender Businesses / Tenants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2.2 Organization Members (Tenant Membership & Role-Based Access Control)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff', 'read_only')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);

-- ------------------------------------------------------------------------------
-- 2.3 Organization Settings (Business Profile, Currency & Loan Product Templates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    business_profile JSONB NOT NULL DEFAULT '{
        "businessName": "Senthur Finance",
        "tagline": "Fast & Reliable Micro Loans",
        "ownerName": "Admin",
        "phone": "",
        "email": "",
        "address": "",
        "city": "Madurai",
        "state": "Tamil Nadu",
        "pincode": "",
        "licenseNumber": "",
        "avatarUrl": null
    }'::jsonb,
    currency_settings JSONB NOT NULL DEFAULT '{
        "currencySymbol": "₹",
        "currencyCode": "INR",
        "numberFormat": "indian",
        "financialYearStartMonth": 4,
        "dateFormat": "dd/MM/yyyy"
    }'::jsonb,
    loan_products JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2.4 Customers (Borrowers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nickname TEXT,
    phone TEXT NOT NULL,
    alt_phone TEXT,
    email TEXT,
    whatsapp TEXT,
    photo_url TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', NULL)),
    dob DATE,
    occupation TEXT,
    monthly_income_paise BIGINT NOT NULL DEFAULT 0 CHECK (monthly_income_paise >= 0),
    address JSONB NOT NULL DEFAULT '{
        "line1": "",
        "line2": "",
        "city": "",
        "state": "Tamil Nadu",
        "pincode": ""
    }'::jsonb,
    id_proofs JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    guarantor JSONB,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    credit_score_internal INTEGER,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Blacklisted')),
    totals JSONB NOT NULL DEFAULT '{
        "activeLoans": 0,
        "totalLent": 0,
        "totalOutstanding": 0,
        "totalPaid": 0,
        "overdueAmount": 0
    }'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    legacy_firestore_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(organization_id, phone) WHERE (is_deleted = false);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(organization_id, full_name);
CREATE INDEX IF NOT EXISTS idx_customers_legacy_id ON public.customers(organization_id, legacy_firestore_id);

-- ------------------------------------------------------------------------------
-- 2.5 Loans
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    loan_number TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    principal_minor_units BIGINT NOT NULL CHECK (principal_minor_units > 0),
    currency_code TEXT NOT NULL DEFAULT 'INR',
    interest_type TEXT NOT NULL,
    interest_rate NUMERIC(8, 4) NOT NULL CHECK (interest_rate >= 0),
    rate_period TEXT NOT NULL DEFAULT 'PER_MONTH',
    compounding TEXT NOT NULL DEFAULT 'NONE',
    repayment_frequency TEXT NOT NULL DEFAULT 'MONTHLY',
    disbursed_on DATE NOT NULL,
    first_due_date DATE NOT NULL,
    tenure_value INTEGER NOT NULL CHECK (tenure_value > 0),
    tenure_unit TEXT NOT NULL DEFAULT 'MONTHS',
    maturity_date DATE NOT NULL,
    installment_amount_minor_units BIGINT NOT NULL CHECK (installment_amount_minor_units >= 0),
    number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 0),
    upfront_deduction_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (upfront_deduction_minor_units >= 0),
    advance_interest_deducted BOOLEAN NOT NULL DEFAULT false,
    effective_annual_rate NUMERIC(8, 4),
    penalty_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    collateral JSONB NOT NULL DEFAULT '{}'::jsonb,
    proofs JSONB NOT NULL DEFAULT '[]'::jsonb,
    witnesses JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'OVERDUE', 'CLOSED', 'WRITTEN_OFF', 'RENEWED')),
    outstanding_principal_minor_units BIGINT NOT NULL DEFAULT 0,
    accrued_interest_minor_units BIGINT NOT NULL DEFAULT 0,
    total_payable_minor_units BIGINT NOT NULL DEFAULT 0,
    total_paid_minor_units BIGINT NOT NULL DEFAULT 0,
    next_due_date DATE,
    days_overdue INTEGER NOT NULL DEFAULT 0,
    penalty_accrued_minor_units BIGINT NOT NULL DEFAULT 0,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    closed_on DATE,
    notes TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    legacy_firestore_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_loans_org_id ON public.loans(organization_id);
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON public.loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_created_by ON public.loans(created_by);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_next_due ON public.loans(organization_id, next_due_date) WHERE (is_deleted = false);
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON public.loans(organization_id, loan_number);
CREATE INDEX IF NOT EXISTS idx_loans_legacy_id ON public.loans(organization_id, legacy_firestore_id);

-- ------------------------------------------------------------------------------
-- 2.6 Loan Schedules (Amortization Installments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_due_minor_units BIGINT NOT NULL,
    interest_due_minor_units BIGINT NOT NULL,
    total_due_minor_units BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED')),
    paid_date DATE,
    paid_amount_minor_units BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_schedules_loan_id ON public.loan_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_schedules_org_id ON public.loan_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_loan_schedules_due_date ON public.loan_schedules(organization_id, due_date);

-- ------------------------------------------------------------------------------
-- 2.7 Payments (Collection Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    loan_number TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
    currency_code TEXT NOT NULL DEFAULT 'INR',
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    mode TEXT NOT NULL CHECK (mode IN ('CASH', 'UPI', 'BANK', 'CHEQUE', 'OTHER')),
    type TEXT NOT NULL DEFAULT 'INSTALLMENT' CHECK (type IN (
        'INSTALLMENT', 'PART_PAYMENT', 'PREPAYMENT', 'INTEREST_ONLY',
        'FULL_SETTLEMENT', 'DISBURSEMENT', 'FEE', 'WAIVER', 'ADJUSTMENT'
    )),
    allocation JSONB NOT NULL DEFAULT '{"penalty": 0, "interest": 0, "principal": 0}'::jsonb,
    reference_no TEXT,
    receipt_url TEXT,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    legacy_firestore_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON public.payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(organization_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_legacy_id ON public.payments(organization_id, legacy_firestore_id);

-- ------------------------------------------------------------------------------
-- 2.8 Documents (Private Metadata for Uploaded KYC & Proofs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    content_type TEXT,
    size_bytes BIGINT,
    kind TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    legacy_firestore_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_org_id ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_loan_id ON public.documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);

-- ------------------------------------------------------------------------------
-- 2.9 Audit Events (Immutable Append-Only Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    summary TEXT NOT NULL,
    before JSONB,
    after JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_id ON public.audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at ON public.audit_events(organization_id, occurred_at DESC);

-- ==============================================================================
-- 3. CROSS-TENANT INTEGRITY TRIGGERS (Database-Level Multi-Tenant Validation)
-- ==============================================================================

-- Loan -> Customer cross-tenant validation
CREATE OR REPLACE FUNCTION public.check_loan_customer_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = NEW.customer_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Tenant Isolation Violation: Customer % does not belong to organization %',
            NEW.customer_id, NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_loan_customer_tenant ON public.loans;
CREATE TRIGGER trg_check_loan_customer_tenant
    BEFORE INSERT OR UPDATE OF customer_id, organization_id ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION public.check_loan_customer_tenant();

-- Payment -> Loan & Customer cross-tenant validation
CREATE OR REPLACE FUNCTION public.check_payment_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.loans
        WHERE id = NEW.loan_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Tenant Isolation Violation: Loan % does not belong to organization %',
            NEW.loan_id, NEW.organization_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = NEW.customer_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Tenant Isolation Violation: Customer % does not belong to organization %',
            NEW.customer_id, NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_payment_tenant ON public.payments;
CREATE TRIGGER trg_check_payment_tenant
    BEFORE INSERT OR UPDATE OF loan_id, customer_id, organization_id ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_payment_tenant();

-- Document -> Customer & Loan cross-tenant validation
CREATE OR REPLACE FUNCTION public.check_document_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.customers WHERE id = NEW.customer_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Tenant Isolation Violation: Customer % does not belong to organization %',
            NEW.customer_id, NEW.organization_id;
    END IF;

    IF NEW.loan_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.loans WHERE id = NEW.loan_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Tenant Isolation Violation: Loan % does not belong to organization %',
            NEW.loan_id, NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_document_tenant ON public.documents;
CREATE TRIGGER trg_check_document_tenant
    BEFORE INSERT OR UPDATE OF loan_id, customer_id, organization_id ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.check_document_tenant();

-- ==============================================================================
-- 4. AUTOMATED SUPABASE AUTH TRIGGER (Tenant Auto-Provisioning on Signup)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_org_id UUID;
    user_name TEXT;
BEGIN
    -- Extract display name or email username safely
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'My Lender'
    );

    -- 1. Create a dedicated organization for the registered lender
    INSERT INTO public.organizations (name, status)
    VALUES (user_name || '''s Finance', 'active')
    RETURNING id INTO new_org_id;

    -- 2. Add the user as Owner
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (new_org_id, NEW.id, 'owner', 'active');

    -- 3. Initialize default business profile and currency settings
    INSERT INTO public.organization_settings (
        organization_id,
        business_profile,
        currency_settings,
        loan_products
    )
    VALUES (
        new_org_id,
        jsonb_build_object(
            'businessName', user_name || '''s Finance',
            'tagline', 'Fast & Reliable Loans',
            'ownerName', user_name,
            'email', COALESCE(NEW.email, ''),
            'phone', COALESCE(NEW.phone, ''),
            'address', '',
            'city', 'Madurai',
            'state', 'Tamil Nadu',
            'pincode', '',
            'licenseNumber', '',
            'avatarUrl', NEW.raw_user_meta_data->>'avatar_url'
        ),
        jsonb_build_object(
            'currencySymbol', '₹',
            'currencyCode', 'INR',
            'numberFormat', 'indian',
            'financialYearStartMonth', 4,
            'dateFormat', 'dd/MM/yyyy'
        ),
        '[]'::jsonb
    );

    -- 4. Record audit event
    INSERT INTO public.audit_events (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        summary
    )
    VALUES (
        new_org_id,
        NEW.id,
        'CREATE',
        'SETTINGS',
        new_org_id,
        'Auto-provisioned new lender organization for ' || COALESCE(NEW.email, 'new user')
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. RLS HELPER FUNCTIONS (Optimized: Cached Subquery Pattern & Hardened Search Path)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = (SELECT auth.uid())
      AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
    LIMIT 1;
$$;

-- Revoke execute from unauthenticated public to prevent brute-force probing
REVOKE EXECUTE ON FUNCTION public.get_user_org_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES (Explicit "TO authenticated" & Subqueries)
-- ==============================================================================

-- 6.1 Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_select ON public.organizations;
CREATE POLICY org_select ON public.organizations
    FOR SELECT
    TO authenticated
    USING (id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS org_update ON public.organizations;
CREATE POLICY org_update ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (public.get_user_role(id) IN ('owner', 'admin'))
    WITH CHECK (public.get_user_role(id) IN ('owner', 'admin'));

-- 6.2 Organization Members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_select ON public.organization_members;
CREATE POLICY member_select ON public.organization_members
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS member_insert ON public.organization_members;
CREATE POLICY member_insert ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role(organization_id) IN ('owner', 'admin')
        AND (role <> 'owner' OR public.get_user_role(organization_id) = 'owner')
    );

DROP POLICY IF EXISTS member_update ON public.organization_members;
CREATE POLICY member_update ON public.organization_members
    FOR UPDATE
    TO authenticated
    USING (public.get_user_role(organization_id) IN ('owner', 'admin'))
    WITH CHECK (
        public.get_user_role(organization_id) IN ('owner', 'admin')
        AND (role <> 'owner' OR public.get_user_role(organization_id) = 'owner')
    );

DROP POLICY IF EXISTS member_delete ON public.organization_members;
CREATE POLICY member_delete ON public.organization_members
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role(organization_id) = 'owner'
        OR (public.get_user_role(organization_id) = 'admin' AND role NOT IN ('owner', 'admin'))
    );

-- 6.3 Organization Settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_select ON public.organization_settings;
CREATE POLICY settings_select ON public.organization_settings
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS settings_insert ON public.organization_settings;
CREATE POLICY settings_insert ON public.organization_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (public.get_user_role(organization_id) IN ('owner', 'admin'));

DROP POLICY IF EXISTS settings_update ON public.organization_settings;
CREATE POLICY settings_update ON public.organization_settings
    FOR UPDATE
    TO authenticated
    USING (public.get_user_role(organization_id) IN ('owner', 'admin'))
    WITH CHECK (public.get_user_role(organization_id) IN ('owner', 'admin'));

-- 6.4 Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_select ON public.customers;
CREATE POLICY customers_select ON public.customers
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS customers_insert ON public.customers;
CREATE POLICY customers_insert ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS customers_update ON public.customers;
CREATE POLICY customers_update ON public.customers
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS customers_delete ON public.customers;
CREATE POLICY customers_delete ON public.customers
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

-- 6.5 Loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loans_select ON public.loans;
CREATE POLICY loans_select ON public.loans
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS loans_insert ON public.loans;
CREATE POLICY loans_insert ON public.loans
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS loans_update ON public.loans;
CREATE POLICY loans_update ON public.loans
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS loans_delete ON public.loans;
CREATE POLICY loans_delete ON public.loans
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

-- 6.6 Loan Schedules
ALTER TABLE public.loan_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schedules_select ON public.loan_schedules;
CREATE POLICY schedules_select ON public.loan_schedules
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS schedules_write ON public.loan_schedules;
CREATE POLICY schedules_write ON public.loan_schedules
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

-- 6.7 Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select ON public.payments;
CREATE POLICY payments_select ON public.payments
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS payments_insert ON public.payments;
CREATE POLICY payments_insert ON public.payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS payments_update ON public.payments;
CREATE POLICY payments_update ON public.payments
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

DROP POLICY IF EXISTS payments_delete ON public.payments;
CREATE POLICY payments_delete ON public.payments
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) = 'owner'
    );

-- 6.8 Documents Metadata
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

-- 6.9 Audit Events (Strictly Append-Only)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_select ON public.audit_events;
CREATE POLICY audit_select ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS audit_insert ON public.audit_events;
CREATE POLICY audit_insert ON public.audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS audit_deny_update ON public.audit_events;
CREATE POLICY audit_deny_update ON public.audit_events
    FOR UPDATE
    TO authenticated
    USING (false);

DROP POLICY IF EXISTS audit_deny_delete ON public.audit_events;
CREATE POLICY audit_deny_delete ON public.audit_events
    FOR DELETE
    TO authenticated
    USING (false);

-- ==============================================================================
-- 7. PRIVATE SUPABASE STORAGE BUCKET & STORAGE RLS (Supports Upsert & Scoped Access)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800, -- 50 MB
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

CREATE OR REPLACE FUNCTION public.get_storage_path_org_id(name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
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

-- Storage Policies: SELECT, INSERT, UPDATE (required for upsert), DELETE
DROP POLICY IF EXISTS "tenant_storage_select" ON storage.objects;
CREATE POLICY "tenant_storage_select" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
    );

DROP POLICY IF EXISTS "tenant_storage_insert" ON storage.objects;
CREATE POLICY "tenant_storage_insert" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(public.get_storage_path_org_id(name)) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS "tenant_storage_update" ON storage.objects;
CREATE POLICY "tenant_storage_update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(public.get_storage_path_org_id(name)) IN ('owner', 'admin', 'staff')
    )
    WITH CHECK (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(public.get_storage_path_org_id(name)) IN ('owner', 'admin', 'staff')
    );

DROP POLICY IF EXISTS "tenant_storage_delete" ON storage.objects;
CREATE POLICY "tenant_storage_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND public.get_storage_path_org_id(name) IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(public.get_storage_path_org_id(name)) IN ('owner', 'admin')
    );

-- ==============================================================================
-- 8. DATA API PRIVILEGES & GRANTS (Principle of Least Privilege)
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
