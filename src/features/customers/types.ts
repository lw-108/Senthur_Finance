export type IdProofType =
  | 'Aadhaar'
  | 'PAN'
  | 'Voter'
  | 'DrivingLicense'
  | 'Passport'
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
