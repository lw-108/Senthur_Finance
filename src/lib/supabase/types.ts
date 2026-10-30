/**
 * Supabase Database Type Definitions for Senthur Finance Multi-Tenant SaaS
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = 'owner' | 'admin' | 'staff' | 'read_only';
export type OrgStatus = 'active' | 'suspended' | 'archived';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          status: OrgStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: OrgStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: OrgStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: OrgRole;
          status: MemberStatus;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role: OrgRole;
          status?: MemberStatus;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          role?: OrgRole;
          status?: MemberStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_settings: {
        Row: {
          organization_id: string;
          business_profile: Json;
          currency_settings: Json;
          loan_products: Json;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          business_profile?: Json;
          currency_settings?: Json;
          loan_products?: Json;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          business_profile?: Json;
          currency_settings?: Json;
          loan_products?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          nickname: string | null;
          phone: string;
          alt_phone: string | null;
          email: string | null;
          whatsapp: string | null;
          photo_url: string | null;
          gender: string | null;
          dob: string | null;
          occupation: string | null;
          monthly_income_paise: number;
          address: Json;
          id_proofs: Json;
          customer_references: Json;
          guarantor: Json | null;
          tags: string[];
          notes: string | null;
          rating: number | null;
          credit_score_internal: number | null;
          status: 'Active' | 'Inactive' | 'Blacklisted';
          totals: Json;
          is_deleted: boolean;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          legacy_firestore_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          full_name: string;
          nickname?: string | null;
          phone: string;
          alt_phone?: string | null;
          email?: string | null;
          whatsapp?: string | null;
          photo_url?: string | null;
          gender?: string | null;
          dob?: string | null;
          occupation?: string | null;
          monthly_income_paise?: number;
          address?: Json;
          id_proofs?: Json;
          customer_references?: Json;
          guarantor?: Json | null;
          tags?: string[];
          notes?: string | null;
          rating?: number | null;
          credit_score_internal?: number | null;
          status?: 'Active' | 'Inactive' | 'Blacklisted';
          totals?: Json;
          is_deleted?: boolean;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          legacy_firestore_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          nickname?: string | null;
          phone?: string;
          alt_phone?: string | null;
          email?: string | null;
          whatsapp?: string | null;
          photo_url?: string | null;
          gender?: string | null;
          dob?: string | null;
          occupation?: string | null;
          monthly_income_paise?: number;
          address?: Json;
          id_proofs?: Json;
          customer_references?: Json;
          guarantor?: Json | null;
          tags?: string[];
          notes?: string | null;
          rating?: number | null;
          credit_score_internal?: number | null;
          status?: 'Active' | 'Inactive' | 'Blacklisted';
          totals?: Json;
          is_deleted?: boolean;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          legacy_firestore_id?: string | null;
        };
        Relationships: [];
      };
      loans: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          customer_name: string;
          loan_number: string;
          title: string;
          category: string;
          principal_minor_units: number;
          currency_code: string;
          interest_type: string;
          interest_rate: number;
          rate_period: string;
          compounding: string;
          repayment_frequency: string;
          disbursed_on: string;
          first_due_date: string;
          tenure_value: number;
          tenure_unit: string;
          maturity_date: string;
          installment_amount_minor_units: number;
          number_of_installments: number;
          upfront_deduction_minor_units: number;
          advance_interest_deducted: boolean;
          effective_annual_rate: number | null;
          penalty_config: Json;
          collateral: Json;
          proofs: Json;
          witnesses: Json;
          status: 'DRAFT' | 'ACTIVE' | 'OVERDUE' | 'CLOSED' | 'WRITTEN_OFF' | 'RENEWED';
          outstanding_principal_minor_units: number;
          accrued_interest_minor_units: number;
          total_payable_minor_units: number;
          total_paid_minor_units: number;
          next_due_date: string | null;
          days_overdue: number;
          penalty_accrued_minor_units: number;
          progress_percent: number;
          closed_on: string | null;
          notes: string | null;
          tags: string[];
          is_deleted: boolean;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          legacy_firestore_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          customer_name: string;
          loan_number: string;
          title: string;
          category: string;
          principal_minor_units: number;
          currency_code?: string;
          interest_type: string;
          interest_rate: number;
          rate_period: string;
          compounding: string;
          repayment_frequency: string;
          disbursed_on: string;
          first_due_date: string;
          tenure_value: number;
          tenure_unit: string;
          maturity_date: string;
          installment_amount_minor_units: number;
          number_of_installments: number;
          upfront_deduction_minor_units?: number;
          advance_interest_deducted?: boolean;
          effective_annual_rate?: number | null;
          penalty_config?: Json;
          collateral?: Json;
          proofs?: Json;
          witnesses?: Json;
          status?: 'DRAFT' | 'ACTIVE' | 'OVERDUE' | 'CLOSED' | 'WRITTEN_OFF' | 'RENEWED';
          outstanding_principal_minor_units?: number;
          accrued_interest_minor_units?: number;
          total_payable_minor_units?: number;
          total_paid_minor_units?: number;
          next_due_date?: string | null;
          days_overdue?: number;
          penalty_accrued_minor_units?: number;
          progress_percent?: number;
          closed_on?: string | null;
          notes?: string | null;
          tags?: string[];
          is_deleted?: boolean;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          legacy_firestore_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          customer_name?: string;
          loan_number?: string;
          title?: string;
          category?: string;
          principal_minor_units?: number;
          currency_code?: string;
          interest_type?: string;
          interest_rate?: number;
          rate_period?: string;
          compounding?: string;
          repayment_frequency?: string;
          disbursed_on?: string;
          first_due_date?: string;
          tenure_value?: number;
          tenure_unit?: string;
          maturity_date?: string;
          installment_amount_minor_units?: number;
          number_of_installments?: number;
          upfront_deduction_minor_units?: number;
          advance_interest_deducted?: boolean;
          effective_annual_rate?: number | null;
          penalty_config?: Json;
          collateral?: Json;
          proofs?: Json;
          witnesses?: Json;
          status?: 'DRAFT' | 'ACTIVE' | 'OVERDUE' | 'CLOSED' | 'WRITTEN_OFF' | 'RENEWED';
          outstanding_principal_minor_units?: number;
          accrued_interest_minor_units?: number;
          total_payable_minor_units?: number;
          total_paid_minor_units?: number;
          next_due_date?: string | null;
          days_overdue?: number;
          penalty_accrued_minor_units?: number;
          progress_percent?: number;
          closed_on?: string | null;
          notes?: string | null;
          tags?: string[];
          is_deleted?: boolean;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          legacy_firestore_id?: string | null;
        };
        Relationships: [];
      };
      loan_schedules: {
        Row: {
          id: string;
          organization_id: string;
          loan_id: string;
          installment_number: number;
          due_date: string;
          principal_due_minor_units: number;
          interest_due_minor_units: number;
          total_due_minor_units: number;
          status: string;
          paid_date: string | null;
          paid_amount_minor_units: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          loan_id: string;
          installment_number: number;
          due_date: string;
          principal_due_minor_units: number;
          interest_due_minor_units: number;
          total_due_minor_units: number;
          status?: string;
          paid_date?: string | null;
          paid_amount_minor_units?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          loan_id?: string;
          installment_number?: number;
          due_date?: string;
          principal_due_minor_units?: number;
          interest_due_minor_units?: number;
          total_due_minor_units?: number;
          status?: string;
          paid_date?: string | null;
          paid_amount_minor_units?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          loan_id: string;
          customer_id: string;
          customer_name: string;
          loan_number: string;
          receipt_number: string;
          amount_minor_units: number;
          currency_code: string;
          paid_at: string;
          mode: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'OTHER';
          type: string;
          allocation: Json;
          reference_no: string | null;
          receipt_url: string | null;
          notes: string | null;
          is_deleted: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          legacy_firestore_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          loan_id: string;
          customer_id: string;
          customer_name: string;
          loan_number: string;
          receipt_number: string;
          amount_minor_units: number;
          currency_code?: string;
          paid_at: string;
          mode: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'OTHER';
          type: string;
          allocation?: Json;
          reference_no?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          is_deleted?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          legacy_firestore_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          loan_id?: string;
          customer_id?: string;
          customer_name?: string;
          loan_number?: string;
          receipt_number?: string;
          amount_minor_units?: number;
          currency_code?: string;
          paid_at?: string;
          mode?: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'OTHER';
          type?: string;
          allocation?: Json;
          reference_no?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          is_deleted?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          legacy_firestore_id?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          loan_id: string | null;
          storage_path: string;
          original_filename: string;
          content_type: string | null;
          size_bytes: number | null;
          kind: string;
          uploaded_by: string | null;
          created_at: string;
          legacy_firestore_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          loan_id?: string | null;
          storage_path: string;
          original_filename: string;
          content_type?: string | null;
          size_bytes?: number | null;
          kind: string;
          uploaded_by?: string | null;
          created_at?: string;
          legacy_firestore_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string | null;
          loan_id?: string | null;
          storage_path?: string;
          original_filename?: string;
          content_type?: string | null;
          size_bytes?: number | null;
          kind?: string;
          uploaded_by?: string | null;
          created_at?: string;
          legacy_firestore_id?: string | null;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          summary: string;
          before: Json | null;
          after: Json | null;
          metadata: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          summary: string;
          before?: Json | null;
          after?: Json | null;
          metadata?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          summary?: string;
          before?: Json | null;
          after?: Json | null;
          metadata?: Json;
          occurred_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_org_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      get_user_role: {
        Args: {
          org_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
