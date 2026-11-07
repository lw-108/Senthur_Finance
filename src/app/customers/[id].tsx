import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal, Alert, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { openPhotoSourcePicker } from '@/utils/photoPicker';
import {
  Screen,
  Header,
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
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';
import {
  KYCDocumentPicker,
  isPdfDocument,
  openOrShareDocument,
  DocumentPreviewModal,
} from '@/features/customers/components/KYCDocumentPicker';
import { IdProof, IdProofType } from '@/features/customers/types';
import { validateKYCDocument, sanitizeKYCDocument } from '@/utils/validators';
import { useCustomer, useDeleteCustomer, useUpdateCustomer } from '@/features/customers/hooks';
import { useLoans } from '@/features/loans/hooks';
import { usePayments } from '@/features/payments/hooks';
import { Payment } from '@/features/payments/types';
import { PaymentReceiptModal } from '@/features/payments/components/PaymentReceiptModal';
import { BorrowerActivityList } from '@/features/customers/components/BorrowerActivityList';
import { CustomerFinancialBento } from '@/features/customers/components/CustomerFinancialBento';
import { formatIndianCurrency, maskIdentifier, formatDate } from '@/utils/formatters';
import { openWhatsApp } from '@/utils/whatsapp';
import { useAuthStore } from '@/store/useAuthStore';
import { useLoanProductsStore } from '@/store/useLoanProductsStore';
import { useBusinessSettingsStore } from '@/store/useBusinessSettingsStore';
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
  const { business } = useBusinessSettingsStore();

  const [activeTab, setActiveTab] = useState<'loans' | 'payments' | 'activity' | 'docs' | 'guarantor'>('loans');
  const [unmaskedId, setUnmaskedId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Receipt Modal State for viewing/sharing/printing repayments
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Derive live, dynamic totals from customerLoans and customerPayments for 100% real-time accuracy
  const computedTotals = React.useMemo(() => {
    if (!customerLoans || customerLoans.length === 0) {
      return (
        customer?.totals || {
          totalLent: 0,
          totalOutstanding: 0,
          totalPaid: 0,
          overdueAmount: 0,
          activeLoans: 0,
        }
      );
    }
    const totalLent = customerLoans.reduce((sum, l) => sum + (l.principal || 0), 0);
    const totalOutstanding = customerLoans
      .filter((l) => l.status !== 'CLOSED' && !l.isDeleted)
      .reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
    const totalPaid =
      customerPayments.length > 0
        ? customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        : customerLoans.reduce((sum, l) => sum + (l.totalPaid || 0), 0);
    const overdueAmount = customerLoans
      .filter((l) => (l.status === 'OVERDUE' || (l.daysOverdue && l.daysOverdue > 0)) && !l.isDeleted)
      .reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
    const activeLoans = customerLoans.filter(
      (l) => (l.status === 'ACTIVE' || l.status === 'OVERDUE') && !l.isDeleted
    ).length;

    return {
      totalLent,
      totalOutstanding,
      totalPaid,
      overdueAmount,
      activeLoans,
    };
  }, [customerLoans, customerPayments, customer?.totals]);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editScheme, setEditScheme] = useState('');

  // ID Proof Add / Edit Modal State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [editingProofIndex, setEditingProofIndex] = useState<number | null>(null);
  const [proofType, setProofType] = useState<IdProofType>('Aadhaar');
  const [proofNumber, setProofNumber] = useState('');
  const [proofFrontUri, setProofFrontUri] = useState('');
  const [proofBackUri, setProofBackUri] = useState('');
  const [proofFrontName, setProofFrontName] = useState<string | undefined>(undefined);
  const [proofBackName, setProofBackName] = useState<string | undefined>(undefined);
  const [proofError, setProofError] = useState('');

  // Document Full Preview State
  const [previewDocUri, setPreviewDocUri] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState('Proof Document');

  const handleOpenAddProof = () => {
    setEditingProofIndex(null);
    const existingTypes = (customer?.idProofs || []).map((p) => p.type);
    const nextType: IdProofType = !existingTypes.includes('Aadhaar')
      ? 'Aadhaar'
      : !existingTypes.includes('PAN')
      ? 'PAN'
      : !existingTypes.includes('Voter')
      ? 'Voter'
      : !existingTypes.includes('RationCard')
      ? 'RationCard'
      : 'Other';

    setProofType(nextType);
    setProofNumber('');
    setProofFrontUri('');
    setProofBackUri('');
    setProofFrontName(undefined);
    setProofBackName(undefined);
    setProofError('');
    setProofModalOpen(true);
  };

  const handleOpenEditProof = (index: number) => {
    const proof = customer?.idProofs?.[index];
    if (!proof) return;
    setEditingProofIndex(index);
    setProofType(proof.type || 'Aadhaar');
    setProofNumber(proof.number || '');
    setProofFrontUri(proof.frontUrl || '');
    setProofBackUri(proof.backUrl || '');
    setProofFrontName(undefined);
    setProofBackName(undefined);
    setProofError('');
    setProofModalOpen(true);
  };

  const handleSaveProof = async () => {
    if (!customer) return;
    const cleanNumber = sanitizeKYCDocument(proofType, proofNumber);
    if (cleanNumber.length > 0) {
      const valRes = validateKYCDocument(proofType, cleanNumber, { required: false });
      if (!valRes.isValid) {
        setProofError(valRes.error || 'Invalid ID number');
        return;
      }
    }

    const currentProofs = [...(customer.idProofs || [])];
    const newProofData: IdProof = {
      id: editingProofIndex !== null && currentProofs[editingProofIndex]
        ? currentProofs[editingProofIndex].id
        : `proof-${Date.now()}`,
      type: proofType,
      number: cleanNumber,
      frontUrl: proofFrontUri || undefined,
      backUrl: proofBackUri || undefined,
      verified: true,
    };

    if (editingProofIndex !== null && editingProofIndex >= 0 && editingProofIndex < currentProofs.length) {
      currentProofs[editingProofIndex] = newProofData;
    } else {
      currentProofs.push(newProofData);
    }

    try {
      await updateMutation.mutateAsync({
        customerId: customer.id,
        updates: { idProofs: currentProofs },
      });
      setProofModalOpen(false);
      showSuccess(editingProofIndex !== null ? 'ID proof updated successfully' : 'New ID proof added successfully');
      refetch();
    } catch (err: any) {
      showError(err?.message || 'Failed to save ID proof');
    }
  };

  const handleDeleteProof = (index: number) => {
    if (!customer) return;
    const proof = customer.idProofs?.[index];
    if (!proof) return;

    Alert.alert(
      'Remove ID Proof',
      `Are you sure you want to delete this ${proof.type} card proof from ${customer.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = (customer.idProofs || []).filter((_, i) => i !== index);
            try {
              await updateMutation.mutateAsync({
                customerId: customer.id,
                updates: { idProofs: updated },
              });
              showSuccess(`${proof.type} proof removed`);
              refetch();
            } catch (err: any) {
              showError('Failed to delete proof');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    initializeProducts();
  }, [initializeProducts]);

  const handleOpenEditModal = () => {
    if (customer) {
      setEditName(customer.fullName);
      setEditPhone(customer.phone);
      setEditOccupation(customer.occupation || '');
      setEditCity(customer.address.city || '');
      setEditScheme(customer.tags?.[0] || 'Gold Loan (Jewel Loan)');
    }
    setEditModalOpen(true);
  };

  const loanSchemeOptions = loanProducts.map((p) => ({
    label: p.name,
    value: p.name,
    subtitle: `${p.category} • ${p.interestType.replace(/_/g, ' ')}`,
  }));

  const handleSaveEdit = async () => {
    if (!customer) return;
    if (!editName.trim()) {
      showError('Please enter customer name');
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
      showSuccess('Customer details updated');
      refetch();
    } catch {
      showError('Failed to update customer');
    }
  };

  const handleExportStatementPdf = async () => {
    if (!customer) return;
    try {
      const uri = await exportCustomerStatementPdf(
        customer,
        customerLoans || [],
        customerPayments || [],
        business.businessName,
        business.phone,
        business.address
      );
      await shareFile(uri, `${customer.fullName} Account Statement`, 'application/pdf');
      showSuccess('Statement PDF generated');
    } catch {
      showError('Failed to generate PDF statement');
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Header showBack title="Customer" />
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
          description="The requested customer record does not exist or has been removed."
          actionTitle="Back to Customers"
          onAction={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/customers' as any);
            }
          }}
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

  const handleRemovePhoto = async () => {
    if (!customer) return;
    try {
      await updateMutation.mutateAsync({
        customerId: customer.id,
        updates: { photoUrl: '' },
      });
      showSuccess('Customer photo removed');
      refetch();
    } catch {
      showError('Failed to remove customer photo');
    }
  };

  const handlePickPhoto = () => {
    if (!customer) return;

    openPhotoSourcePicker({
      title: 'Customer Photo',
      hasExistingPhoto: Boolean(customer.photoUrl),
      onPhotoSelected: async (avatarUri) => {
        try {
          await updateMutation.mutateAsync({
            customerId: customer.id,
            updates: { photoUrl: avatarUri },
          });
          showSuccess('Customer photo updated');
          refetch();
        } catch (err) {
          console.error('[Customer Photo] Update error:', err);
          showError('Failed to update customer photo');
        }
      },
      onPhotoRemoved: handleRemovePhoto,
      onError: showError,
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${customer.phone}`);
  };

  const handleWhatsApp = () => {
    openWhatsApp(customer.phone, `Hello ${customer.fullName}, greetings from ${business.businessName || 'Senthur Finance'}.`);
  };

  const handleSms = () => {
    Linking.openURL(`sms:${customer.phone}`);
  };

  const handleArchive = async () => {
    try {
      await deleteMutation.mutateAsync(customer.id);
      showSuccess(`${customer.fullName} archived.`);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/customers' as any);
      }
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

  return (
    <Screen scrollable>
      <Header
        showBack
        title="Customer Profile"
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
              onPress={handleOpenEditModal}
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
        <TouchableOpacity
          onPress={handlePickPhoto}
          activeOpacity={0.8}
          style={styles.avatarTouchable}
          accessibilityLabel="Change customer profile picture"
        >
          <Avatar
            uri={customer.photoUrl}
            name={customer.fullName}
            size={70}
            backgroundColor={dynamicColors.primaryLight}
            textColor={dynamicColors.primaryDark}
          />
          <View style={[styles.avatarCameraBadge, { backgroundColor: dynamicColors.primaryDark, borderColor: dynamicColors.surface }]}>
            <Ionicons name="camera" size={13} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={[styles.customerName, { color: dynamicColors.ink }]}>{customer.fullName}</Text>
          <Text style={[styles.customerPhone, { color: dynamicColors.textSecondary }]}>+91 {customer.phone}</Text>
          <Text style={[styles.customerAddress, { color: dynamicColors.textTertiary }]}>
            {customer.address.city}, {customer.address.state}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              status={customer.status === 'Blacklisted' ? 'OVERDUE' : 'ACTIVE'}
              label={customer.status === 'Blacklisted' ? 'Blocked' : customer.status}
            />
            <Text style={[styles.scoreText, { color: dynamicColors.textSecondary }]}>
              Rating: {customer.creditScoreInternal || 75}/100
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={handleCall}
          accessibilityLabel="Call customer"
        >
          <Ionicons name="call" size={18} color={dynamicColors.primaryDark} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={handleWhatsApp}
          accessibilityLabel="WhatsApp customer"
        >
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={handleSms}
          accessibilityLabel="SMS customer"
        >
          <Ionicons name="chatbubble-outline" size={18} color={dynamicColors.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickActionBtn,
            { backgroundColor: dynamicColors.successLight, borderColor: dynamicColors.success },
          ]}
          onPress={() => router.push(`/payments/new?customerId=${customer.id}` as any)}
          accessibilityLabel="Collect Loan Due"
        >
          <Ionicons name="cash" size={20} color={dynamicColors.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border }]}
          onPress={() => router.push(`/loans/new?customerId=${customer.id}` as any)}
          accessibilityLabel="New Loan"
        >
          <Ionicons name="add" size={22} color={dynamicColors.primaryDark} />
        </TouchableOpacity>
      </View>

      {/* Financial Summary Bento Cards (Flexing, Non-Truncating with Themed Progress Visual) */}
      <CustomerFinancialBento
        totalLent={computedTotals.totalLent}
        totalOutstanding={computedTotals.totalOutstanding}
        totalPaid={computedTotals.totalPaid}
        overdueAmount={computedTotals.overdueAmount}
        activeLoansCount={computedTotals.activeLoans}
        totalLoansCount={customerLoans?.length || 0}
        onCollectDue={
          computedTotals.totalOutstanding > 0
            ? () => router.push(`/payments/new?customerId=${customer.id}` as any)
            : undefined
        }
        onNewLoan={() => router.push(`/loans/new?customerId=${customer.id}` as any)}
      />

      {/* Detail Tabs */}
      <SegmentedControl
        items={[
          { label: 'Loans', value: 'loans' },
          { label: 'Payments', value: 'payments' },
          { label: 'Activity', value: 'activity' },
          { label: 'ID Proofs', value: 'docs' },
          { label: 'Surety', value: 'guarantor' },
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
                <View key={l.id} style={styles.loanRowWrap}>
                  <ListRow
                    title={`${l.title} (${l.loanNumber})`}
                    subtitle={`Principal: ${formatIndianCurrency(l.principal, { isMinorUnit: true }).formatted} • ${l.interestRate}% ${l.ratePeriod === 'PER_MONTH' ? 'p.m.' : 'p.a.'}`}
                    metaText={`${l.repaymentFrequency} • Given ${formatDate(l.disbursedOn)}`}
                    iconName={l.category.includes('Vehicle') ? 'car-outline' : l.category.includes('Gold') ? 'diamond-outline' : 'cash-outline'}
                    iconColor={colors.primaryDark}
                    iconBgColor={colors.primarySoft}
                    rightAmount={formatIndianCurrency(l.outstandingPrincipal, { isMinorUnit: true }).formatted}
                    rightSubtext="Balance"
                    showChevron
                    onPress={() => router.push(`/loans/${l.id}` as any)}
                  />
                  {l.status !== 'CLOSED' && l.outstandingPrincipal > 0 && (
                    <TouchableOpacity
                      style={[styles.rowPayDueBtn, { backgroundColor: dynamicColors.surfaceMuted, borderColor: dynamicColors.border }]}
                      onPress={() => router.push(`/payments/new?customerId=${customer.id}&loanId=${l.id}` as any)}
                    >
                      <Ionicons name="cash-outline" size={14} color={dynamicColors.success} />
                      <Text style={[styles.rowPayDueBtnText, { color: dynamicColors.headingPrimary }]}>
                        Collect Due (EMI: {formatIndianCurrency(l.installmentAmount, { isMinorUnit: true }).formatted})
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color={dynamicColors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </Card>
          ) : (
            <Card variant="surface" style={styles.cardBox}>
              <EmptyState
                iconName="cash-outline"
                title="No Loans on Record"
                description="This customer does not have any active or past loans yet."
              />
            </Card>
          )}
          <PillButton
            title="+ Give New Loan"
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
          {computedTotals.totalOutstanding > 0 && (
            <PillButton
              title="+ Record Due Payment"
              iconName="cash-outline"
              iconPosition="left"
              onPress={() => router.push(`/payments/new?customerId=${customer.id}` as any)}
              variant="primary"
              fullWidth
              style={{ marginBottom: 12 }}
            />
          )}
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
                  showChevron
                  onPress={() => {
                    setSelectedReceiptPayment(p);
                    setReceiptModalOpen(true);
                  }}
                />
              ))}
            </Card>
          ) : (
            <Card variant="surface" style={styles.cardBox}>
              <EmptyState
                iconName="receipt-outline"
                title="No Payment Records"
                description="No repayment transactions have been logged for this customer."
                actionTitle="+ Record First Payment"
                onAction={() => router.push(`/payments/new?customerId=${customer.id}` as any)}
              />
            </Card>
          )}
        </View>
      )}

      {/* Tab 3: Recent Activity & Real Database Audit Trail */}
      {activeTab === 'activity' && (
        <View style={styles.tabContent}>
          <BorrowerActivityList
            customerId={customer.id}
            customerName={customer.fullName}
            customerLoans={customerLoans || []}
            allPayments={customerPayments || []}
            onViewReceipt={(payment) => {
              setSelectedReceiptPayment(payment);
              setReceiptModalOpen(true);
            }}
          />
        </View>
      )}

      {/* Tab 4: KYC & Proofs with Camera, Gallery & PDF Upload */}
      {activeTab === 'docs' && (
        <View style={styles.tabContent}>
          {/* Header Row with "+ Add ID Proof" button */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: typography.fontHeadline, fontSize: 16, fontWeight: '700', color: dynamicColors.ink }}>
                KYC & Identity Proofs
              </Text>
              <Text style={{ fontSize: 11.5, color: dynamicColors.textSecondary, marginTop: 2 }}>
                Camera photos, gallery images & PDF documents
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleOpenAddProof}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: dynamicColors.primary,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
              }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={{ fontFamily: typography.fontHeadline, fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                Add Proof
              </Text>
            </TouchableOpacity>
          </View>

          {(!customer.idProofs || customer.idProofs.length === 0) ? (
            <Card variant="surface" style={styles.cardBox}>
              <EmptyState
                iconName="document-text-outline"
                title="No ID Proofs Uploaded"
                description="Upload customer's Aadhaar, PAN, Voter, Ration Card or other ID proofs using Camera, Gallery or PDF."
                actionTitle="+ Upload First ID Proof"
                onAction={handleOpenAddProof}
              />
            </Card>
          ) : (
            customer.idProofs.map((proof, idx) => {
              const isRevealed = unmaskedId === proof.id;
              const displayNum = isRevealed ? proof.number : maskIdentifier(proof.number);

              let iconName: keyof typeof Ionicons.glyphMap = 'card-outline';
              if (proof.type === 'PAN') iconName = 'document-text-outline';
              else if (proof.type === 'Voter') iconName = 'finger-print-outline';
              else if (proof.type === 'DrivingLicense') iconName = 'car-outline';
              else if (proof.type === 'RationCard') iconName = 'receipt-outline';
              else if (proof.type === 'Passport') iconName = 'globe-outline';

              return (
                <Card
                  key={proof.id || idx}
                  variant="surface"
                  style={{
                    marginBottom: 12,
                    padding: 14,
                    borderRadius: radii.card,
                    borderColor: dynamicColors.border,
                    borderWidth: 1,
                    backgroundColor: dynamicColors.surface,
                  }}
                >
                  {/* Top Row: Icon, Type, Number, Biometric Reveal, Edit & Delete */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={[styles.proofIconWrap, { backgroundColor: dynamicColors.primarySoft }]}>
                        <Ionicons name={iconName} size={20} color={dynamicColors.primaryDark} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.proofType, { color: dynamicColors.ink }]}>
                            {proof.type} Card
                          </Text>
                          <Badge
                            status={proof.verified ? 'PAID' : 'DRAFT'}
                            label={proof.verified ? 'Verified' : 'Pending'}
                            size="sm"
                          />
                        </View>
                        <Text style={[styles.proofNumber, { color: dynamicColors.textSecondary }]}>
                          {displayNum || 'Number Not Recorded'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleRevealId(proof.id, proof.number)}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                          size={19}
                          color={dynamicColors.primaryDark}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleOpenEditProof(idx)}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil-outline" size={18} color={dynamicColors.primaryDark} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteProof(idx)}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={dynamicColors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Document Attachments (Front & Back) */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    {/* Front Side */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontFamily: typography.fontHeadline, color: dynamicColors.textSecondary, marginBottom: 4 }}>
                        Front Side
                      </Text>
                      {proof.frontUrl ? (
                        isPdfDocument(proof.frontUrl) ? (
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 8,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: dynamicColors.border,
                              backgroundColor: dynamicColors.surfaceMuted,
                              gap: 8,
                            }}
                            onPress={() => openOrShareDocument(proof.frontUrl!, `${customer.fullName}_${proof.type}_Front`)}
                          >
                            <Ionicons name="document-text" size={24} color="#EF4444" />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: typography.fontHeadline, fontSize: 11, fontWeight: '700', color: dynamicColors.ink }} numberOfLines={1}>
                                PDF Document
                              </Text>
                              <Text style={{ fontSize: 9.5, color: dynamicColors.primaryDark, marginTop: 1 }}>
                                Tap to Open / View
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={{
                              height: 85,
                              borderRadius: 8,
                              overflow: 'hidden',
                              borderWidth: 1,
                              borderColor: dynamicColors.border,
                              position: 'relative',
                            }}
                            onPress={() => {
                              setPreviewDocUri(proof.frontUrl!);
                              setPreviewDocTitle(`${customer.fullName} - ${proof.type} Front`);
                            }}
                          >
                            <Image source={{ uri: proof.frontUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            <View style={styles.viewZoomBadge}>
                              <Ionicons name="eye-outline" size={11} color="#FFFFFF" style={{ marginRight: 2 }} />
                              <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' }}>View</Text>
                            </View>
                          </TouchableOpacity>
                        )
                      ) : (
                        <TouchableOpacity
                          style={{
                            height: 60,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: dynamicColors.border,
                            borderStyle: 'dashed',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: dynamicColors.surfaceMuted,
                          }}
                          onPress={() => handleOpenEditProof(idx)}
                        >
                          <Ionicons name="cloud-upload-outline" size={18} color={dynamicColors.primaryDark} />
                          <Text style={{ fontSize: 10, color: dynamicColors.primaryDark, fontWeight: '700', marginTop: 2 }}>
                            + Upload Front
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Back Side (if applicable) */}
                    {proof.type !== 'PAN' && (
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontFamily: typography.fontHeadline, color: dynamicColors.textSecondary, marginBottom: 4 }}>
                          Back Side
                        </Text>
                        {proof.backUrl ? (
                          isPdfDocument(proof.backUrl) ? (
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: dynamicColors.border,
                                backgroundColor: dynamicColors.surfaceMuted,
                                gap: 8,
                              }}
                              onPress={() => openOrShareDocument(proof.backUrl!, `${customer.fullName}_${proof.type}_Back`)}
                            >
                              <Ionicons name="document-text" size={24} color="#EF4444" />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: typography.fontHeadline, fontSize: 11, fontWeight: '700', color: dynamicColors.ink }} numberOfLines={1}>
                                  PDF Document
                                </Text>
                                <Text style={{ fontSize: 9.5, color: dynamicColors.primaryDark, marginTop: 1 }}>
                                  Tap to Open / View
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={{
                                height: 85,
                                borderRadius: 8,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: dynamicColors.border,
                                position: 'relative',
                              }}
                              onPress={() => {
                                setPreviewDocUri(proof.backUrl!);
                                setPreviewDocTitle(`${customer.fullName} - ${proof.type} Back`);
                              }}
                            >
                              <Image source={{ uri: proof.backUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                              <View style={styles.viewZoomBadge}>
                                <Ionicons name="eye-outline" size={11} color="#FFFFFF" style={{ marginRight: 2 }} />
                                <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' }}>View</Text>
                              </View>
                            </TouchableOpacity>
                          )
                        ) : (
                          <TouchableOpacity
                            style={{
                              height: 60,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: dynamicColors.border,
                              borderStyle: 'dashed',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: dynamicColors.surfaceMuted,
                            }}
                            onPress={() => handleOpenEditProof(idx)}
                          >
                            <Ionicons name="cloud-upload-outline" size={18} color={dynamicColors.primaryDark} />
                            <Text style={{ fontSize: 10, color: dynamicColors.primaryDark, fontWeight: '700', marginTop: 2 }}>
                              + Upload Back
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Edit / Upload button */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: dynamicColors.primarySoft,
                    }}
                    onPress={() => handleOpenEditProof(idx)}
                  >
                    <Ionicons name="camera-outline" size={14} color={dynamicColors.primaryDark} />
                    <Text style={{ fontFamily: typography.fontHeadline, fontSize: 11.5, fontWeight: '700', color: dynamicColors.primaryDark }}>
                      Edit / Upload Photos & PDFs
                    </Text>
                  </TouchableOpacity>
                </Card>
              );
            })
          )}
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
                description="This customer does not have a co-signer on file."
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
            {customer.status === 'Blacklisted' ? 'Remove from Blacklist' : 'Blacklist Customer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Customer Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: dynamicColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dynamicColors.ink }]}>Edit Customer Details</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={dynamicColors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name *"
                value={editName}
                onChangeText={setEditName}
                placeholder="Customer name"
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

              {/* ID Proofs Management Shortcut inside Edit Modal */}
              <View style={{ marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: dynamicColors.border, backgroundColor: dynamicColors.surfaceMuted }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="card-outline" size={18} color={dynamicColors.primaryDark} />
                    <Text style={{ fontFamily: typography.fontHeadline, fontSize: 13, fontWeight: '700', color: dynamicColors.ink }}>
                      KYC Documents ({customer?.idProofs?.length || 0})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setEditModalOpen(false);
                      setActiveTab('docs');
                      handleOpenAddProof();
                    }}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: dynamicColors.primarySoft }}
                  >
                    <Text style={{ fontFamily: typography.fontHeadline, fontSize: 11, fontWeight: '700', color: dynamicColors.primaryDark }}>
                      + Add / Upload
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: dynamicColors.textSecondary, marginTop: 4 }}>
                  Camera photo, gallery image & PDF documents supported for all ID types.
                </Text>
              </View>
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <PillButton
                title="Save Customer Changes"
                onPress={handleSaveEdit}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit ID Proof Modal */}
      <Modal visible={proofModalOpen} animationType="slide" transparent onRequestClose={() => setProofModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: dynamicColors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dynamicColors.ink }]}>
                {editingProofIndex !== null ? 'Edit ID Proof & Photos' : 'Add New ID Proof'}
              </Text>
              <TouchableOpacity onPress={() => setProofModalOpen(false)}>
                <Ionicons name="close" size={24} color={dynamicColors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <SelectModal
                label="ID Card Type *"
                selectedValue={proofType}
                onSelect={(val) => {
                  setProofType(val as IdProofType);
                  setProofError('');
                }}
                options={[
                  { label: 'Aadhaar Card (12 Digits)', value: 'Aadhaar', icon: 'card-outline' },
                  { label: 'PAN Card (ABCDE1234F - 10 Chars)', value: 'PAN', icon: 'document-text-outline' },
                  { label: 'Voter ID Card (10 Chars)', value: 'Voter', icon: 'finger-print-outline' },
                  { label: 'Driving License', value: 'DrivingLicense', icon: 'car-outline' },
                  { label: 'Ration Card (Smart Card / Family Card)', value: 'RationCard', icon: 'receipt-outline' },
                  { label: 'Passport (8 Chars)', value: 'Passport', icon: 'globe-outline' },
                  { label: 'Other Government / Property Proof', value: 'Other', icon: 'document-attach-outline' },
                ]}
              />

              <Input
                label={
                  proofType === 'Aadhaar'
                    ? 'Aadhaar Number (Strictly 12 Digits)'
                    : proofType === 'PAN'
                    ? 'PAN Number (Strictly 10 Characters)'
                    : `${proofType} Number`
                }
                placeholder={
                  proofType === 'Aadhaar'
                    ? 'e.g. 12-digit Aadhaar (123456789012)'
                    : proofType === 'PAN'
                    ? 'e.g. ABCDE1234F'
                    : 'Enter ID proof number'
                }
                keyboardType={proofType === 'Aadhaar' ? 'numeric' : 'default'}
                autoCapitalize="characters"
                maxLength={
                  proofType === 'Aadhaar'
                    ? 12
                    : proofType === 'PAN'
                    ? 10
                    : proofType === 'Passport'
                    ? 8
                    : 16
                }
                value={proofNumber}
                onChangeText={(val) => {
                  const cleaned = sanitizeKYCDocument(proofType, val);
                  setProofNumber(cleaned);
                  if (proofError) setProofError('');
                }}
                error={proofError}
                leadingIcon="keypad-outline"
              />

              <KYCDocumentPicker
                label={`${proofType} Document Proof (Camera, Gallery Image or PDF)`}
                frontUri={proofFrontUri}
                backUri={proofBackUri}
                frontName={proofFrontName}
                backName={proofBackName}
                hasBackSide={proofType !== 'PAN'}
                onChangeFront={(uri, name) => {
                  setProofFrontUri(uri);
                  if (name) setProofFrontName(name);
                }}
                onChangeBack={(uri, name) => {
                  setProofBackUri(uri);
                  if (name) setProofBackName(name);
                }}
              />
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <PillButton
                title={editingProofIndex !== null ? 'Save Proof Changes' : 'Attach ID Proof to Customer'}
                onPress={handleSaveProof}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Document Preview Modal */}
      <DocumentPreviewModal
        visible={Boolean(previewDocUri)}
        uri={previewDocUri || undefined}
        title={previewDocTitle}
        onClose={() => setPreviewDocUri(null)}
      />

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        visible={deleteConfirmOpen}
        title="Archive Customer?"
        message={`Are you sure you want to archive ${customer.fullName}? You can restore them from settings later.`}
        isDestructive
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Interactive Payment Receipt Modal */}
      <PaymentReceiptModal
        visible={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        payment={selectedReceiptPayment}
        loan={customerLoans?.find((l) => l.id === selectedReceiptPayment?.loanId)}
        customerPhone={customer.phone}
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
  avatarTouchable: {
    position: 'relative',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
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
    gap: 12,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  collectDueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  bannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerDueTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerDueSub: {
    fontSize: 11,
    marginTop: 2,
  },
  bannerDueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  bannerDueBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  loanRowWrap: {
    marginBottom: 6,
  },
  rowPayDueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginHorizontal: 8,
    marginBottom: 6,
    borderWidth: 1,
  },
  rowPayDueBtnText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  viewZoomBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
