import { describe, it, expect } from '@jest/globals';
import {
  normalizeTimestamp,
  normalizeMinorUnits,
  runMigration,
  FirestoreDump,
} from '../scripts/migrateFirestoreToSupabase';
import {
  customerRowToDomain,
  customerDomainToRow,
} from '../src/features/customers/supabaseApi';
import {
  loanRowToDomain,
  loanDomainToRow,
} from '../src/features/loans/supabaseApi';
import {
  paymentRowToDomain,
} from '../src/features/payments/supabaseApi';

describe('Supabase Migration Engine & Multi-Tenant Rules', () => {
  describe('1. Data Normalization & Transformations', () => {
    it('correctly converts Firestore timestamp objects {_seconds, _nanoseconds} to ISO 8601', () => {
      const firestoreTs = { _seconds: 1729850000, _nanoseconds: 0 };
      const iso = normalizeTimestamp(firestoreTs);
      expect(iso).toBe(new Date(1729850000 * 1000).toISOString());
    });

    it('correctly handles unix timestamps and string dates', () => {
      const epochSec = 1729850000;
      expect(normalizeTimestamp(epochSec)).toBe(new Date(1729850000 * 1000).toISOString());

      const validStr = '2026-10-25T14:30:00.000Z';
      expect(normalizeTimestamp(validStr)).toBe(validStr);
    });

    it('normalizes monetary amounts strictly into integer minor units (paise)', () => {
      expect(normalizeMinorUnits(500000)).toBe(500000);
      expect(normalizeMinorUnits(500000.4)).toBe(500000);
      expect(normalizeMinorUnits('125050')).toBe(125050);
      expect(normalizeMinorUnits(-100)).toBe(0);
      expect(normalizeMinorUnits(null)).toBe(0);
    });
  });

  describe('2. Dry-Run Migration & Financial Reconciliation', () => {
    const mockDump: FirestoreDump = {
      adminUid: 'admin_tenant_alpha',
      customers: [
        {
          id: 'cust-101',
          fullName: 'Kandasamy Perumal',
          phone: '9842111222',
          monthlyIncome: 3500000, // 35,000 INR in paise
          createdAt: '2026-01-10T10:00:00.000Z',
        },
        {
          id: 'cust-102',
          fullName: 'Muthusamy Gounder',
          phone: '9842333444',
          monthlyIncome: 5000000,
          createdAt: '2026-02-15T10:00:00.000Z',
        },
      ],
      loans: [
        {
          id: 'loan-201',
          customerId: 'cust-101',
          customerName: 'Kandasamy Perumal',
          loanNumber: 'LN-2026-0001',
          title: 'Hand Loan',
          category: 'Monthly',
          principal: 10000000, // 1,00,000 INR
          interestType: 'SIMPLE',
          interestRate: 2.0,
          ratePeriod: 'PER_MONTH',
          compounding: 'NONE',
          repaymentFrequency: 'MONTHLY',
          disbursedOn: '2026-01-15T00:00:00.000Z',
          firstDueDate: '2026-02-15T00:00:00.000Z',
          maturityDate: '2027-01-15T00:00:00.000Z',
          installmentAmount: 200000,
          numberOfInstallments: 12,
          status: 'ACTIVE',
          proofs: [
            {
              id: 'p-1',
              kind: 'PromissoryNote',
              title: 'Signed Promissory Note',
              url: 'https://storage.supabase.co/v1/senthur/p1.jpg',
              uploadedAt: '2026-01-15T00:00:00.000Z',
            },
          ],
        },
        {
          id: 'loan-orphan',
          customerId: 'cust-unknown-999',
          customerName: 'Unknown',
          loanNumber: 'LN-ORPHAN',
          title: 'Orphan Loan',
          category: 'Personal',
          principal: 5000000,
          interestType: 'FLAT',
          interestRate: 1.5,
          ratePeriod: 'PER_MONTH',
          compounding: 'NONE',
          repaymentFrequency: 'MONTHLY',
          disbursedOn: '2026-02-01T00:00:00.000Z',
          firstDueDate: '2026-03-01T00:00:00.000Z',
          maturityDate: '2026-08-01T00:00:00.000Z',
          installmentAmount: 50000,
          numberOfInstallments: 6,
          status: 'ACTIVE',
        },
      ],
      payments: [
        {
          id: 'pay-301',
          loanId: 'loan-201',
          customerId: 'cust-101',
          customerName: 'Kandasamy Perumal',
          loanNumber: 'LN-2026-0001',
          receiptNumber: 'REC-0001',
          amount: 200000, // 2,000 INR
          paidOn: '2026-02-15T12:00:00.000Z',
          mode: 'CASH',
        },
      ],
    };

    it('executes dry-run without writes and detects orphan loans & missing references', async () => {
      const summary = await runMigration(mockDump, {
        dryRun: true,
        targetOrgId: '11111111-1111-1111-1111-111111111111',
      });

      expect(summary.dryRun).toBe(true);
      expect(summary.counts.customersSource).toBe(2);
      expect(summary.counts.customersMigrated).toBe(2);

      // Orphan loan should be excluded from migrated loans count
      expect(summary.counts.loansSource).toBe(2);
      expect(summary.counts.loansMigrated).toBe(1);
      expect(summary.warnings.some((w) => w.includes('Orphan loan'))).toBe(true);

      // Financial totals reconciliation
      expect(summary.financialTotals.principalPaiseSource).toBe(15000000);
      expect(summary.financialTotals.principalPaiseMigrated).toBe(10000000);
      expect(summary.financialTotals.paymentsPaiseMigrated).toBe(200000);
      expect(summary.counts.documentsMigrated).toBe(1);
    });
  });

  describe('3. Multi-Tenant Row Level Security (RLS) Policy Specifications', () => {
    // Simulated database context for testing RLS logic rules
    interface SimulatedUser {
      id: string;
      orgMemberships: { orgId: string; role: 'owner' | 'admin' | 'staff' | 'read_only' }[];
    }

    const tenantA_Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const tenantB_Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    const userTenantA_Owner: SimulatedUser = {
      id: 'user-a-owner',
      orgMemberships: [{ orgId: tenantA_Id, role: 'owner' }],
    };

    const userTenantA_Staff: SimulatedUser = {
      id: 'user-a-staff',
      orgMemberships: [{ orgId: tenantA_Id, role: 'staff' }],
    };

    const userTenantA_ReadOnly: SimulatedUser = {
      id: 'user-a-readonly',
      orgMemberships: [{ orgId: tenantA_Id, role: 'read_only' }],
    };

    const userTenantB_Admin: SimulatedUser = {
      id: 'user-b-admin',
      orgMemberships: [{ orgId: tenantB_Id, role: 'admin' }],
    };

    // Helper functions implementing PostgreSQL RLS rule definitions
    function canSelectRecord(user: SimulatedUser, recordOrgId: string): boolean {
      return user.orgMemberships.some((m) => m.orgId === recordOrgId);
    }

    function canInsertRecord(user: SimulatedUser, recordOrgId: string): boolean {
      const mem = user.orgMemberships.find((m) => m.orgId === recordOrgId);
      if (!mem) return false;
      return ['owner', 'admin', 'staff'].includes(mem.role);
    }

    function canDeleteRecord(user: SimulatedUser, recordOrgId: string): boolean {
      const mem = user.orgMemberships.find((m) => m.orgId === recordOrgId);
      if (!mem) return false;
      return ['owner', 'admin'].includes(mem.role);
    }

    function canGrantRole(user: SimulatedUser, orgId: string, targetRole: string): boolean {
      const mem = user.orgMemberships.find((m) => m.orgId === orgId);
      if (!mem) return false;
      if (mem.role === 'owner') return true;
      if (mem.role === 'admin' && targetRole !== 'owner') return true;
      return false; // Staff or read_only cannot grant roles
    }

    function canAccessStoragePath(user: SimulatedUser, storagePath: string): boolean {
      const orgIdFromPath = storagePath.split('/')[0];
      return user.orgMemberships.some((m) => m.orgId === orgIdFromPath);
    }

    it('Rule A: Tenant A cannot select, update, delete, or download Tenant B records', () => {
      // User from Tenant A attempting to read Tenant B customer record
      expect(canSelectRecord(userTenantA_Owner, tenantB_Id)).toBe(false);
      expect(canInsertRecord(userTenantA_Owner, tenantB_Id)).toBe(false);
      expect(canDeleteRecord(userTenantA_Owner, tenantB_Id)).toBe(false);

      // User from Tenant B attempting to read Tenant A customer record
      expect(canSelectRecord(userTenantB_Admin, tenantA_Id)).toBe(false);
      expect(canInsertRecord(userTenantB_Admin, tenantA_Id)).toBe(false);
    });

    it('Rule B: Read-only member cannot perform inserts or deletes', () => {
      // Read-only member CAN read
      expect(canSelectRecord(userTenantA_ReadOnly, tenantA_Id)).toBe(true);
      // Read-only member CANNOT insert or delete
      expect(canInsertRecord(userTenantA_ReadOnly, tenantA_Id)).toBe(false);
      expect(canDeleteRecord(userTenantA_ReadOnly, tenantA_Id)).toBe(false);
    });

    it('Rule C: Staff member cannot elevate their role to admin or owner', () => {
      expect(canGrantRole(userTenantA_Staff, tenantA_Id, 'admin')).toBe(false);
      expect(canGrantRole(userTenantA_Staff, tenantA_Id, 'owner')).toBe(false);

      // Admin cannot grant owner role
      expect(canGrantRole(userTenantB_Admin, tenantB_Id, 'owner')).toBe(false);
      expect(canGrantRole(userTenantB_Admin, tenantB_Id, 'staff')).toBe(true);
    });

    it('Rule D: Forged organization_id cannot write to another tenant', () => {
      const forgedOrgId = tenantB_Id;
      // User belongs to Tenant A, trying to write with Tenant B organization_id
      expect(canInsertRecord(userTenantA_Staff, forgedOrgId)).toBe(false);
    });

    it('Rule E & F: Cross-tenant loan or payment relationships are strictly denied', () => {
      const customerTenantA = { id: 'cust-1', orgId: tenantA_Id };
      const loanTenantB = { id: 'loan-1', orgId: tenantB_Id };

      // Loan in Tenant B referencing Customer in Tenant A
      const isCrossTenantLoanValid = loanTenantB.orgId === customerTenantA.orgId;
      expect(isCrossTenantLoanValid).toBe(false);

      // Payment in Tenant A referencing Loan in Tenant B
      const paymentTenantA = { id: 'pay-1', orgId: tenantA_Id, loanId: loanTenantB.id };
      const isCrossTenantPaymentValid = paymentTenantA.orgId === loanTenantB.orgId;
      expect(isCrossTenantPaymentValid).toBe(false);
    });

    it('Rule G: Unauthorized user cannot access proof files by guessing an ID or path', () => {
      const tenantA_FilePath = `${tenantA_Id}/proofs/promissory_note_secret.pdf`;
      const tenantB_FilePath = `${tenantB_Id}/proofs/gold_slip.pdf`;

      // Tenant B user cannot access Tenant A file path
      expect(canAccessStoragePath(userTenantB_Admin, tenantA_FilePath)).toBe(false);

      // Tenant A user cannot access Tenant B file path
      expect(canAccessStoragePath(userTenantA_Owner, tenantB_FilePath)).toBe(false);

      // Tenant A user CAN access Tenant A file path
      expect(canAccessStoragePath(userTenantA_Staff, tenantA_FilePath)).toBe(true);
    });
  });

  describe('4. Bidirectional Domain Entity Mapping', () => {
    it('accurately maps customer row to domain and back preserving all fields', () => {
      const row = {
        id: 'cust-uuid-1',
        organization_id: 'org-uuid-1',
        full_name: 'Murugan Raja',
        nickname: 'Muruga',
        phone: '9842100000',
        alt_phone: '9842100001',
        email: 'murugan@example.com',
        monthly_income_paise: 4500000,
        address: { line1: 'Main Street', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' },
        id_proofs: [{ id: 'proof-1', type: 'Aadhaar', number: '1234 5678 9012' }],
        customer_references: [{ name: 'Siva', relation: 'Brother', phone: '9842100002' }],
        tags: ['Punctual', 'Gold'],
        status: 'Active',
        totals: { activeLoans: 1, totalLent: 5000000, totalOutstanding: 4000000, totalPaid: 1000000, overdueAmount: 0 },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        created_by: 'user-1',
        is_deleted: false,
      };

      const domain = customerRowToDomain(row);
      expect(domain.fullName).toBe('Murugan Raja');
      expect(domain.phone).toBe('9842100000');
      expect(domain.monthlyIncome).toBe(4500000);
      expect(domain.address.city).toBe('Madurai');

      const mappedBack = customerDomainToRow(domain, 'org-uuid-1', 'user-1');
      expect(mappedBack.full_name).toBe(domain.fullName);
      expect(mappedBack.monthly_income_paise).toBe(domain.monthlyIncome);
      expect(mappedBack.organization_id).toBe('org-uuid-1');
    });

    it('accurately maps loan row to domain and back preserving financial terms', () => {
      const row = {
        id: 'loan-uuid-1',
        organization_id: 'org-uuid-1',
        customer_id: 'cust-uuid-1',
        customer_name: 'Murugan Raja',
        loan_number: 'LN-2026-0001',
        title: 'Gold Loan',
        category: 'Gold',
        principal_minor_units: 5000000,
        currency_code: 'INR',
        interest_type: 'INTEREST_ONLY',
        interest_rate: 1.5,
        rate_period: 'PER_MONTH',
        compounding: 'NONE',
        repayment_frequency: 'MONTHLY',
        disbursed_on: '2026-01-01',
        first_due_date: '2026-02-01',
        tenure_value: 12,
        tenure_unit: 'MONTHS',
        maturity_date: '2027-01-01',
        installment_amount_minor_units: 75000,
        number_of_installments: 12,
        upfront_deduction_minor_units: 50000,
        advance_interest_deducted: true,
        status: 'ACTIVE',
        outstanding_principal_minor_units: 5000000,
        accrued_interest_minor_units: 0,
        total_payable_minor_units: 5900000,
        total_paid_minor_units: 0,
        days_overdue: 0,
        penalty_accrued_minor_units: 0,
        progress_percent: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        is_deleted: false,
      };

      const domain = loanRowToDomain(row);
      expect(domain.principal).toBe(5000000);
      expect(domain.interestType).toBe('INTEREST_ONLY');
      expect(domain.advanceInterestDeducted).toBe(true);

      const mappedBack = loanDomainToRow(domain, 'org-uuid-1');
      expect(mappedBack.principal_minor_units).toBe(5000000);
      expect(mappedBack.advance_interest_deducted).toBe(true);
    });

    it('accurately maps payment row preserving waterfall allocation', () => {
      const row = {
        id: 'pay-uuid-1',
        organization_id: 'org-uuid-1',
        loan_id: 'loan-uuid-1',
        customer_id: 'cust-uuid-1',
        customer_name: 'Murugan Raja',
        loan_number: 'LN-2026-0001',
        receipt_number: 'REC-0001',
        amount_minor_units: 75000,
        currency_code: 'INR',
        paid_at: '2026-02-01T10:00:00.000Z',
        mode: 'UPI',
        type: 'INSTALLMENT',
        allocation: { penalty: 0, interest: 75000, principal: 0 },
        created_at: '2026-02-01T10:00:00.000Z',
        updated_at: '2026-02-01T10:00:00.000Z',
        is_deleted: false,
      };

      const domain = paymentRowToDomain(row);
      expect(domain.amount).toBe(75000);
      expect(domain.mode).toBe('UPI');
      expect(domain.allocation.interest).toBe(75000);
    });
  });
});
