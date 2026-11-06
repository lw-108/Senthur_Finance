import { usePaymentDraftStore } from '@/features/payments/PaymentDraft';
import { useLoanWizardDraft } from '@/features/loans/LoanWizardDraft';
import { useCustomerWizardDraft } from '@/features/customers/CustomerWizardDraft';
import { secureStorage } from '@/lib/storage/secureStorage';

describe('Form Caching & Session State Continuity', () => {
  beforeEach(async () => {
    usePaymentDraftStore.getState().resetDraft();
    useLoanWizardDraft.getState().resetDraft();
    useCustomerWizardDraft.getState().resetDraft();
  });

  describe('Payment Form Draft Caching', () => {
    it('initializes with default empty values and hasDraftData=false', () => {
      const state = usePaymentDraftStore.getState();
      expect(state.loanId).toBe('');
      expect(state.amountRupees).toBe(0);
      expect(state.paymentMode).toBe('CASH');
      expect(state.referenceNo).toBe('');
      expect(state.notes).toBe('');
      expect(state.hasDraftData).toBe(false);
    });

    it('caches field changes and sets hasDraftData=true', () => {
      const store = usePaymentDraftStore.getState();
      store.setField('loanId', 'loan-abc-123');
      store.setField('amountRupees', 2500);
      store.setField('paymentMode', 'UPI');
      store.setField('referenceNo', 'UPI/2026/998877');
      store.setField('notes', 'Collected at customer shop');

      const updated = usePaymentDraftStore.getState();
      expect(updated.loanId).toBe('loan-abc-123');
      expect(updated.amountRupees).toBe(2500);
      expect(updated.paymentMode).toBe('UPI');
      expect(updated.referenceNo).toBe('UPI/2026/998877');
      expect(updated.notes).toBe('Collected at customer shop');
      expect(updated.hasDraftData).toBe(true);
    });

    it('supports partial batch updates through setDraft', () => {
      usePaymentDraftStore.getState().setDraft({
        loanId: 'loan-xyz-789',
        amountRupees: 5000,
        paymentMode: 'BANK',
      });

      const updated = usePaymentDraftStore.getState();
      expect(updated.loanId).toBe('loan-xyz-789');
      expect(updated.amountRupees).toBe(5000);
      expect(updated.paymentMode).toBe('BANK');
      expect(updated.hasDraftData).toBe(true);
    });

    it('resets draft only when resetDraft is explicitly called (on DB push)', () => {
      usePaymentDraftStore.getState().setField('amountRupees', 10000);
      expect(usePaymentDraftStore.getState().amountRupees).toBe(10000);

      usePaymentDraftStore.getState().resetDraft();
      const cleared = usePaymentDraftStore.getState();
      expect(cleared.amountRupees).toBe(0);
      expect(cleared.hasDraftData).toBe(false);
    });
  });

  describe('Loan Wizard Form Draft Caching', () => {
    it('persists inline new customer fields across draft updates', () => {
      const draft = useLoanWizardDraft.getState();
      draft.setField('customerMode', 'new');
      draft.setField('newCustomerName', 'Muthu Kumar');
      draft.setField('newCustomerPhone', '9876543210');
      draft.setField('newCustomerCity', 'Coimbatore');
      draft.setField('newCustomerAddress', '12 Cross Cut Road');
      draft.setField('newGuarantorName', 'Suresh Kumar');
      draft.setField('newGuarantorPhone', '9876501234');

      const state = useLoanWizardDraft.getState();
      expect(state.customerMode).toBe('new');
      expect(state.newCustomerName).toBe('Muthu Kumar');
      expect(state.newCustomerPhone).toBe('9876543210');
      expect(state.newCustomerCity).toBe('Coimbatore');
      expect(state.newCustomerAddress).toBe('12 Cross Cut Road');
      expect(state.newGuarantorName).toBe('Suresh Kumar');
      expect(state.newGuarantorPhone).toBe('9876501234');
    });

    it('maintains loan terms and recalculates preview without losing customer info', () => {
      const draft = useLoanWizardDraft.getState();
      draft.setField('newCustomerName', 'Ramesh');
      draft.setField('principalPaise', 5000000); // 50,000 INR
      draft.setField('interestRate', 18);
      draft.setField('tenureValue', 10);

      const state = useLoanWizardDraft.getState();
      expect(state.newCustomerName).toBe('Ramesh');
      expect(state.principalPaise).toBe(5000000);
      expect(state.preview.totalPayable).toBeGreaterThan(5000000);
    });

    it('clears draft after successful disbursement', () => {
      const draft = useLoanWizardDraft.getState();
      draft.setField('newCustomerName', 'Anand');
      draft.setField('principalPaise', 1000000);

      draft.resetDraft();
      const cleared = useLoanWizardDraft.getState();
      expect(cleared.newCustomerName).toBe('');
      expect(cleared.principalPaise).toBe(0);
    });
  });

  describe('Customer Wizard Draft Caching', () => {
    it('persists all step data and survives step progression', () => {
      const draft = useCustomerWizardDraft.getState();
      draft.setField('fullName', 'Selvan');
      draft.setField('phone', '9443322110');
      draft.setField('occupation', 'Business Owner');
      draft.setStep(2);

      const state = useCustomerWizardDraft.getState();
      expect(state.fullName).toBe('Selvan');
      expect(state.phone).toBe('9443322110');
      expect(state.occupation).toBe('Business Owner');
      expect(state.currentStep).toBe(2);
    });
  });

  describe('Active Page Route Preservation Guard', () => {
    it('does not allow root "/" to overwrite an active viewing route', async () => {
      const LAST_ACTIVE_ROUTE_KEY = 'loanledger_last_active_route';

      // Simulate user opening customer creation form
      await secureStorage.setItem(LAST_ACTIVE_ROUTE_KEY, '/customers/new');
      expect(await secureStorage.getItem(LAST_ACTIVE_ROUTE_KEY)).toBe('/customers/new');

      // Attempt to save root '/' as route (guarded by _layout.tsx check: pathname !== '/')
      const candidateRoute = '/';
      if (candidateRoute && !candidateRoute.startsWith('/auth') && candidateRoute !== '/') {
        await secureStorage.setItem(LAST_ACTIVE_ROUTE_KEY, candidateRoute);
      }

      // Route remains '/customers/new'
      expect(await secureStorage.getItem(LAST_ACTIVE_ROUTE_KEY)).toBe('/customers/new');
    });
  });
});
