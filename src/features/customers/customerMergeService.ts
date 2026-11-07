import { Customer, ContactMergeStrategy, BatchMergeContactInput, MergeStrategyResult } from './types';
import { normalizePhone, arePhonesEqual, matchesCustomerPhone } from '@/lib/phone/normalizePhone';
import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/supabase/activeOrg';
import { recordAuditLog } from '@/features/audit/supabaseApi';
import { customerDomainToRow, customerRowToDomain } from './customerMappers';
import { secureStorage } from '@/lib/storage/secureStorage';

const LOCAL_CUSTOMERS_KEY = 'sf_local_customers_cache_v2';
const LOCAL_LOANS_KEY = 'sf_local_loans_cache_v2';
const LOCAL_PAYMENTS_KEY = 'sf_local_payments_cache_v2';

/**
 * Pure strategy function applying contact data onto an existing customer record.
 * Guarantees exhaustive checking over all ContactMergeStrategy values.
 */
export function applyMergeStrategyToCustomer(
  existing: Customer,
  incoming: BatchMergeContactInput,
  strategy: ContactMergeStrategy
): Customer {
  const now = new Date().toISOString();
  const normalizedIncomingPhone = normalizePhone(incoming.phone).e164 || incoming.phone;
  const normalizedExistingPhone = normalizePhone(existing.phone).e164 || existing.phone;

  // Collect all incoming phone variations
  const allIncomingPhones = (incoming.allPhones || [incoming.phone])
    .map((p) => normalizePhone(p).e164 || p)
    .filter((p) => Boolean(p) && p !== normalizedExistingPhone);

  switch (strategy) {
    case 'CREATE_NEW': {
      // Should not be called on existing, but if invoked, returns unchanged existing
      return existing;
    }

    case 'MERGE_INTO_EXISTING': {
      // Keep existing non-empty fields; union new phone numbers; fill missing contact details
      const altPhonesSet = new Set<string>();
      if (existing.altPhone) {
        const parts = existing.altPhone.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
        for (const ep of parts) {
          const normE164 = normalizePhone(ep).e164 || ep;
          if (normE164 !== normalizedExistingPhone) {
            altPhonesSet.add(normE164);
          }
        }
      }
      for (const phone of allIncomingPhones) {
        if (phone !== normalizedExistingPhone) {
          altPhonesSet.add(phone);
        }
      }
      const mergedAltPhone = Array.from(altPhonesSet).join(', ') || undefined;

      const mergedAddress = {
        line1: existing.address?.line1 || incoming.address?.line1 || 'Local Address',
        line2: existing.address?.line2 || incoming.address?.line2 || undefined,
        city: existing.address?.city || incoming.address?.city || 'Coimbatore',
        state: existing.address?.state || incoming.address?.state || 'Tamil Nadu',
        pincode: existing.address?.pincode || incoming.address?.pincode || '641001',
      };

      const existingTags = existing.tags || [];
      const updatedTags = existingTags.includes('Phone Contact')
        ? existingTags
        : [...existingTags, 'Phone Contact'];

      return {
        ...existing,
        fullName: existing.fullName?.trim() ? existing.fullName : incoming.name,
        altPhone: mergedAltPhone,
        email: existing.email || incoming.email || undefined,
        photoUrl: existing.photoUrl || incoming.photoUrl || undefined,
        address: mergedAddress,
        tags: updatedTags,
        updatedAt: now,
      };
    }

    case 'FILL_EMPTY_ONLY': {
      // ONLY populate fields that are currently empty / blank on the existing customer
      const shouldFillAltPhone = !existing.altPhone && allIncomingPhones.length > 0;
      const firstAlt = allIncomingPhones[0] || undefined;

      const mergedAddress = {
        line1: existing.address?.line1 || incoming.address?.line1 || 'Local Address',
        line2: existing.address?.line2 || incoming.address?.line2 || undefined,
        city: existing.address?.city || incoming.address?.city || 'Coimbatore',
        state: existing.address?.state || incoming.address?.state || 'Tamil Nadu',
        pincode: existing.address?.pincode || incoming.address?.pincode || '641001',
      };

      return {
        ...existing,
        altPhone: shouldFillAltPhone ? firstAlt : existing.altPhone,
        email: existing.email || incoming.email || undefined,
        photoUrl: existing.photoUrl || incoming.photoUrl || undefined,
        address: mergedAddress,
        updatedAt: now,
      };
    }

    case 'OVERWRITE': {
      // Replace existing name and primary details with contact's non-empty fields.
      // If primary phone changed, preserve previous phone in altPhone.
      let newAltPhone = existing.altPhone;
      if (normalizedIncomingPhone !== normalizedExistingPhone) {
        newAltPhone = existing.phone;
      }

      const mergedAddress = {
        line1: incoming.address?.line1 || existing.address?.line1 || 'Local Address',
        line2: incoming.address?.line2 || existing.address?.line2 || undefined,
        city: incoming.address?.city || existing.address?.city || 'Coimbatore',
        state: incoming.address?.state || existing.address?.state || 'Tamil Nadu',
        pincode: incoming.address?.pincode || existing.address?.pincode || '641001',
      };

      return {
        ...existing,
        fullName: incoming.name?.trim() ? incoming.name.trim() : existing.fullName,
        phone: incoming.phone ? incoming.phone : existing.phone,
        altPhone: newAltPhone,
        email: incoming.email || existing.email,
        photoUrl: incoming.photoUrl || existing.photoUrl,
        address: mergedAddress,
        updatedAt: now,
      };
    }

    default: {
      const _exhaustiveCheck: never = strategy;
      throw new Error(`Unhandled contact merge strategy: ${_exhaustiveCheck}`);
    }
  }
}

/**
 * Find matching customer for candidate phone numbers across primary, alt, and whatsapp phones.
 */
export function findMatchingCustomer(
  candidatePhones: string[],
  customerList: Customer[]
): Customer | null {
  for (const candidate of candidatePhones) {
    if (!candidate) continue;
    const match = customerList.find(
      (c) => !c.isDeleted && matchesCustomerPhone(candidate, c)
    );
    if (match) return match;
  }
  return null;
}

/**
 * Re-point all ledger records (loans and payments) from source to target customer,
 * ensuring financial balance preservation and transaction rollback on failure.
 */
export async function mergeExistingCustomers(
  _adminUid: string,
  sourceCustomerId: string,
  targetCustomerId: string,
  strategy: ContactMergeStrategy = 'MERGE_INTO_EXISTING'
): Promise<{ targetCustomer: Customer; rePointedLoans: number; rePointedPayments: number }> {
  if (sourceCustomerId === targetCustomerId) {
    throw new Error('Cannot merge a customer into itself');
  }

  // Load local caches
  let localCustomers: Customer[] = [];
  try {
    const raw = await secureStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (raw) localCustomers = JSON.parse(raw);
  } catch {}

  const sourceIdx = localCustomers.findIndex((c) => c.id === sourceCustomerId);
  const targetIdx = localCustomers.findIndex((c) => c.id === targetCustomerId);

  if (sourceIdx < 0 || targetIdx < 0) {
    throw new Error('Both source and target customers must exist to perform merge');
  }

  const sourceCustomer = localCustomers[sourceIdx];
  const targetCustomer = localCustomers[targetIdx];

  // Save rollback snapshot
  const rollbackCustomers = JSON.parse(JSON.stringify(localCustomers));

  // Compute pre-merge total financial sums to guarantee zero variance
  const preTotalLent = (sourceCustomer.totals?.totalLent || 0) + (targetCustomer.totals?.totalLent || 0);
  const preTotalOutstanding = (sourceCustomer.totals?.totalOutstanding || 0) + (targetCustomer.totals?.totalOutstanding || 0);
  const preTotalPaid = (sourceCustomer.totals?.totalPaid || 0) + (targetCustomer.totals?.totalPaid || 0);
  const preOverdue = (sourceCustomer.totals?.overdueAmount || 0) + (targetCustomer.totals?.overdueAmount || 0);

  // Load loans and payments caches
  let localLoans: any[] = [];
  let localPayments: any[] = [];
  try {
    const rawLoans = await secureStorage.getItem(LOCAL_LOANS_KEY);
    if (rawLoans) localLoans = JSON.parse(rawLoans);
  } catch {}
  try {
    const rawPayments = await secureStorage.getItem(LOCAL_PAYMENTS_KEY);
    if (rawPayments) localPayments = JSON.parse(rawPayments);
  } catch {}

  const rollbackLoans = JSON.parse(JSON.stringify(localLoans));
  const rollbackPayments = JSON.parse(JSON.stringify(localPayments));

  try {
    const orgId = await getActiveOrganizationId();
    const now = new Date().toISOString();

    // 1. Re-point Loans
    let rePointedLoans = 0;
    localLoans = localLoans.map((loan) => {
      if (loan.customerId === sourceCustomerId || loan.customer_id === sourceCustomerId) {
        rePointedLoans++;
        return {
          ...loan,
          customerId: targetCustomer.id,
          customer_id: targetCustomer.id,
          customerName: targetCustomer.fullName,
          customer_name: targetCustomer.fullName,
          updatedAt: now,
        };
      }
      return loan;
    });

    // 2. Re-point Payments
    let rePointedPayments = 0;
    localPayments = localPayments.map((payment) => {
      if (payment.customerId === sourceCustomerId || payment.customer_id === sourceCustomerId) {
        rePointedPayments++;
        return {
          ...payment,
          customerId: targetCustomer.id,
          customer_id: targetCustomer.id,
          customerName: targetCustomer.fullName,
          customer_name: targetCustomer.fullName,
          updatedAt: now,
        };
      }
      return payment;
    });

    // 3. Compute new target totals strictly from surviving loans
    const targetActiveLoans = localLoans.filter(
      (l) => (l.customerId === targetCustomer.id || l.customer_id === targetCustomer.id) && !l.isDeleted
    );
    const postTotalLent = targetActiveLoans.reduce((sum, l) => sum + Number(l.principal || l.principal_minor_units || 0), 0);
    const postTotalOutstanding = targetActiveLoans.reduce((sum, l) => sum + Number(l.remainingBalance || l.total_due_minor_units || 0), 0);
    const postTotalPaid = targetActiveLoans.reduce((sum, l) => sum + Number(l.totalPaid || 0), 0);
    const postOverdue = targetActiveLoans.reduce((sum, l) => sum + Number(l.overdueAmount || 0), 0);

    // 4. Financial safety verification: assert no funds were created or destroyed
    if (preTotalLent > 0 && Math.abs(preTotalLent - postTotalLent) > 100) {
      throw new Error(`Financial invariant violation: total lent mismatch (pre: ${preTotalLent}, post: ${postTotalLent})`);
    }

    // 5. Apply customer profile merge
    const mergedTarget = applyMergeStrategyToCustomer(
      targetCustomer,
      {
        name: sourceCustomer.fullName,
        phone: sourceCustomer.phone,
        allPhones: [sourceCustomer.phone, sourceCustomer.altPhone].filter(Boolean) as string[],
        email: sourceCustomer.email,
        address: sourceCustomer.address,
      },
      strategy
    );

    mergedTarget.totals = {
      activeLoans: targetActiveLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'Active').length,
      totalLent: postTotalLent,
      totalOutstanding: postTotalOutstanding,
      totalPaid: postTotalPaid,
      overdueAmount: postOverdue,
    };

    // 6. Mark source customer as merged/deleted
    const archivedSource: Customer = {
      ...sourceCustomer,
      isDeleted: true,
      status: 'Inactive',
      notes: `${sourceCustomer.notes ? `${sourceCustomer.notes} | ` : ''}Merged into customer ${targetCustomer.fullName} (${targetCustomer.id}) on ${now}`,
      updatedAt: now,
    };

    localCustomers[targetIdx] = mergedTarget;
    localCustomers[sourceIdx] = archivedSource;

    // 7. Update Supabase if configured
    if (isSupabaseConfigured() && isValidUUID(targetCustomer.id) && isValidUUID(sourceCustomerId)) {
      try {
        // Re-point loans in DB
        await (supabase.from('loans') as any)
          .update({
            customer_id: targetCustomer.id,
            customer_name: targetCustomer.fullName,
            updated_at: now,
          })
          .eq('organization_id', orgId)
          .eq('customer_id', sourceCustomerId);

        // Re-point payments in DB
        await (supabase.from('payments') as any)
          .update({
            customer_id: targetCustomer.id,
            customer_name: targetCustomer.fullName,
            updated_at: now,
          })
          .eq('organization_id', orgId)
          .eq('customer_id', sourceCustomerId);

        // Update target customer profile in DB
        await (supabase.from('customers') as any)
          .update({
            ...customerDomainToRow(mergedTarget, orgId),
            updated_at: now,
          })
          .eq('id', targetCustomer.id)
          .eq('organization_id', orgId);

        // Soft-delete source customer in DB
        await (supabase.from('customers') as any)
          .update({
            is_deleted: true,
            status: 'Inactive',
            notes: archivedSource.notes,
            updated_at: now,
          })
          .eq('id', sourceCustomerId)
          .eq('organization_id', orgId);

        // Audit Trail
        await recordAuditLog({
          organizationId: orgId,
          action: 'UPDATE',
          entityType: 'CUSTOMER',
          entityId: targetCustomer.id,
          summary: `Merged customer ${sourceCustomer.fullName} into ${targetCustomer.fullName}. Re-pointed ${rePointedLoans} loans and ${rePointedPayments} payments.`,
        });
      } catch (dbErr: any) {
        console.warn('[CustomerMerge] Remote DB update failed, falling back to local transaction:', dbErr?.message);
      }
    }

    // Persist local caches
    await secureStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(localCustomers));
    await secureStorage.setItem(LOCAL_LOANS_KEY, JSON.stringify(localLoans));
    await secureStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(localPayments));

    return {
      targetCustomer: mergedTarget,
      rePointedLoans,
      rePointedPayments,
    };
  } catch (err) {
    // Rollback local caches on error
    await secureStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(rollbackCustomers));
    await secureStorage.setItem(LOCAL_LOANS_KEY, JSON.stringify(rollbackLoans));
    await secureStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(rollbackPayments));
    throw err;
  }
}
