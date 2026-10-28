/**
 * Seed script generating 25 realistic demo customers, 40 loans with varied interest types,
 * and comprehensive payment history so every screen looks rich and populated.
 */
import { Customer } from '../src/features/customers/types';
import { Loan } from '../src/features/loans/types';
import { Payment } from '../src/features/payments/types';
import { calculateLoanSchedule } from '../src/lib/finance/schedule';

export interface SeedDataset {
  customers: Customer[];
  loans: Loan[];
  payments: Payment[];
}

const FIRST_NAMES = [
  'Karthik', 'Sundar', 'Anitha', 'Murugan', 'Saravanan',
  'Meenakshi', 'Prakash', 'Dinesh', 'Kavitha', 'Venkatesh',
  'Radha', 'Senthil', 'Selvi', 'Mani', 'Lakshmi',
  'Ganesh', 'Deepa', 'Suresh', 'Bhavani', 'Ramesh',
  'Nandhini', 'Vijay', 'Shanthi', 'Balaji', 'Revathi'
];

const LAST_NAMES = [
  'Raja', 'Pichai', 'Devi', 'Kumar', 'Gounder',
  'Natarajan', 'Chettiar', 'Pillai', 'Swamy', 'Iyer',
  'Varadhan', 'Pandian', 'Babu', 'Subramanian', 'Chandran'
];

const CITIES = [
  { city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641012' },
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' },
  { city: 'Madurai', state: 'Tamil Nadu', pincode: '625001' },
  { city: 'Tirupur', state: 'Tamil Nadu', pincode: '641604' },
  { city: 'Salem', state: 'Tamil Nadu', pincode: '636001' },
  { city: 'Erode', state: 'Tamil Nadu', pincode: '638001' },
];

const OCCUPATIONS = [
  'Textile Merchant', 'Poultry Farm Owner', 'Automobile Mechanic',
  'Grocery Wholesaler', 'Powerloom Operator', 'Civil Contractor',
  'Dairy Farmer', 'Gold Jeweller', 'Hardware Shop Owner', 'Software Consultant'
];

export function generateSeedData(): SeedDataset {
  const customers: Customer[] = [];
  const loans: Loan[] = [];
  const payments: Payment[] = [];

  // 1. Generate 25 Customers
  for (let i = 0; i < 25; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[i % LAST_NAMES.length];
    const fullName = `${fn} ${ln}`;
    const cityInfo = CITIES[i % CITIES.length];
    const phone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
    const custId = `cust-${String(i + 1).padStart(3, '0')}`;

    customers.push({
      id: custId,
      fullName,
      nickname: fn,
      phone,
      altPhone: `94${Math.floor(10000000 + Math.random() * 89999999)}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      whatsapp: phone,
      gender: i % 4 === 2 ? 'Female' : 'Male',
      occupation: OCCUPATIONS[i % OCCUPATIONS.length],
      monthlyIncome: Math.round(30000 + Math.random() * 120000) * 100, // paise
      address: {
        line1: `${Math.floor(10 + Math.random() * 200)}, Main Road, Ward ${Math.floor(1 + Math.random() * 30)}`,
        city: cityInfo.city,
        state: cityInfo.state,
        pincode: cityInfo.pincode,
      },
      idProofs: [
        {
          id: `proof-${custId}-1`,
          type: 'Aadhaar',
          number: `${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`,
          verified: true,
        },
        {
          id: `proof-${custId}-2`,
          type: 'PAN',
          number: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
          verified: true,
        },
      ],
      references: [
        {
          name: `${LAST_NAMES[(i + 3) % LAST_NAMES.length]} Kumar`,
          relation: 'Neighbor / Colleague',
          phone: `97${Math.floor(10000000 + Math.random() * 89999999)}`,
        },
      ],
      guarantor: {
        name: `${FIRST_NAMES[(i + 5) % FIRST_NAMES.length]} ${LAST_NAMES[(i + 2) % LAST_NAMES.length]}`,
        phone: `96${Math.floor(10000000 + Math.random() * 89999999)}`,
        address: `${cityInfo.city}, Tamil Nadu`,
      },
      tags: i % 5 === 0 ? ['High Value', 'Trusted'] : i % 7 === 0 ? ['Risky', 'Weekly'] : ['Regular'],
      rating: i % 7 === 0 ? 2 : 5,
      creditScoreInternal: i % 7 === 0 ? 55 : Math.floor(78 + Math.random() * 18),
      totals: {
        activeLoans: 0,
        totalLent: 0,
        totalOutstanding: 0,
        totalPaid: 0,
        overdueAmount: 0,
      },
      status: i % 12 === 0 ? 'Blacklisted' : 'Active',
      createdAt: new Date(2026, 0, Math.floor(1 + Math.random() * 28)).toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin_demo_uid',
      isDeleted: false,
    });
  }

  // 2. Generate 40 Loans
  const INTEREST_TYPES = ['REDUCING_BALANCE', 'SIMPLE', 'FLAT', 'INTEREST_ONLY'] as const;
  const CATEGORIES = ['Vehicle Loan', 'Gold Loan', 'Business Loan', 'Personal Loan', 'Emergency Loan'];

  for (let i = 0; i < 40; i++) {
    const cust = customers[i % customers.length];
    const loanId = `ln-${String(i + 1).padStart(3, '0')}`;
    const loanNumber = `LN-2026-${String(i + 1).padStart(4, '0')}`;
    const cat = CATEGORIES[i % CATEGORIES.length];
    const interestType = INTEREST_TYPES[i % INTEREST_TYPES.length];
    const principalRupees = Math.round((50000 + (i % 8) * 50000) / 1000) * 1000;
    const principalPaise = principalRupees * 100;

    const rate = cat === 'Gold Loan' ? 12 : cat === 'Vehicle Loan' ? 14 : cat === 'Business Loan' ? 18 : 24;
    const tenureMonths = cat === 'Gold Loan' ? 6 : (i % 2 === 0 ? 12 : 24);

    const isOverdue = i % 6 === 0;
    const isClosed = i % 5 === 0 && !isOverdue;
    const status = isClosed ? 'CLOSED' : isOverdue ? 'OVERDUE' : 'ACTIVE';

    const scheduleResult = calculateLoanSchedule({
      principal: principalPaise,
      interestType,
      interestRate: rate,
      ratePeriod: 'PER_YEAR',
      compounding: 'NONE',
      disbursedOn: '2026-03-01',
      tenureValue: tenureMonths,
      tenureUnit: 'MONTHS',
      repaymentFrequency: 'MONTHLY',
    });

    const paidRatio = isClosed ? 1 : isOverdue ? 0.3 : 0.5;
    const totalPaidPaise = Math.round(scheduleResult.totalPayable * paidRatio);
    const outstandingPrincipalPaise = isClosed ? 0 : Math.round(principalPaise * (1 - paidRatio));

    const daysOverdue = isOverdue ? 14 + (i % 15) : 0;
    const penaltyAccrued = isOverdue ? daysOverdue * 5000 : 0;

    loans.push({
      id: loanId,
      customerId: cust.id,
      customerName: cust.fullName,
      loanNumber,
      title: `${cat} - ${cust.occupation}`,
      category: cat,
      principal: principalPaise,
      currency: 'INR',
      interestType,
      interestRate: rate,
      ratePeriod: 'PER_YEAR',
      compounding: 'NONE',
      repaymentFrequency: 'MONTHLY',
      disbursedOn: '2026-03-01',
      firstDueDate: '2026-04-01',
      tenure: { value: tenureMonths, unit: 'MONTHS' },
      maturityDate: scheduleResult.maturityDate,
      installmentAmount: scheduleResult.installmentAmount,
      numberOfInstallments: scheduleResult.numberOfInstallments,
      upfrontDeduction: 100000,
      advanceInterestDeducted: false,
      effectiveAnnualRate: scheduleResult.effectiveAnnualRate,
      penalty: { type: 'FLAT_PER_DAY', value: 5000, graceDays: 3 },
      collateral: {
        type: cat === 'Gold Loan' ? 'Gold' : cat === 'Vehicle Loan' ? 'Vehicle' : 'None',
        description: cat === 'Gold Loan' ? 'Hallmarked 22k Gold Jewelry' : cat === 'Vehicle Loan' ? 'Two Wheeler Registration' : undefined,
      },
      proofs: [
        {
          id: `proof-${loanId}-1`,
          kind: 'PromissoryNote',
          title: 'Promissory Note Signed',
          url: 'https://example.com/promissory.jpg',
          uploadedAt: '2026-03-01',
        },
      ],
      witnesses: [{ name: 'S. Raman', phone: '9840123456' }],
      status,
      outstandingPrincipal: outstandingPrincipalPaise,
      accruedInterest: isClosed ? 0 : 45000,
      totalPayable: scheduleResult.totalPayable,
      totalPaid: totalPaidPaise,
      nextDueDate: isClosed ? undefined : isOverdue ? '2026-10-01' : '2026-11-01',
      daysOverdue,
      penaltyAccrued,
      progressPercent: Math.round(paidRatio * 100),
      tags: [cat],
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
      createdBy: 'admin_demo_uid',
      isDeleted: false,
    });

    // Update customer totals
    if (!isClosed) {
      cust.totals.activeLoans += 1;
      cust.totals.totalLent += principalPaise;
      cust.totals.totalOutstanding += outstandingPrincipalPaise;
      cust.totals.totalPaid += totalPaidPaise;
      if (isOverdue) cust.totals.overdueAmount += outstandingPrincipalPaise;
    }

    // 3. Generate 1-2 Payments for each active/closed loan
    if (totalPaidPaise > 0) {
      payments.push({
        id: `pay-${loanId}-1`,
        loanId,
        customerId: cust.id,
        customerName: cust.fullName,
        loanNumber,
        receiptNumber: `REC-2026-${String(payments.length + 1001).padStart(4, '0')}`,
        amount: Math.round(scheduleResult.installmentAmount),
        paidOn: '2026-08-01T10:30:00Z',
        mode: i % 2 === 0 ? 'UPI' : 'CASH',
        allocation: {
          penalty: 0,
          interest: Math.round(scheduleResult.installmentAmount * 0.2),
          principal: Math.round(scheduleResult.installmentAmount * 0.8),
        },
        type: 'INSTALLMENT',
        createdAt: '2026-08-01T10:30:00Z',
        updatedAt: '2026-08-01T10:30:00Z',
        createdBy: 'admin_demo_uid',
        isDeleted: false,
      });
    }
  }

  return { customers, loans, payments };
}

// When executed directly via node/ts-node
if (require.main === module) {
  const seed = generateSeedData();
  console.log(`Generated ${seed.customers.length} customers, ${seed.loans.length} loans, ${seed.payments.length} payments.`);
}
