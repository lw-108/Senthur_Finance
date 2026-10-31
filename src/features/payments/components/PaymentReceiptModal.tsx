import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/useThemeStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
import { Payment } from '../types';
import { Loan } from '@/features/loans/types';
import { formatIndianCurrency, formatDate } from '@/utils/formatters';
import { openWhatsApp } from '@/utils/whatsapp';
import {
  sharePaymentReceipt,
  printPaymentReceipt,
  getReceiptWhatsAppText,
} from '../receiptGenerator';

interface PaymentReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  payment: Payment | null;
  loan?: Loan | null;
  customerPhone?: string;
  onDone?: () => void;
}

export function PaymentReceiptModal({
  visible,
  onClose,
  payment,
  loan,
  customerPhone,
  onDone,
}: PaymentReceiptModalProps) {
  const { colors, isDark } = useTheme();
  const { business } = useBusinessSettingsStore();
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);

  if (!payment) return null;

  // Fallback synthetic loan object if loan wasn't fully passed
  const effectiveLoan: Loan = loan || {
    id: payment.loanId,
    customerId: payment.customerId,
    customerName: payment.customerName,
    loanNumber: payment.loanNumber,
    title: 'Loan Account',
    category: 'PERSONAL',
    principal: payment.amount,
    currency: 'INR',
    interestType: 'FLAT',
    interestRate: 0,
    ratePeriod: 'PER_MONTH',
    compounding: 'NONE',
    repaymentFrequency: 'MONTHLY',
    disbursedOn: payment.paidOn,
    firstDueDate: payment.paidOn,
    tenure: { value: 1, unit: 'MONTHS' },
    maturityDate: payment.paidOn,
    installmentAmount: payment.amount,
    numberOfInstallments: 1,
    upfrontDeduction: 0,
    advanceInterestDeducted: false,
    penalty: { type: 'ONE_TIME', value: 0, graceDays: 0 },
    collateral: { type: 'None' },
    proofs: [],
    witnesses: [],
    status: 'ACTIVE',
    outstandingPrincipal: Math.max(0, payment.amount - payment.allocation.principal),
    accruedInterest: 0,
    totalPayable: payment.amount,
    totalPaid: payment.amount,
    daysOverdue: 0,
    penaltyAccrued: payment.allocation.penalty || 0,
    progressPercent: 100,
    tags: [],
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    createdBy: payment.createdBy,
    isDeleted: false,
  };

  const receiptData = {
    payment,
    loan: effectiveLoan,
    businessName: business.businessName || 'SENTHUR FINANCE',
    businessAddress: business.address || 'Gandhipuram, Coimbatore',
    businessPhone: business.phone || '+91 98765 00000',
  };

  const handleSharePdf = async () => {
    try {
      setSharing(true);
      await sharePaymentReceipt(receiptData);
    } catch (e) {
      console.warn('Failed to share PDF receipt:', e);
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      await printPaymentReceipt(receiptData);
    } catch (e) {
      console.warn('Failed to print receipt:', e);
    } finally {
      setPrinting(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = customerPhone || '';
    const text = getReceiptWhatsAppText(receiptData);
    openWhatsApp(phone, text);
  };

  const amountFormatted = formatIndianCurrency(payment.amount, { isMinorUnit: true }).formatted;
  const principalAllocated = formatIndianCurrency(payment.allocation.principal, { isMinorUnit: true }).formatted;
  const interestAllocated = formatIndianCurrency(payment.allocation.interest, { isMinorUnit: true }).formatted;
  const penaltyAllocated = formatIndianCurrency(payment.allocation.penalty, { isMinorUnit: true }).formatted;
  const balanceAfter = formatIndianCurrency(
    Math.max(0, effectiveLoan.outstandingPrincipal - payment.allocation.principal),
    { isMinorUnit: true }
  ).formatted;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.successIconBubble, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.ink }]}>Repayment Receipt</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {payment.receiptNumber} • {formatDate(payment.paidOn, 'dd MMM yyyy')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceMuted }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Amount & Mode Highlight Banner */}
            <View style={[styles.amountBanner, { backgroundColor: colors.boxBackground, borderColor: colors.boxBorder }]}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount Received</Text>
              <Text style={[styles.amountNumber, { color: colors.success }]}>{amountFormatted}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.modeBadge, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="wallet-outline" size={12} color={colors.primaryDark} />
                  <Text style={[styles.modeBadgeText, { color: colors.primaryDark }]}>{payment.mode}</Text>
                </View>
                {payment.referenceNo ? (
                  <View style={[styles.modeBadge, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[styles.modeBadgeText, { color: colors.textSecondary }]}>
                      Ref: {payment.referenceNo}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Borrower & Loan Details Box */}
            <View style={[styles.infoCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Borrower</Text>
                <Text style={[styles.infoValue, { color: colors.ink }]}>{payment.customerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Loan Account</Text>
                <Text style={[styles.infoValue, { color: colors.ink }]}>
                  {payment.loanNumber} ({effectiveLoan.title || effectiveLoan.category})
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Payment Time</Text>
                <Text style={[styles.infoValue, { color: colors.ink }]}>
                  {formatDate(payment.paidOn, 'dd MMM yyyy, hh:mm a')}
                </Text>
              </View>
            </View>

            {/* Allocation Breakdown */}
            <View style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.breakdownHeading, { color: colors.headingPrimary }]}>
                PAYMENT DETAILS
              </Text>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Loan Balance Reduced</Text>
                <Text style={[styles.breakdownVal, { color: colors.success }]}>+{principalAllocated}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Interest Paid</Text>
                <Text style={[styles.breakdownVal, { color: colors.ink }]}>+{interestAllocated}</Text>
              </View>
              {payment.allocation.penalty > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Fine / Late Fee Paid</Text>
                  <Text style={[styles.breakdownVal, { color: colors.danger }]}>+{penaltyAllocated}</Text>
                </View>
              )}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabelBold, { color: colors.ink }]}>Balance to Pay</Text>
                <Text style={[styles.breakdownRemaining, { color: colors.primaryDark }]}>{balanceAfter}</Text>
              </View>
            </View>

            {payment.notes ? (
              <View style={[styles.notesBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{payment.notes}</Text>
              </View>
            ) : null}

            {/* Quick Action Buttons for Admin */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: '#25D366' }]}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.actionGridBtnTextLight}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.primary }]}
                onPress={handleSharePdf}
                disabled={sharing}
                activeOpacity={0.8}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionGridBtnTextLight}>Share PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionGridBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handlePrint}
                disabled={printing}
                activeOpacity={0.8}
              >
                {printing ? (
                  <ActivityIndicator size="small" color={colors.ink} />
                ) : (
                  <>
                    <Ionicons name="print-outline" size={18} color={colors.ink} />
                    <Text style={[styles.actionGridBtnTextDark, { color: colors.ink }]}>Print</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Complete / Done Button */}
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.ink }]}
              onPress={() => {
                onClose();
                if (onDone) onDone();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    marginTop: 12,
  },
  amountBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  amountNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  breakdownCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  breakdownHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  breakdownLabelBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownRemaining: {
    fontSize: 15,
    fontWeight: '800',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionGridBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionGridBtnTextLight: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionGridBtnTextDark: {
    fontSize: 13,
    fontWeight: '700',
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
