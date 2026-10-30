-- ==============================================================================
-- SENTHUR FINANCE - MULTI-TENANT SAAS DATABASE SCHEMA
-- PostgreSQL + Row Level Security (RLS) for Supabase
-- Migration: 20261029000000_multi_tenant_schema.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATIONS (Tenants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. ORGANIZATION MEMBERS (User <-> Tenant Association with RBAC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'read_only')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);

-- ------------------------------------------------------------------------------
-- 3. ORGANIZATION SETTINGS (Business Profile, Currency & Loan Product Templates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    business_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
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
-- 4. CUSTOMERS (Borrowers)
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
    monthly_income_paise BIGINT DEFAULT 0,
    address JSONB NOT NULL DEFAULT '{}'::jsonb,
    id_proofs JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    guarantor JSONB,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
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
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(organization_id, phone) WHERE (is_deleted = false);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(organization_id, full_name);
CREATE INDEX IF NOT EXISTS idx_customers_legacy_id ON public.customers(organization_id, legacy_firestore_id);

-- ------------------------------------------------------------------------------
-- 5. LOANS
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
    interest_rate NUMERIC(8, 4) NOT NULL,
    rate_period TEXT NOT NULL,
    compounding TEXT NOT NULL,
    repayment_frequency TEXT NOT NULL,
    disbursed_on DATE NOT NULL,
    first_due_date DATE NOT NULL,
    tenure_value INTEGER NOT NULL CHECK (tenure_value > 0),
    tenure_unit TEXT NOT NULL,
    maturity_date DATE NOT NULL,
    installment_amount_minor_units BIGINT NOT NULL CHECK (installment_amount_minor_units >= 0),
    number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 0),
    upfront_deduction_minor_units BIGINT NOT NULL DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_next_due ON public.loans(organization_id, next_due_date) WHERE (is_deleted = false);
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON public.loans(organization_id, loan_number);
CREATE INDEX IF NOT EXISTS idx_loans_legacy_id ON public.loans(organization_id, legacy_firestore_id);

-- Cross-tenant customer validation trigger for loans
CREATE OR REPLACE FUNCTION public.check_loan_customer_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = NEW.customer_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Customer % does not belong to organization %', NEW.customer_id, NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_loan_customer_tenant ON public.loans;
CREATE TRIGGER trg_check_loan_customer_tenant
    BEFORE INSERT OR UPDATE OF customer_id, organization_id ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION public.check_loan_customer_tenant();

-- ------------------------------------------------------------------------------
-- 6. LOAN SCHEDULES (Installments)
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

-- ------------------------------------------------------------------------------
-- 7. PAYMENTS
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
    paid_at TIMESTAMPTZ NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('CASH', 'UPI', 'BANK', 'CHEQUE', 'OTHER')),
    type TEXT NOT NULL CHECK (type IN (
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
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(organization_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_legacy_id ON public.payments(organization_id, legacy_firestore_id);

-- Cross-tenant validation trigger for payments
CREATE OR REPLACE FUNCTION public.check_payment_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.loans
        WHERE id = NEW.loan_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Loan % does not belong to organization %', NEW.loan_id, NEW.organization_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = NEW.customer_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Customer % does not belong to organization %', NEW.customer_id, NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_payment_tenant ON public.payments;
CREATE TRIGGER trg_check_payment_tenant
    BEFORE INSERT OR UPDATE OF loan_id, customer_id, organization_id ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_payment_tenant();

-- ------------------------------------------------------------------------------
-- 8. DOCUMENTS (Metadata for private files in Storage)
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

-- Cross-tenant validation trigger for documents
CREATE OR REPLACE FUNCTION public.check_document_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.customers WHERE id = NEW.customer_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Customer % does not belong to organization %', NEW.customer_id, NEW.organization_id;
    END IF;

    IF NEW.loan_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.loans WHERE id = NEW.loan_id AND organization_id = NEW.organization_id
    ) THEN
        RAISE EXCEPTION 'Loan % does not belong to organization %', NEW.loan_id, NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_document_tenant ON public.documents;
CREATE TRIGGER trg_check_document_tenant
    BEFORE INSERT OR UPDATE OF loan_id, customer_id, organization_id ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.check_document_tenant();

-- ------------------------------------------------------------------------------
-- 9. AUDIT EVENTS (Append-only audit trail)
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
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at ON public.audit_events(organization_id, occurred_at DESC);

-- ------------------------------------------------------------------------------
-- RLS HELPER FUNCTIONS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
    LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_select ON public.organizations
    FOR SELECT
    USING (id IN (SELECT public.get_user_org_ids()));

CREATE POLICY org_update ON public.organizations
    FOR UPDATE
    USING (public.get_user_role(id) IN ('owner', 'admin'))
    WITH CHECK (public.get_user_role(id) IN ('owner', 'admin'));

-- Organization Members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_select ON public.organization_members
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY member_insert ON public.organization_members
    FOR INSERT
    WITH CHECK (
        public.get_user_role(organization_id) IN ('owner', 'admin')
        -- Prevent privilege escalation: user cannot grant 'owner' unless caller is 'owner'
        AND (role <> 'owner' OR public.get_user_role(organization_id) = 'owner')
    );

CREATE POLICY member_update ON public.organization_members
    FOR UPDATE
    USING (public.get_user_role(organization_id) IN ('owner', 'admin'))
    WITH CHECK (
        public.get_user_role(organization_id) IN ('owner', 'admin')
        AND (role <> 'owner' OR public.get_user_role(organization_id) = 'owner')
    );

CREATE POLICY member_delete ON public.organization_members
    FOR DELETE
    USING (
        public.get_user_role(organization_id) = 'owner'
        OR (public.get_user_role(organization_id) = 'admin' AND role NOT IN ('owner', 'admin'))
    );

-- Organization Settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON public.organization_settings
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY settings_insert ON public.organization_settings
    FOR INSERT
    WITH CHECK (public.get_user_role(organization_id) IN ('owner', 'admin'));

CREATE POLICY settings_update ON public.organization_settings
    FOR UPDATE
    USING (public.get_user_role(organization_id) IN ('owner', 'admin'))
    WITH CHECK (public.get_user_role(organization_id) IN ('owner', 'admin'));

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON public.customers
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY customers_insert ON public.customers
    FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

CREATE POLICY customers_update ON public.customers
    FOR UPDATE
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

CREATE POLICY customers_delete ON public.customers
    FOR DELETE
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

-- Loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY loans_select ON public.loans
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY loans_insert ON public.loans
    FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

CREATE POLICY loans_update ON public.loans
    FOR UPDATE
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

CREATE POLICY loans_delete ON public.loans
    FOR DELETE
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

-- Loan Schedules
ALTER TABLE public.loan_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedules_select ON public.loan_schedules
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY schedules_write ON public.loan_schedules
    FOR ALL
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON public.payments
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY payments_insert ON public.payments
    FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

-- Void/Soft-delete only; hard deletion restricted to tenant owner
CREATE POLICY payments_update ON public.payments
    FOR UPDATE
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    )
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

CREATE POLICY payments_delete ON public.payments
    FOR DELETE
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) = 'owner'
    );

-- Documents Metadata
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON public.documents
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY documents_insert ON public.documents
    FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin', 'staff')
    );

CREATE POLICY documents_delete ON public.documents
    FOR DELETE
    USING (
        organization_id IN (SELECT public.get_user_org_ids())
        AND public.get_user_role(organization_id) IN ('owner', 'admin')
    );

-- Audit Events (Strictly Append-Only)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_select ON public.audit_events
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY audit_insert ON public.audit_events
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

-- Strictly deny update and delete on audit events
CREATE POLICY audit_no_update ON public.audit_events
    FOR UPDATE
    USING (false);

CREATE POLICY audit_no_delete ON public.audit_events
    FOR DELETE
    USING (false);
