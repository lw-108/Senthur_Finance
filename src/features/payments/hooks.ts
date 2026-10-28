import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { fetchPayments, recordPaymentTransaction } from './api';
import { RecordPaymentInput } from './types';
import { LOANS_QUERY_KEY, LOAN_SCHEDULE_QUERY_KEY } from '@/features/loans/hooks';
import { CUSTOMERS_QUERY_KEY } from '@/features/customers/hooks';

export const PAYMENTS_QUERY_KEY = 'payments';

export function usePayments(loanId?: string) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, adminUid, loanId],
    queryFn: () => fetchPayments(adminUid, loanId),
  });
}

export function useRecordPayment() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordPaymentInput) => recordPaymentTransaction(adminUid, input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOAN_SCHEDULE_QUERY_KEY, adminUid, vars.loanId] });
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}
