import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Header,
  DisplayTitle,
  Tile,
  Card,
  PillButton,
  SegmentedControl,
  ListRow,
  Badge,
  Avatar,
  EmptyState,
  SkeletonLoader,
  ConfirmDialog,
  Input,
  SelectModal,
  useToast,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useCustomer, useDeleteCustomer, useUpdateCustomer } from '@/features/customers/hooks';
import { useLoans } from '@/features/loans/hooks';
import { usePayments } from '@/features/payments/hooks';
import { formatIndianCurrency, maskIdentifier, formatDate } from '@/utils/formatters';
import { openWhatsApp } from '@/utils/whatsapp';
import { useAuthStore } from '@/store/useAuthStore';
import { useLoanProductsStore } from '@/store/useLoanProductsStore';
import { exportCustomerStatementPdf, shareFile } from '@/features/reports/exportEngine';

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { colors: dynamicColors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showError } = useToast();

  const { data: customer, isLoading, refetch } = useCustomer(id);
  const { data: customerLoans } = useLoans({ customerId: id });
  const { data: allPayments } = usePayments();
  const customerPayments = (allPayments || []).filter((p) => p.customerId === id);

  const deleteMutation = useDeleteCustomer();
  const updateMutation = useUpdateCustomer();
  const verifyBiometric = useAuthStore((s) => s.verifyBiometricsForSensitiveAction);
  const { products: loanProducts, initialize: initializeProducts } = useLoanProductsStore();

  const [activeTab, setActiveTab] = useState<'loans' | 'payments' | 'docs' | 'guarantor'>('loans');
  const [unmaskedId, setUnmaskedId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editScheme, setEditScheme] = useState('');

  useEffect(() => {
    initializeProducts();
  }, [initializeProducts]);

  useEffect(() => {
    if (customer) {
      setEditName(customer.fullName);
      setEditPhone(customer.phone);
      setEditOccupation(customer.occupation || '');
      setEditCity(customer.address.city || '');
      setEditScheme(customer.tags?.[0] || 'Gold Loan (Jewel Loan)');
    }
  }, [customer]);

  const loanSchemeOptions = loanProducts.map((p) => ({
    label: p.name,
    value: p.name,
    subtitle: `${p.category} • ${p.interestType.replace(/_/g, ' ')}`,
  }));

  const handleSaveEdit = async () => {
    if (!customer) return;
    if (!editName.trim()) {
      showError('Please enter borrower name');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        customerId: customer.id,
        updates: {
          fullName: editName.trim(),
          phone: editPhone.trim(),
          occupation: editOccupation.trim(),
          address: {
            ...customer.address,
            city: editCity.trim(),
          },
          tags: [editScheme],
        },
      });
      setEditModalOpen(false);
      showSuccess('Borrower details updated');
      refetch();
    } catch {
      showError('Failed to update borrower');
    }
  };

  const handleExportStatementPdf = async () => {
    if (!customer) return;
    try {
      const uri = await exportCustomerStatementPdf(
        customer,
        customerLoans || [],
        customerPayments || []
      );
      await shareFile(uri, `${customer.fullName} Account Statement`);
      showSuccess('Statement PDF generated');
    } catch {
      showError('Failed to generate PDF statement');
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Header showBack title="Borrower" />
        <SkeletonLoader height={120} style={{ borderRadius: 20, marginVertical: 12 }} />
        <SkeletonLoader height={70} style={{ borderRadius: 20, marginBottom: 12 }} />
      </Screen>
    );
  }

  if (!customer) {
    return (
      <Screen>
        <Header showBack title="Not Found" />
        <EmptyState
          iconName="alert-circle-outline"
          title="Customer Not Found"
          description="The requested borrower record does not exist or has been removed."
          actionTitle="Back to Borrowers"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const handleRevealId = async (proofId: string, fullNumber: string) => {
    if (unmaskedId === proofId) {
      setUnmaskedId(null);
      return;
    }
    const success = await verifyBiometric();
    if (success) {
      setUnmaskedId(proofId);
    } else {
      showError('Biometric verification failed');
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${customer.phone}`);
  };

  const handleWhatsApp = () => {
    openWhatsApp(customer.phone, `Hello ${customer.fullName}, greetings from Senthur Finance.`);
  };

  const handleSms = () => {
    Linking.openURL(`sms:${customer.phone}`);
  };

  const handleArchive = async () => {
    try {
      await deleteMutation.mutateAsync(customer.id);
      showSuccess(`${customer.fullName} archived.`);
      router.back();
    } catch {
      showError('Failed to archive customer');
    }
  };

  const handleToggleBlacklist = async () => {
    const nextStatus = customer.status === 'Blacklisted' ? 'Active' : 'Blacklisted';
    await updateMutation.mutateAsync({
      customerId: customer.id,
      updates: { status: nextStatus },
    });
    showSuccess(`Customer marked as ${nextStatus}`);
  };

  const totals = customer.totals || {
    totalLent: 0,
    totalOutstanding: 0,
    totalPaid: 0,
    overdueAmount: 0,
    activeLoans: 0,
  };

  return (
    <Screen scrollable>
      <Header
        showBack
        title="Borrower Profile"
        showSupportPill={false}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              onPress={handleExportStatementPdf}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="document-text-outline" size={22} color={dynamicColors.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditModalOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={22} color={dynamicColors.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeleteConfirmOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={22} color={dynamicColors.danger} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Customer Hero Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar
          uri={customer.photoUrl}
          name={customer.fullName}
          size={68}
          backgroundColor={dynamicColors.primaryLight}
          textColor={dynamicColors.primaryDark}
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.customerName, { color: dynamicColors.ink }]}>{customer.fullName}</Text>
          <Text style={[styles.customerPhone, { color: dynamicColors.textSecondary }]}>+91 {customer.phone}</Text>
          <Text style={[styles.customerAddress, { color: dynamicColors.textTertiary }]}>
            {customer.address.city}, {customer.address.state}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              status={customer.status === 'Blacklisted' ? 'OVERDUE' : 'ACTIVE'}
              label={customer.status}
            />
            <Text style={[styles.scoreText, { color: dynamicColors.textSecondary }]}>
              Internal Score: {customer.creditScoreInternal || 75}/100
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Action Buttons: Call, WhatsApp, SMS, Share */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={handleCall}
        >
          <Ionicons name="call" size={17} color={dynamicColors.primaryDark} />
          <Text style={[styles.quickActionText, { color: dynamicColors.ink }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={handleWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={17} color={dynamicColors.success} />
          <Text style={[styles.quickActionText, { color: dynamicColors.success }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={handleSms}
        >
          <Ionicons name="chatbubble-outline" size={17} color={dynamicColors.ink} />
          <Text style={[styles.quickActionText, { color: dynamicColors.ink }]}>SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={() => router.push(`/loans/new?customerId=${customer.id}` as any)}
        >
          <Ionicons name="add-circle" size={17} color={dynamicColors.primaryDark} />
          <Text style={[styles.quickActionText, { color: dynamicColors.primaryDark }]}>Loan</Text>
        </TouchableOpacity>
      </View>

      {/* Financial Summary Tiles */}
      <View style={styles.tilesRow}>
        <Tile
          label="Total Lent"
          value={formatIndianCurrency(totals.totalLent, { isMinorUnit: true }).formatted}
          iconName="cash-outline"
        />
        <Tile
          label="Outstanding"
          value={formatIndianCurrency(totals.totalOutstanding, { isMinorUnit: true }).formatted}
          iconName="wallet-outline"
          iconColor={dynamicColors.primaryDark}
          iconBgColor={dynamicColors.primarySoft}
        />
        <Tile
          label="Total Paid"
          value={formatIndianCurrency(totals.totalPaid, { isMinorUnit: true }).formatted}
          iconName="checkmark-circle-outline"
          iconColor={dynamicColors.success}
          iconBgColor={dynamicColors.successLight}
        />
      </View>

      {/* Detail Tabs */}
      <SegmentedControl
        items={[
          { label: 'Loans', value: 'loans' },
          { label: 'Payments', value: 'payments' },
          { label: 'KYC & Proofs', value: 'docs' },
          { label: 'Guarantor', value: 'guarantor' },
        ]}
        selectedValue={activeTab}
        onSelect={(val) => setActiveTab(val as any)}
      />

      {/* Tab 1: Loans */}
      {activeTab === 'loans' && (
        <View style={styles.tabContent}>
          {customerLoans && customerLoans.length > 0 ? (
            <Card variant="surface" style={styles.cardBox}>
              {customerLoans.map((l) => (
                <ListRow
                  key={l.id}
                  title={`${l.title} (${l.loanNumber})`}
                  subtitle={`Principal: ${formatIndianCurrency(l.principal, { isMinorUnit: true }).formatted} • ${l.interestRate}% ${l.ratePeriod === 'PER_MONTH' ? 'p.m.' : 'p.a.'}`}
                  metaText={`${l.repaymentFrequency} • Disbursed ${formatDate(l.disbursedOn)}`}
                  iconName={l.category.includes('Vehicle') ? 'car-outline' : l.category.includes('Gold') ? 'diamond-outline' : 'cash-outline'}
                  iconColor={colors.primaryDark}
                  iconBgColor={colors.primarySoft}
                  rightAmount={formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted}
                  rightSubtext="Balance"
                  showChevron
                  onPress={() => router.push(`/loans/${l.id}` as any)}
                />
              ))}
            </Card>
          ) : (
            <Card variant="surface" style={styles.cardBox}>
              <EmptyState
                iconName="cash-outline"
                title="No Loans on Record"
                description="This borrower does not have any active or past loans yet."
              />
            </Card>
          )}
          <PillButton
            title="+ Disburse New Loan"
            onPress={() => router.push(`/loans/new?customerId=${customer.id}` as any)}
            variant="primary"
            fullWidth
            style={styles.newLoanBtn}
          />
        </View>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <View style={styles.tabContent}>
          {customerPayments.length > 0 ? (
            <Card variant="surface" style={styles.cardBox}>
              {customerPayments.map((p) => (
                <ListRow
                  key={p.id}
                  title={`Repayment #${p.receiptNumber}`}
                  subtitle={`${formatDate(p.paidOn, 'dd MMM yyyy')} • ${p.mode}`}
                  rightAmount={`+${formatIndianCurrency(p.amount, { isMinorUnit: true }).formatted}`}
                  rightAmountType="positive"
                  rightSubtext={p.type}
                />
              ))}
            </Card>
          ) : (
            <Card variant="surface" style={styles.cardBox}>
              <EmptyState
                iconName="receipt-outline"
                title="No Payment Records"
                description="No repayment transactions have been logged for this customer."
              />
            </Card>
          )}
        </View>
      )}

      {/* Tab 3: KYC & Proofs with Biometric Reveal */}
      {activeTab === 'docs' && (
        <View style={styles.tabContent}>
          <Card variant="surface" style={styles.cardBox}>
            {customer.idProofs.map((proof) => {
              const isRevealed = unmaskedId === proof.id;
              const displayNum = isRevealed ? proof.number : maskIdentifier(proof.number);

              return (
                <View key={proof.id} style={[styles.proofItem, { borderBottomColor: dynamicColors.border }]}>
                  <View style={styles.proofTop}>
                    <View style={[styles.proofIconWrap, { backgroundColor: dynamicColors.primarySoft }]}>
                      <Ionicons name="card-outline" size={20} color={dynamicColors.primaryDark} />
                    </View>
                    <View style={styles.proofInfo}>
                      <Text style={[styles.proofType, { color: dynamicColors.ink }]}>{proof.type} Card</Text>
                      <Text style={[styles.proofNumber, { color: dynamicColors.textSecondary }]}>{displayNum}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRevealId(proof.id, proof.number)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={dynamicColors.primaryDark}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.viewDocBtn}
                    onPress={() => router.push('/proof-viewer' as any)}
                  >
                    <Text style={[styles.viewDocText, { color: dynamicColors.primaryDark }]}>View Document Photos →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* Tab 4: Guarantor */}
      {activeTab === 'guarantor' && (
        <View style={styles.tabContent}>
          <Card variant="surface" style={styles.cardBox}>
            {customer.guarantor?.name ? (
              <>
                <ListRow
                  title={customer.guarantor.name}
                  subtitle={customer.guarantor.phone || 'No phone'}
                  metaText={customer.guarantor.address || 'Address provided'}
                  iconName="people-outline"
                  iconColor={colors.primaryDark}
                />
              </>
            ) : (
              <EmptyState
                iconName="person-outline"
                title="No Guarantor Attached"
                description="This borrower does not have a co-signer on file."
              />
            )}
          </Card>
        </View>
      )}

      {/* Status Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.blacklistBtn}
          onPress={handleToggleBlacklist}
        >
          <Text style={styles.blacklistText}>
            {customer.status === 'Blacklisted' ? 'Remove from Blacklist' : 'Blacklist Borrower'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Borrower Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: dynamicColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dynamicColors.ink }]}>Edit Borrower Details</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={dynamicColors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name *"
                value={editName}
                onChangeText={setEditName}
                placeholder="Borrower name"
              />
              <Input
                label="Mobile Phone *"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="10 digit number"
              />
              <Input
                label="Occupation / Business"
                value={editOccupation}
                onChangeText={setEditOccupation}
                placeholder="e.g. Textile Merchant"
              />
              <Input
                label="City / Town"
                value={editCity}
                onChangeText={setEditCity}
                placeholder="e.g. Coimbatore"
              />
              <SelectModal
                label="Preferred / Target Loan Scheme"
                selectedValue={editScheme}
                onSelect={(val) => setEditScheme(val)}
                options={loanSchemeOptions}
              />
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <PillButton
                title="Save Borrower Changes"
                onPress={handleSaveEdit}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        visible={deleteConfirmOpen}
        title="Archive Borrower?"
        message={`Are you sure you want to archive ${customer.fullName}? You can restore them from settings later.`}
        isDestructive
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  customerName: {
    fontFamily: typography.fontHeadline,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: 0.9,
  },
  customerPhone: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customerAddress: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  scoreText: {
    fontFamily: typography.fontAmount,
    fontSize: 11,
    color: colors.textSecondary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  quickActionText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    color: colors.ink,
    letterSpacing: 1.0,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabContent: {
    marginTop: 10,
    marginBottom: 20,
  },
  cardBox: {
    padding: 8,
  },
  newLoanBtn: {
    marginTop: 12,
  },
  proofItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  proofTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proofIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  proofInfo: {
    flex: 1,
  },
  proofType: {
    ...typography.bodyMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  proofNumber: {
    ...typography.captionMedium,
    fontFamily: typography.fontAmount,
    color: colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  eyeBtn: {
    padding: 6,
  },
  viewDocBtn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  viewDocText: {
    fontFamily: typography.fontHeadline,
    fontSize: 12,
    color: colors.primaryDark,
    letterSpacing: 1.0,
  },
  bottomControls: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  blacklistBtn: {
    padding: 10,
  },
  blacklistText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.danger,
    letterSpacing: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    fontSize: 18,
  },
});
