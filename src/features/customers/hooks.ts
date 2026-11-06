import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  softDeleteCustomer,
  bulkDeleteCustomers,
  batchMergePhoneContacts,
  mergeExistingCustomers,
} from './api';
import {
  Customer,
  CustomerFilterParams,
  ContactMergeStrategy,
  BatchMergeContactInput,
  MergeStrategyResult,
} from './types';
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

export function useBulkDeleteCustomers() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerIds: string[]) => bulkDeleteCustomers(adminUid, customerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useBatchMergeContacts() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contacts,
      strategy = 'MERGE_INTO_EXISTING',
    }: {
      contacts: BatchMergeContactInput[];
      strategy?: ContactMergeStrategy;
    }) => batchMergePhoneContacts(adminUid, contacts, strategy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useMergeExistingCustomers() {
  const adminUid = useAuthStore((s) => s.adminUid);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceCustomerId,
      targetCustomerId,
      strategy = 'MERGE_INTO_EXISTING',
    }: {
      sourceCustomerId: string;
      targetCustomerId: string;
      strategy?: ContactMergeStrategy;
    }) => mergeExistingCustomers(adminUid, sourceCustomerId, targetCustomerId, strategy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
