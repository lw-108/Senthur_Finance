import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  softDeleteCustomer,
  checkDuplicatePhone,
  seedDemoCustomers,
} from './api';
import { Customer, CustomerFilterParams } from './types';
import { AUDIT_LOGS_QUERY_KEY } from '@/features/audit/hooks';

export const CUSTOMERS_QUERY_KEY = 'customers';

export function useCustomers(params?: CustomerFilterParams) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, adminUid, params],
    queryFn: () => fetchCustomers(adminUid, params),
  });
}

export function useCustomer(customerId: string | undefined) {
  const adminUid = useAuthStore((s) => s.adminUid);

  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, adminUid, customerId],
    queryFn: () => (customerId ? fetchCustomerById(adminUid, customerId) : null),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomer() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isDeleted'>) =>
      createCustomer(adminUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
    },
  });
}

export function useUpdateCustomer() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, updates }: { customerId: string; updates: Partial<Customer> }) =>
      updateCustomer(adminUid, customerId, updates),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY, adminUid, vars.customerId] });
      queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
    },
  });
}

export function useDeleteCustomer() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => softDeleteCustomer(adminUid, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}

export function useSeedCustomers() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      seedDemoCustomers(adminUid);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}
