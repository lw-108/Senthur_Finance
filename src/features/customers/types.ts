export type IdProofType =
  | 'Aadhaar'
  | 'PAN'
  | 'Voter'
  | 'DrivingLicense'
  | 'Passport'
  | 'RationCard'
  | 'Other';

export interface IdProof {
  id: string;
  type: IdProofType;
  number: string; // full number (masked on display)
  frontUrl?: string;
  backUrl?: string;
  storagePath?: string;
  verified?: boolean;
}

export interface CustomerReference {
  name: string;
  relation: string;
  phone: string;
  address?: string;
}

export interface Guarantor {
  name: string;
  phone: string;
  address?: string;
  idProofUrl?: string;
  photoUrl?: string;
}

export interface CustomerAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  geo?: {
    lat: number;
    lng: number;
  };
}

export interface CustomerTotals {
  activeLoans: number;
  totalLent: number; // in paise
  totalOutstanding: number; // in paise
  totalPaid: number; // in paise
  overdueAmount: number; // in paise
}

export type CustomerStatus = 'Active' | 'Inactive' | 'Blacklisted';

export interface Customer {
  id: string;
  fullName: string;
  nickname?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  whatsapp?: string;
  photoUrl?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  occupation?: string;
  monthlyIncome?: number; // in paise
  address: CustomerAddress;
  idProofs: IdProof[];
  references: CustomerReference[];
  guarantor?: Guarantor;
  tags: string[];
  notes?: string;
  rating?: number; // 1 to 5
  creditScoreInternal?: number; // e.g. 85 / 100
  totals: CustomerTotals;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isDeleted: boolean;
}

export interface CustomerFilterParams {
  search?: string;
  status?: CustomerStatus | 'ALL' | 'OVERDUE_ONLY';
  city?: string;
  tag?: string;
  sortBy?: 'name' | 'outstanding' | 'lastPayment' | 'risk';
  sortOrder?: 'asc' | 'desc';
}

export type ContactMergeStrategy =
  | 'CREATE_NEW'
  | 'MERGE_INTO_EXISTING'
  | 'FILL_EMPTY_ONLY'
  | 'OVERWRITE';

export interface BatchMergeContactInput {
  name: string;
  phone: string;
  allPhones?: string[];
  email?: string;
  address?: Partial<CustomerAddress>;
  photoUrl?: string;
  company?: string;
}

export interface MergeStrategyResult {
  added: number;
  updated: number;
  skipped: number;
  mergedDetails: Array<{
    contactName: string;
    phone: string;
    action: 'CREATED' | 'UPDATED' | 'SKIPPED';
    strategy: ContactMergeStrategy;
    customerId: string;
  }>;
}
