import { create } from 'zustand';
import { CustomerAddress, CustomerReference, Guarantor, IdProof } from './types';

interface CustomerWizardState {
  // Step 1: Basic
  fullName: string;
  nickname: string;
  phone: string;
  altPhone: string;
  email: string;
  occupation: string;
  monthlyIncome: number;
  photoUrl?: string;

  // Step 2: Address
  address: CustomerAddress;

  // Step 3: KYC proofs
  idProofs: IdProof[];

  // Step 4: References & Guarantor
  references: CustomerReference[];
  guarantor: Guarantor;

  // Step 5: Tags & Notes
  tags: string[];
  notes: string;

  currentStep: number;

  // Actions
  setField: <K extends keyof CustomerWizardState>(field: K, value: CustomerWizardState[K]) => void;
  addIdProof: (proof: IdProof) => void;
  removeIdProof: (id: string) => void;
  setStep: (step: number) => void;
  resetDraft: () => void;
}

const initialDraft = {
  fullName: '',
  nickname: '',
  phone: '',
  altPhone: '',
  email: '',
  occupation: '',
  monthlyIncome: 0,
  photoUrl: undefined,
  address: {
    line1: '',
    line2: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
  },
  idProofs: [
    {
      id: 'default-aadhaar',
      type: 'Aadhaar' as const,
      number: '',
      verified: false,
    },
  ],
  references: [],
  guarantor: {
    name: '',
    phone: '',
    address: '',
  },
  tags: [],
  notes: '',
  currentStep: 1,
};

export const useCustomerWizardDraft = create<CustomerWizardState>((set) => ({
  ...initialDraft,

  setField: (field, value) => set({ [field]: value } as any),

  addIdProof: (proof) =>
    set((state) => ({ idProofs: [...state.idProofs, proof] })),

  removeIdProof: (id) =>
    set((state) => ({
      idProofs: state.idProofs.filter((p) => p.id !== id),
    })),

  setStep: (step) => set({ currentStep: step }),

  resetDraft: () => set({ ...initialDraft }),
}));
