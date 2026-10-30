import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getActiveOrganizationId, DEFAULT_ORG_ID } from '@/lib/supabase/activeOrg';
import { secureStorage } from '@/lib/storage/secureStorage';
import {
  InterestType,
  RatePeriod,
  RepaymentFrequency,
  TenureUnit,
} from '@/lib/finance/types';
import { CollateralType } from '@/features/loans/types';

const LOAN_PRODUCTS_KEY = 'loanledger_loan_products';

export interface LoanProduct {
  id: string;
  name: string;
  category: 'Gold' | 'Monthly' | 'Weekly' | 'Daily' | 'Vehicle' | 'Property' | 'Business' | 'Personal';
  description: string;
  interestType: InterestType;
  defaultRate: number; // percentage
  ratePeriod: RatePeriod; // 'PER_MONTH' | 'PER_ANNUM'
  repaymentFrequency: RepaymentFrequency;
  defaultTenureValue: number;
  defaultTenureUnit: TenureUnit;
  collateralType: CollateralType;
  requiredDocuments: string[];
  graceDays: number;
  penaltyRatePercent: number; // monthly penalty %
  isConcessionAllowed: boolean;
  maxConcessionPercent: number; // max waiver on settlement
  isActive: boolean;
  isSystemDefault: boolean;
  createdAt: string;
}

export const DEFAULT_LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: 'prod-gold-1',
    name: 'Gold Loan (Jewel Loan)',
    category: 'Gold',
    description: 'Jewelry pledge loan with flexible monthly interest payment and bullet principal.',
    interestType: 'INTEREST_ONLY',
    defaultRate: 1.5,
    ratePeriod: 'PER_MONTH',
    repaymentFrequency: 'MONTHLY',
    defaultTenureValue: 12,
    defaultTenureUnit: 'MONTHS',
    collateralType: 'Gold',
    requiredDocuments: ['Gold Purity Certificate', 'Appraisal Weight Slip', 'Promissory Note'],
    graceDays: 5,
    penaltyRatePercent: 2.0,
    isConcessionAllowed: true,
    maxConcessionPercent: 15,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-monthly-1',
    name: 'Monthly Interest Loan (Hand Loan)',
    category: 'Monthly',
    description: 'Promissory note backed loan with monthly simple interest settlement.',
    interestType: 'SIMPLE',
    defaultRate: 2.0,
    ratePeriod: 'PER_MONTH',
    repaymentFrequency: 'MONTHLY',
    defaultTenureValue: 6,
    defaultTenureUnit: 'MONTHS',
    collateralType: 'Promissory',
    requiredDocuments: ['Signed Promissory Note (DPN)', 'Bank Security Cheque (Undated)', 'Aadhaar Card Copy'],
    graceDays: 3,
    penaltyRatePercent: 2.5,
    isConcessionAllowed: true,
    maxConcessionPercent: 10,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-weekly-1',
    name: 'Weekly Micro Loan',
    category: 'Weekly',
    description: 'Short term weekly installment plan for shop owners and market vendors.',
    interestType: 'FLAT',
    defaultRate: 20.0,
    ratePeriod: 'PER_YEAR',
    repaymentFrequency: 'WEEKLY',
    defaultTenureValue: 10,
    defaultTenureUnit: 'WEEKS',
    collateralType: 'None',
    requiredDocuments: ['Aadhaar Card Copy', 'Bank Passbook Front Page', 'Shop Registration / Visiting Card'],
    graceDays: 2,
    penaltyRatePercent: 2.0,
    isConcessionAllowed: false,
    maxConcessionPercent: 0,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-daily-1',
    name: 'Daily Collection Loan (100-Day Thandal)',
    category: 'Daily',
    description: 'Daily collection scheme with upfront processing deduction and fixed daily repayments.',
    interestType: 'FLAT',
    defaultRate: 18.0,
    ratePeriod: 'PER_YEAR',
    repaymentFrequency: 'DAILY',
    defaultTenureValue: 100,
    defaultTenureUnit: 'DAYS',
    collateralType: 'None',
    requiredDocuments: ['Daily Collection Card Entry', 'Business Place Photo', 'Guarantor Sign'],
    graceDays: 1,
    penaltyRatePercent: 1.0,
    isConcessionAllowed: false,
    maxConcessionPercent: 0,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-bike-rc',
    name: 'Property Loan - Bike RC Book Loan',
    category: 'Vehicle',
    description: 'Two-wheeler hypothecation loan against physical RC Book pledge.',
    interestType: 'REDUCING_BALANCE',
    defaultRate: 2.5,
    ratePeriod: 'PER_MONTH',
    repaymentFrequency: 'MONTHLY',
    defaultTenureValue: 12,
    defaultTenureUnit: 'MONTHS',
    collateralType: 'Vehicle',
    requiredDocuments: ['Original Bike RC Book', 'Duplicate Key', 'Vehicle Insurance Policy', 'PUC Certificate', 'Form 29 & 30'],
    graceDays: 3,
    penaltyRatePercent: 3.0,
    isConcessionAllowed: true,
    maxConcessionPercent: 10,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-car-rc',
    name: 'Property Loan - Car RC Book Loan',
    category: 'Vehicle',
    description: 'Four-wheeler asset loan backed by vehicle registration book and key deposit.',
    interestType: 'REDUCING_BALANCE',
    defaultRate: 2.0,
    ratePeriod: 'PER_MONTH',
    repaymentFrequency: 'MONTHLY',
    defaultTenureValue: 24,
    defaultTenureUnit: 'MONTHS',
    collateralType: 'Vehicle',
    requiredDocuments: ['Original Car RC Book', 'Original Insurance Policy', 'Duplicate Smart Key', 'RTO Form 28/29/30 Signed', 'Owner NOC'],
    graceDays: 5,
    penaltyRatePercent: 2.5,
    isConcessionAllowed: true,
    maxConcessionPercent: 10,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-land-doc',
    name: 'Property Loan - Land Document Loan',
    category: 'Property',
    description: 'Agricultural or commercial vacant plot title deposit loan with simple interest.',
    interestType: 'SIMPLE',
    defaultRate: 1.5,
    ratePeriod: 'PER_MONTH',
    repaymentFrequency: 'MONTHLY',
    defaultTenureValue: 36,
    defaultTenureUnit: 'MONTHS',
    collateralType: 'Property',
    requiredDocuments: ['Original Registered Sale Deed', 'Patta / Chitta Extract', 'Encumbrance Certificate (15 Years)', 'Property Tax Receipt'],
    graceDays: 7,
    penaltyRatePercent: 2.0,
    isConcessionAllowed: true,
    maxConcessionPercent: 15,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-house-prop',
    name: 'Property Loan - House Property Loan',
    category: 'Property',
    description: 'Residential property mortgage with structured reducing balance monthly installments.',
    interestType: 'REDUCING_BALANCE',
    defaultRate: 1.25,
    ratePeriod: 'PER_MONTH',
    repaymentFrequency: 'MONTHLY',
    defaultTenureValue: 60,
    defaultTenureUnit: 'MONTHS',
    collateralType: 'Property',
    requiredDocuments: ['Original House Title Deed', 'Approved Building Plan', 'Parent Link Documents', 'EC (30 Years)', 'Property Valuation Report'],
    graceDays: 7,
    penaltyRatePercent: 2.0,
    isConcessionAllowed: true,
    maxConcessionPercent: 20,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
];

interface LoanProductsState {
  products: LoanProduct[];
  isLoaded: boolean;

  initialize: () => Promise<void>;
  addProduct: (product: Omit<LoanProduct, 'id' | 'createdAt' | 'isSystemDefault'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<LoanProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useLoanProductsStore = create<LoanProductsState>((set, get) => ({
  products: DEFAULT_LOAN_PRODUCTS,
  isLoaded: false,

  initialize: async () => {
    try {
      const local = await secureStorage.getItem(LOAN_PRODUCTS_KEY);
      let products: LoanProduct[] = local ? JSON.parse(local) : DEFAULT_LOAN_PRODUCTS;

      // Sync from Supabase organization_settings if available
      if (isSupabaseConfigured()) {
        try {
          const orgId = await getActiveOrganizationId();
          if (orgId && orgId !== DEFAULT_ORG_ID) {
            const { data, error } = await (supabase.from('organization_settings') as any)
              .select('loan_products')
              .eq('organization_id', orgId)
              .maybeSingle();

            if (!error && data?.loan_products && Array.isArray(data.loan_products) && data.loan_products.length > 0) {
              products = data.loan_products as LoanProduct[];
            }
          }
        } catch {
          // Offline
        }
      }

      set({ products, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  addProduct: async (newProd) => {
    const product: LoanProduct = {
      ...newProd,
      id: `prod-custom-${Date.now()}`,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
    };

    const nextProducts = [product, ...get().products];
    set({ products: nextProducts });

    await secureStorage.setItem(LOAN_PRODUCTS_KEY, JSON.stringify(nextProducts));
    if (isSupabaseConfigured()) {
      try {
        const orgId = await getActiveOrganizationId();
        if (orgId && orgId !== DEFAULT_ORG_ID) {
          await (supabase.from('organization_settings') as any)
            .upsert({
              organization_id: orgId,
              loan_products: nextProducts,
              updated_at: new Date().toISOString(),
            });
        }
      } catch {}
    }
  },

  updateProduct: async (id, updates) => {
    const nextProducts = get().products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    set({ products: nextProducts });

    await secureStorage.setItem(LOAN_PRODUCTS_KEY, JSON.stringify(nextProducts));
    if (isSupabaseConfigured()) {
      try {
        const orgId = await getActiveOrganizationId();
        if (orgId && orgId !== DEFAULT_ORG_ID) {
          await (supabase.from('organization_settings') as any)
            .upsert({
              organization_id: orgId,
              loan_products: nextProducts,
              updated_at: new Date().toISOString(),
            });
        }
      } catch {}
    }
  },

  deleteProduct: async (id) => {
    const nextProducts = get().products.filter((p) => p.id !== id);
    set({ products: nextProducts });

    await secureStorage.setItem(LOAN_PRODUCTS_KEY, JSON.stringify(nextProducts));
    if (isSupabaseConfigured()) {
      try {
        const orgId = await getActiveOrganizationId();
        if (orgId && orgId !== DEFAULT_ORG_ID) {
          await (supabase.from('organization_settings') as any)
            .upsert({
              organization_id: orgId,
              loan_products: nextProducts,
              updated_at: new Date().toISOString(),
            });
        }
      } catch {}
    }
  },

  resetToDefaults: async () => {
    set({ products: DEFAULT_LOAN_PRODUCTS });
    await secureStorage.setItem(LOAN_PRODUCTS_KEY, JSON.stringify(DEFAULT_LOAN_PRODUCTS));
    if (isSupabaseConfigured()) {
      try {
        const orgId = await getActiveOrganizationId();
        if (orgId && orgId !== DEFAULT_ORG_ID) {
          await (supabase.from('organization_settings') as any)
            .upsert({
              organization_id: orgId,
              loan_products: DEFAULT_LOAN_PRODUCTS,
              updated_at: new Date().toISOString(),
            });
        }
      } catch {}
    }
  },
}));
