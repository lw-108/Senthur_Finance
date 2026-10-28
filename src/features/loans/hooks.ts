import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchLoans,
  fetchLoanById,
  fetchLoanSchedule,
  createLoanWithSchedule,
  updateLoan,
} from './api';
import { Loan, LoanFilterParams } from './types';
import { ScheduleInstallment } from '@/lib/finance/types';

export const LOANS_QUERY_KEY = 'loans';
export const LOAN_SCHEDULE_QUERY_KEY = 'loan_schedule';

export function useLoans(params?: LoanFilterParams) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [LOANS_QUERY_KEY, adminUid, params],
    queryFn: () => fetchLoans(adminUid, params),
  });
}

export function useLoan(loanId: string | undefined) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [LOANS_QUERY_KEY, adminUid, loanId],
    queryFn: () => (loanId ? fetchLoanById(adminUid, loanId) : null),
    enabled: Boolean(loanId),
  });
}

export function useLoanSchedule(loanId: string | undefined) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [LOAN_SCHEDULE_QUERY_KEY, adminUid, loanId],
    queryFn: () => (loanId ? fetchLoanSchedule(adminUid, loanId) : []),
    enabled: Boolean(loanId),
  });
}

export function useCreateLoan() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      schedule,
    }: {
      data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>;
      schedule: ScheduleInstallment[];
    }) => createLoanWithSchedule(adminUid, data, schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
    },
  });
}

export function useUpdateLoan() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, updates }: { loanId: string; updates: Partial<Loan> }) =>
      updateLoan(adminUid, loanId, updates),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOANS_QUERY_KEY, adminUid, vars.loanId] });
    },
  });
}
