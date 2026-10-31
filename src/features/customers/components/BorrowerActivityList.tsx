import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/useThemeStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCustomerAuditLogs } from '@/features/audit/hooks';
import { Payment } from '@/features/payments/types';
import { Loan } from '@/features/loans/types';
import { formatIndianCurrency, formatDate } from '@/utils/formatters';

interface BorrowerActivityListProps {
  customerId: string;
  customerName: string;
  customerLoans: Loan[];
  allPayments: Payment[];
  onViewReceipt?: (payment: Payment, loan?: Loan) => void;
}

export function BorrowerActivityList({
  customerId,
  customerName,
  customerLoans,
  allPayments,
  onViewReceipt,
}: BorrowerActivityListProps) {
  const { colors, isDark } = useTheme();
  const loanIds = useMemo(() => customerLoans.map((l) => l.id), [customerLoans]);
  const { data: auditLogs, isLoading } = useCustomerAuditLogs(customerId, loanIds);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  // Pre-match payments to loan IDs for quick receipt opening
  const paymentByReceipt = useMemo(() => {
    const map = new Map<string, Payment>();
    allPayments.forEach((p) => {
      if (p.receiptNumber) map.set(p.receiptNumber, p);
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [allPayments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading activity history...
        </Text>
      </View>
    );
  }

  const sortedLogs = [...(auditLogs || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedLogs.length === 0) {
    return (
      <Card variant="surface" style={styles.emptyCard}>
        <EmptyState
          iconName="shield-checkmark-outline"
          title="No Activity Yet"
          description="When payments are collected or new loans are given, they will be listed here."
        />
      </Card>
    );
  }

  const paymentCount = sortedLogs.filter((l) => l.action === 'PAYMENT' || l.action === 'SETTLEMENT').length;

  return (
    <View style={styles.container}>
      {/* Activity Header Bar */}
      <View style={[styles.headerCard, { backgroundColor: colors.boxBackground, borderColor: colors.boxBorder }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.shieldIconWrap, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.ink }]}>Payment & Activity History</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {sortedLogs.length} actions recorded • {paymentCount} payments collected
            </Text>
          </View>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.primaryDark }]} />
          <Text style={[styles.liveBadgeText, { color: colors.primaryDark }]}>Verified Safe</Text>
        </View>
      </View>

      {/* Activity Timeline List */}
      {sortedLogs.map((log) => {
        const isExpanded = expandedLogId === log.id;
        const isPayment = log.action === 'PAYMENT' || log.action === 'SETTLEMENT';
        const isDisbursement = log.action === 'CREATE' && log.entityType === 'LOAN';
        const isCustomerCreate = log.action === 'CREATE' && log.entityType === 'CUSTOMER';

        const checklist = log.metadata?.checklist || {};
        const receiptNo = log.after?.receiptNumber || log.metadata?.receiptNumber;
        const matchingPayment = receiptNo ? paymentByReceipt.get(receiptNo) : paymentByReceipt.get(log.entityId);
        const matchingLoan = customerLoans.find(
          (l) => l.id === log.metadata?.loanId || l.id === log.entityId || l.loanNumber === log.before?.loanNumber
        );

        const dueReceivedPaise =
          log.after?.dueAmountReceivedPaise ||
          log.after?.amountPaise ||
          checklist.receivedAmountPaise ||
          matchingPayment?.amount ||
          0;

        const principalReducedPaise =
          log.after?.principalReducedPaise ||
          checklist.principalReducedPaise ||
          matchingPayment?.allocation?.principal ||
          0;

        const interestClearedPaise =
          log.after?.interestClearedPaise ||
          checklist.interestAllocatedPaise ||
          matchingPayment?.allocation?.interest ||
          0;

        const penaltyClearedPaise =
          log.after?.penaltyClearedPaise ||
          checklist.penaltyAllocatedPaise ||
          matchingPayment?.allocation?.penalty ||
          0;

        const prevBalancePaise =
          log.before?.outstandingPrincipalPaise ||
          checklist.previousBalancePaise ||
          (matchingLoan ? matchingLoan.outstandingPrincipal + principalReducedPaise : 0);

        const newBalancePaise =
          log.after?.newOutstandingPaise ||
          checklist.updatedRemainingBalancePaise ||
          (matchingLoan ? matchingLoan.outstandingPrincipal : 0);

        return (
          <Card
            key={log.id}
            variant="surface"
            style={[
              styles.activityCard,
              {
                borderColor: isPayment
                  ? isDark
                    ? '#166534'
                    : '#86EFAC'
                  : colors.border,
              },
            ]}
          >
            {/* Activity Card Header */}
            <View style={styles.cardTopRow}>
              <View style={styles.badgeGroup}>
                <Badge
                  status={isPayment ? 'ACTIVE' : isDisbursement ? 'PENDING' : 'DRAFT'}
                  label={
                    isPayment
                      ? log.action === 'SETTLEMENT'
                        ? 'FULL SETTLEMENT'
                        : 'DUE RECEIVED'
                      : isDisbursement
                      ? 'LOAN DISBURSED'
                      : isCustomerCreate
                      ? 'BORROWER REGISTERED'
                      : log.action
                  }
                />
                {receiptNo ? (
                  <View style={[styles.receiptPill, { backgroundColor: colors.surfaceMuted }]}>
                    <Ionicons name="receipt-outline" size={11} color={colors.textSecondary} />
                    <Text style={[styles.receiptPillText, { color: colors.textSecondary }]}>{receiptNo}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.timestampText, { color: colors.textSecondary }]}>
                {formatDate(log.timestamp, 'dd MMM yyyy, hh:mm a')}
              </Text>
            </View>

            {/* Summary Text */}
            <Text style={[styles.summaryText, { color: colors.ink }]}>{log.summary}</Text>

            {/* Admin's Due Amount Received Checklist Section */}
            {isPayment && (
              <View style={[styles.checklistCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={styles.checklistHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkbox" size={16} color="#16A34A" />
                    <Text style={[styles.checklistTitle, { color: colors.headingPrimary }]}>
                      PAYMENT DETAILS & VERIFICATION
                    </Text>
                  </View>
                  <Text style={[styles.reductionTag, { color: '#16A34A' }]}>
                    Loan Balance Reduced
                  </Text>
                </View>

                {/* Checklist Line Items */}
                <View style={styles.checklistItems}>
                  <View style={styles.checkItemRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                    <Text style={[styles.checkItemLabel, { color: colors.ink }]}>
                      Amount Paid:
                    </Text>
                    <Text style={[styles.checkItemAmount, { color: '#16A34A' }]}>
                      +{formatIndianCurrency(dueReceivedPaise, { isMinorUnit: true }).formatted} ({log.after?.paymentMode || 'CASH'})
                    </Text>
                  </View>

                  <View style={styles.checkItemRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                    <Text style={[styles.checkItemLabel, { color: colors.ink }]}>
                      Loan Balance Reduced By:
                    </Text>
                    <Text style={[styles.checkItemAmount, { color: colors.primaryDark }]}>
                      -{formatIndianCurrency(principalReducedPaise, { isMinorUnit: true }).formatted}
                    </Text>
                  </View>

                  <View style={styles.checkItemRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                    <Text style={[styles.checkItemLabel, { color: colors.ink }]}>
                      Interest Paid:
                    </Text>
                    <Text style={[styles.checkItemSubtext, { color: colors.textSecondary }]}>
                      +{formatIndianCurrency(interestClearedPaise, { isMinorUnit: true }).formatted}
                    </Text>
                  </View>

                  {penaltyClearedPaise > 0 && (
                    <View style={styles.checkItemRow}>
                      <Ionicons name="checkmark-circle" size={15} color="#DC2626" />
                      <Text style={[styles.checkItemLabel, { color: colors.ink }]}>
                        Fine / Late Fee Paid:
                      </Text>
                      <Text style={[styles.checkItemSubtext, { color: '#DC2626' }]}>
                        +{formatIndianCurrency(penaltyClearedPaise, { isMinorUnit: true }).formatted}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Balance Before -> After Accurate Reduction */}
                  <View style={styles.balanceDiffRow}>
                    <View style={styles.balanceCol}>
                      <Text style={[styles.balanceColLabel, { color: colors.textSecondary }]}>Old Balance</Text>
                      <Text style={[styles.balanceColValBefore, { color: colors.textSecondary }]}>
                        {formatIndianCurrency(prevBalancePaise, { isMinorUnit: true }).formatted}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.primaryDark} />
                    <View style={styles.balanceCol}>
                      <Text style={[styles.balanceColLabel, { color: colors.textSecondary }]}>New Balance</Text>
                      <Text style={[styles.balanceColValAfter, { color: colors.success }]}>
                        {formatIndianCurrency(newBalancePaise, { isMinorUnit: true }).formatted}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Receipt View Button */}
                {matchingPayment && onViewReceipt && (
                  <TouchableOpacity
                    style={[styles.receiptActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => onViewReceipt(matchingPayment, matchingLoan)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text-outline" size={15} color={colors.primaryDark} />
                    <Text style={[styles.receiptActionBtnText, { color: colors.primaryDark }]}>
                      View & Share Bill / Receipt ({receiptNo || 'Bill'})
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Audit Log Verification Toggle */}
            <TouchableOpacity
              style={styles.expandToggleRow}
              onPress={() => toggleExpand(log.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textSecondary}
              />
              <Text style={[styles.expandToggleText, { color: colors.textSecondary }]}>
                {isExpanded ? 'Hide Database Audit Stamp' : 'Verify Database Audit Stamp'}
              </Text>
            </TouchableOpacity>

            {/* Expanded Raw Audit Details */}
            {isExpanded && (
              <View style={[styles.auditStampBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={styles.stampRow}>
                  <Text style={[styles.stampLabel, { color: colors.textSecondary }]}>Event ID:</Text>
                  <Text style={[styles.stampValueMono, { color: colors.ink }]}>{log.id}</Text>
                </View>
                <View style={styles.stampRow}>
                  <Text style={[styles.stampLabel, { color: colors.textSecondary }]}>Actor User:</Text>
                  <Text style={[styles.stampValueMono, { color: colors.ink }]}>{log.who || 'admin'}</Text>
                </View>
                <View style={styles.stampRow}>
                  <Text style={[styles.stampLabel, { color: colors.textSecondary }]}>Target Entity:</Text>
                  <Text style={[styles.stampValueMono, { color: colors.ink }]}>
                    {log.entityType} ({log.entityId || 'N/A'})
                  </Text>
                </View>
                <View style={styles.stampRow}>
                  <Text style={[styles.stampLabel, { color: colors.textSecondary }]}>Table Record:</Text>
                  <Text style={[styles.stampValueMono, { color: colors.ink }]}>public.audit_events (Immutable)</Text>
                </View>
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 12,
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activityCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receiptPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timestampText: {
    fontSize: 11,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
  },
  checklistCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  checklistTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  reductionTag: {
    fontSize: 10,
    fontWeight: '700',
  },
  checklistItems: {
    gap: 7,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  checkItemAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkItemSubtext: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  balanceDiffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  balanceCol: {
    alignItems: 'center',
  },
  balanceColLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  balanceColValBefore: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  balanceColValAfter: {
    fontSize: 14,
    fontWeight: '800',
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  receiptActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginLeft: 6,
  },
  expandToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  auditStampBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  stampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stampLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  stampValueMono: {
    fontSize: 10,
    fontFamily: 'monospace',
    maxWidth: '70%',
  },
});
