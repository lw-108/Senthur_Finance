import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/storage/secureStorage';
import { PaymentMode } from './types';

export interface PaymentDraftState {
  loanId: string;
  amountRupees: number;
  paymentMode: PaymentMode;
  paidOnDate: string;
  referenceNo: string;
  notes: string;
  hasDraftData: boolean;

  setField: <K extends keyof PaymentDraftState>(field: K, value: PaymentDraftState[K]) => void;
  setDraft: (partial: Partial<PaymentDraftState>) => void;
  resetDraft: () => void;
}

const initialPaymentDraft = {
  loanId: '',
  amountRupees: 0,
  paymentMode: 'CASH' as PaymentMode,
  paidOnDate: new Date().toISOString(),
  referenceNo: '',
  notes: '',
  hasDraftData: false,
};

export const usePaymentDraftStore = create<PaymentDraftState>()(
  persist(
    (set) => ({
      ...initialPaymentDraft,

      setField: (field, value) =>
        set((state) => ({
          ...state,
          [field]: value,
          hasDraftData: true,
        })),

      setDraft: (partial) =>
        set((state) => ({
          ...state,
          ...partial,
          hasDraftData: true,
        })),

      resetDraft: () =>
        set({
          ...initialPaymentDraft,
          paidOnDate: new Date().toISOString(),
        }),
    }),
    {
      name: 'loanledger_payment_draft',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
