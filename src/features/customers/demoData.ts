import { Customer } from './types';

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

export function getDemoCustomers(adminUid: string = 'demo_admin'): Customer[] {
  const customers: Customer[] = [];

  for (let i = 0; i < 25; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[i % LAST_NAMES.length];
    const fullName = `${fn} ${ln}`;
    const cityInfo = CITIES[i % CITIES.length];
    const phone = `98${String(40000000 + i * 135791).slice(0, 8)}`;
    const custId = `cust-${String(i + 1).padStart(3, '0')}`;

    const isOverdue = i % 5 === 1;
    const activeLoans = i % 4 === 0 ? 0 : (i % 3) + 1;
    const principalPaise = (i + 1) * 25000 * 100; // ₹25k - ₹625k
    const paidRatio = isOverdue ? 0.3 : 0.65;
    const totalPaid = Math.round(principalPaise * paidRatio);
    const totalOutstanding = activeLoans > 0 ? principalPaise - totalPaid : 0;
    const overdueAmount = isOverdue ? Math.round(totalOutstanding * 0.45) : 0;

    customers.push({
      id: custId,
      fullName,
      nickname: fn,
      phone,
      altPhone: `94${String(20000000 + i * 246810).slice(0, 8)}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      whatsapp: phone,
      gender: i % 4 === 2 ? 'Female' : 'Male',
      occupation: OCCUPATIONS[i % OCCUPATIONS.length],
      monthlyIncome: Math.round(35000 + (i % 7) * 15000) * 100, // paise
      address: {
        line1: `${12 + i * 4}, Cross Street, Ward ${1 + (i % 20)}`,
        city: cityInfo.city,
        state: cityInfo.state,
        pincode: cityInfo.pincode,
      },
      idProofs: [
        {
          id: `proof-${custId}-1`,
          type: 'Aadhaar',
          number: `${2000 + i * 31}${4000 + i * 47}${6000 + i * 53}`,
          verified: true,
        },
        {
          id: `proof-${custId}-2`,
          type: 'PAN',
          number: `ABCDE${1000 + i}F`,
          verified: true,
        },
      ],
      references: [
        {
          name: `${LAST_NAMES[(i + 3) % LAST_NAMES.length]} Kumar`,
          relation: 'Neighbor / Colleague',
          phone: `97${String(30000000 + i * 321654).slice(0, 8)}`,
        },
      ],
      guarantor: {
        name: `${FIRST_NAMES[(i + 5) % FIRST_NAMES.length]} ${LAST_NAMES[(i + 2) % LAST_NAMES.length]}`,
        phone: `96${String(50000000 + i * 112233).slice(0, 8)}`,
        address: `${cityInfo.city}, Tamil Nadu`,
      },
      tags: i % 4 === 0 ? ['High Value', 'Trusted'] : isOverdue ? ['Overdue Notice', 'Follow-up'] : ['Regular'],
      rating: isOverdue ? 2 : 5,
      creditScoreInternal: isOverdue ? 52 : Math.min(95, 72 + (i % 6) * 4),
      totals: {
        activeLoans,
        totalLent: principalPaise,
        totalOutstanding,
        totalPaid,
        overdueAmount,
      },
      status: i === 13 ? 'Blacklisted' : activeLoans > 0 ? 'Active' : 'Inactive',
      createdAt: new Date(2026, 0, 1 + (i % 28)).toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: adminUid,
      isDeleted: false,
    });
  }

  return customers;
}
