import {
  normalizePhone,
  arePhonesEqual,
  matchesCustomerPhone,
} from '@/lib/phone/normalizePhone';
import {
  applyMergeStrategyToCustomer,
  findMatchingCustomer,
  mergeExistingCustomers,
} from '@/features/customers/customerMergeService';
import { Customer, ContactMergeStrategy } from '@/features/customers/types';
import { secureStorage } from '@/lib/storage/secureStorage';

describe('Phone Number Normalization (normalizePhone & arePhonesEqual)', () => {
  it('normalizes Indian phone with dashes and spaces (+91 98765-43210)', () => {
    const res = normalizePhone('+91 98765-43210');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+919876543210');
    expect(res.digits10).toBe('9876543210');
    expect(res.countryCode).toBe('91');
  });

  it('normalizes Indian phone with leading zero (09876543210)', () => {
    const res = normalizePhone('09876543210');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+919876543210');
    expect(res.digits10).toBe('9876543210');
  });

  it('normalizes plain 10-digit number (9876543210)', () => {
    const res = normalizePhone('9876543210');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+919876543210');
    expect(res.digits10).toBe('9876543210');
  });

  it('normalizes 12-digit number starting with 91 (919876543210)', () => {
    const res = normalizePhone('919876543210');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+919876543210');
    expect(res.digits10).toBe('9876543210');
  });

  it('handles empty or non-numeric input gracefully', () => {
    const res1 = normalizePhone('');
    expect(res1.isValid).toBe(false);
    expect(res1.digits10).toBe('');

    const res2 = normalizePhone(null as any);
    expect(res2.isValid).toBe(false);

    const res3 = normalizePhone('ABC-XYZ');
    expect(res3.isValid).toBe(false);
  });

  it('verifies arePhonesEqual across diverse formats', () => {
    expect(arePhonesEqual('+91 98765-43210', '09876543210')).toBe(true);
    expect(arePhonesEqual('9876543210', '+919876543210')).toBe(true);
    expect(arePhonesEqual('9876543210', '9876543211')).toBe(false);
  });

  it('matches customer candidate phone against primary, alt, or WhatsApp', () => {
    const customer: Partial<Customer> = {
      phone: '9876543210',
      altPhone: '9123456780',
      whatsapp: '9988776655',
    };

    expect(matchesCustomerPhone('+91 98765 43210', customer as any)).toBe(true);
    expect(matchesCustomerPhone('09123456780', customer as any)).toBe(true);
    expect(matchesCustomerPhone('+91 99887-76655', customer as any)).toBe(true);
    expect(matchesCustomerPhone('9999999999', customer as any)).toBe(false);
  });
});

describe('Customer Contact Merge Strategies', () => {
  const existingCustomer: Customer = {
    id: 'cust-101',
    fullName: 'Karthik Raja',
    phone: '9876543210',
    altPhone: undefined,
    email: undefined,
    photoUrl: undefined,
    address: {
      line1: '12 Temple Street',
      city: 'Madurai',
      state: 'Tamil Nadu',
      pincode: '625001',
    },
    idProofs: [],
    references: [],
    tags: ['Existing Borrower'],
    totals: {
      activeLoans: 1,
      totalLent: 5000000,
      totalOutstanding: 2500000,
      totalPaid: 2500000,
      overdueAmount: 0,
    },
    status: 'Active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'admin-1',
    isDeleted: false,
  };

  it('MERGE_INTO_EXISTING: preserves existing fields, unions phone numbers, and fills empty details', () => {
    const contactInput = {
      name: 'Karthik R (Friend)',
      phone: '9876543210',
      allPhones: ['9876543210', '9123456789'],
      email: 'karthik@example.com',
      photoUrl: 'https://example.com/photo.jpg',
    };

    const merged = applyMergeStrategyToCustomer(existingCustomer, contactInput, 'MERGE_INTO_EXISTING');

    // Existing full name is preserved
    expect(merged.fullName).toBe('Karthik Raja');
    // Primary phone is unchanged
    expect(merged.phone).toBe('9876543210');
    // Secondary phone is unioned into altPhone
    expect(merged.altPhone).toContain('+919123456789');
    // Empty email and photo are filled
    expect(merged.email).toBe('karthik@example.com');
    expect(merged.photoUrl).toBe('https://example.com/photo.jpg');
    // Financial totals remain 100% untouched
    expect(merged.totals).toEqual(existingCustomer.totals);
  });

  it('FILL_EMPTY_ONLY: only updates blank fields, never alters existing name, phone, or address', () => {
    const contactInput = {
      name: 'Completely New Name',
      phone: '9876543210',
      allPhones: ['9876543210', '9443322110'],
      email: 'fillme@example.com',
      address: { line1: 'New Address Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    };

    const filled = applyMergeStrategyToCustomer(existingCustomer, contactInput, 'FILL_EMPTY_ONLY');

    // Name and address were NOT overwritten
    expect(filled.fullName).toBe('Karthik Raja');
    expect(filled.address.line1).toBe('12 Temple Street');
    expect(filled.address.city).toBe('Madurai');
    // Empty email and altPhone were filled
    expect(filled.email).toBe('fillme@example.com');
    expect(filled.altPhone).toBe('+919443322110');
  });

  it('OVERWRITE: replaces existing name and primary info with contact details', () => {
    const contactInput = {
      name: 'Karthik Raja - Verified',
      phone: '9443322110',
      allPhones: ['9443322110'],
      email: 'verified@example.com',
      address: { line1: '45 Cross Cut Road', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641012' },
    };

    const overwritten = applyMergeStrategyToCustomer(existingCustomer, contactInput, 'OVERWRITE');

    // Overwritten with incoming contact details
    expect(overwritten.fullName).toBe('Karthik Raja - Verified');
    expect(overwritten.phone).toBe('9443322110');
    // Previous phone preserved in altPhone
    expect(overwritten.altPhone).toBe('9876543210');
    expect(overwritten.email).toBe('verified@example.com');
    expect(overwritten.address.city).toBe('Coimbatore');
    // Totals remain unchanged
    expect(overwritten.totals).toEqual(existingCustomer.totals);
  });

  it('CREATE_NEW: returns existing unchanged when invoked at entity level', () => {
    const contactInput = {
      name: 'Karthik raja Duplicate',
      phone: '9876543210',
    };

    const result = applyMergeStrategyToCustomer(existingCustomer, contactInput, 'CREATE_NEW');
    expect(result).toEqual(existingCustomer);
  });

  it('throws on unknown/invalid merge strategy to prevent silent bugs', () => {
    expect(() => {
      applyMergeStrategyToCustomer(existingCustomer, { name: 'X', phone: '123' }, 'INVALID_STRATEGY' as any);
    }).toThrow('Unhandled contact merge strategy: INVALID_STRATEGY');
  });
});

describe('Ledger Re-pointing & Financial Invariance during Customer Merge', () => {
  beforeEach(async () => {
    const customers: Customer[] = [
      {
        id: 'cust-source',
        fullName: 'Source Customer',
        phone: '9876500001',
        address: { line1: '', city: '', state: '', pincode: '' },
        idProofs: [],
        references: [],
        tags: [],
        totals: { activeLoans: 1, totalLent: 100000, totalOutstanding: 60000, totalPaid: 40000, overdueAmount: 0 },
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        isDeleted: false,
      },
      {
        id: 'cust-target',
        fullName: 'Target Customer',
        phone: '9876500002',
        address: { line1: '1 Main St', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' },
        idProofs: [],
        references: [],
        tags: [],
        totals: { activeLoans: 1, totalLent: 200000, totalOutstanding: 140000, totalPaid: 60000, overdueAmount: 0 },
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        isDeleted: false,
      },
    ];

    const loans = [
      {
        id: 'loan-1',
        customerId: 'cust-source',
        customerName: 'Source Customer',
        principal: 100000,
        remainingBalance: 60000,
        totalPaid: 40000,
        status: 'ACTIVE',
        isDeleted: false,
      },
      {
        id: 'loan-2',
        customerId: 'cust-target',
        customerName: 'Target Customer',
        principal: 200000,
        remainingBalance: 140000,
        totalPaid: 60000,
        status: 'ACTIVE',
        isDeleted: false,
      },
    ];

    const payments = [
      {
        id: 'pmt-1',
        customerId: 'cust-source',
        customerName: 'Source Customer',
        amount: 40000,
      },
      {
        id: 'pmt-2',
        customerId: 'cust-target',
        customerName: 'Target Customer',
        amount: 60000,
      },
    ];

    await secureStorage.setItem('sf_local_customers_cache_v2', JSON.stringify(customers));
    await secureStorage.setItem('sf_local_loans_cache_v2', JSON.stringify(loans));
    await secureStorage.setItem('sf_local_payments_cache_v2', JSON.stringify(payments));
  });

  it('re-points loans and payments from source to target without balance distortion', async () => {
    const result = await mergeExistingCustomers('admin-1', 'cust-source', 'cust-target', 'MERGE_INTO_EXISTING');

    expect(result.rePointedLoans).toBe(1);
    expect(result.rePointedPayments).toBe(1);
    expect(result.targetCustomer.totals.activeLoans).toBe(2);
    expect(result.targetCustomer.totals.totalLent).toBe(300000);
    expect(result.targetCustomer.totals.totalOutstanding).toBe(200000);
    expect(result.targetCustomer.totals.totalPaid).toBe(100000);

    // Verify persisted loans are all pointed to target customer
    const rawLoans = await secureStorage.getItem('sf_local_loans_cache_v2');
    const updatedLoans = JSON.parse(rawLoans!);
    expect(updatedLoans.every((l: any) => l.customerId === 'cust-target')).toBe(true);

    // Verify source customer is soft-deleted and marked Inactive
    const rawCustomers = await secureStorage.getItem('sf_local_customers_cache_v2');
    const updatedCustomers: Customer[] = JSON.parse(rawCustomers!);
    const source = updatedCustomers.find((c) => c.id === 'cust-source');
    expect(source?.isDeleted).toBe(true);
    expect(source?.status).toBe('Inactive');
  });

  it('rejects merging a customer into itself', async () => {
    await expect(
      mergeExistingCustomers('admin-1', 'cust-target', 'cust-target')
    ).rejects.toThrow('Cannot merge a customer into itself');
  });
});
