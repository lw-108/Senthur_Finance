import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Header,
  DisplayTitle,
  Card,
  Badge,
  Chip,
  PillButton,
  Input,
  SelectModal,
  SegmentedControl,
  EmptyState,
  useToast,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { useLoanProductsStore, LoanProduct } from '@/store/useLoanProductsStore';
import { InterestType, RatePeriod, RepaymentFrequency, TenureUnit } from '@/lib/finance/types';
import { CollateralType } from '@/features/loans/types';

export default function LoanTypesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { products, initialize, addProduct, updateProduct, deleteProduct, resetToDefaults } =
    useLoanProductsStore();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LoanProduct['category']>('Gold');
  const [description, setDescription] = useState('');
  const [interestType, setInterestType] = useState<InterestType>('SIMPLE');
  const [defaultRate, setDefaultRate] = useState('2.0');
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>('PER_MONTH');
  const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>('MONTHLY');
  const [tenureValue, setTenureValue] = useState('12');
  const [tenureUnit, setTenureUnit] = useState<TenureUnit>('MONTHS');
  const [collateralType, setCollateralType] = useState<CollateralType>('Gold');
  const [docInput, setDocInput] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [graceDays, setGraceDays] = useState('3');
  const [penaltyRate, setPenaltyRate] = useState('2.0');
  const [isConcessionAllowed, setIsConcessionAllowed] = useState(true);
  const [maxConcession, setMaxConcession] = useState('10');

  useEffect(() => {
    initialize();
  }, [initialize]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Gold');
    setDescription('');
    setInterestType('SIMPLE');
    setDefaultRate('');
    setRatePeriod('PER_MONTH');
    setRepaymentFrequency('MONTHLY');
    setTenureValue('');
    setTenureUnit('MONTHS');
    setCollateralType('None');
    setRequiredDocs([]);
    setGraceDays('');
    setPenaltyRate('');
    setIsConcessionAllowed(true);
    setMaxConcession('');
    setModalVisible(true);
  };

  const openEditModal = (prod: LoanProduct) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setDescription(prod.description);
    setInterestType(prod.interestType);
    setDefaultRate(prod.defaultRate.toString());
    setRatePeriod(prod.ratePeriod);
    setRepaymentFrequency(prod.repaymentFrequency);
    setTenureValue(prod.defaultTenureValue.toString());
    setTenureUnit(prod.defaultTenureUnit);
    setCollateralType(prod.collateralType);
    setRequiredDocs(prod.requiredDocuments || []);
    setGraceDays(prod.graceDays.toString());
    setPenaltyRate(prod.penaltyRatePercent.toString());
    setIsConcessionAllowed(prod.isConcessionAllowed);
    setMaxConcession(prod.maxConcessionPercent.toString());
    setModalVisible(true);
  };

  const handleAddDoc = () => {
    if (docInput.trim() && !requiredDocs.includes(docInput.trim())) {
      setRequiredDocs([...requiredDocs, docInput.trim()]);
      setDocInput('');
    }
  };

  const handleRemoveDoc = (docName: string) => {
    setRequiredDocs(requiredDocs.filter((d) => d !== docName));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Please enter a loan scheme name');
      return;
    }
    const rateNum = parseFloat(defaultRate) || 0;
    if (rateNum <= 0) {
      showError('Please enter a valid positive interest rate');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: name.trim(),
          category,
          description: description.trim(),
          interestType,
          defaultRate: rateNum,
          ratePeriod,
          repaymentFrequency,
          defaultTenureValue: parseInt(tenureValue, 10) || 12,
          defaultTenureUnit: tenureUnit,
          collateralType,
          requiredDocuments: requiredDocs,
          graceDays: parseInt(graceDays, 10) || 0,
          penaltyRatePercent: parseFloat(penaltyRate) || 0,
          isConcessionAllowed,
          maxConcessionPercent: parseInt(maxConcession, 10) || 0,
        });
        showSuccess(`Updated ${name}`);
      } else {
        await addProduct({
          name: name.trim(),
          category,
          description: description.trim(),
          interestType,
          defaultRate: rateNum,
          ratePeriod,
          repaymentFrequency,
          defaultTenureValue: parseInt(tenureValue, 10) || 12,
          defaultTenureUnit: tenureUnit,
          collateralType,
          requiredDocuments: requiredDocs,
          graceDays: parseInt(graceDays, 10) || 0,
          penaltyRatePercent: parseFloat(penaltyRate) || 0,
          isConcessionAllowed,
          maxConcessionPercent: parseInt(maxConcession, 10) || 0,
          isActive: true,
        });
        showSuccess(`Created ${name}`);
      }
      setModalVisible(false);
    } catch {
      showError('Failed to save loan product');
    }
  };

  const handleDelete = (prod: LoanProduct) => {
    Alert.alert('Delete Scheme', `Are you sure you want to delete "${prod.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(prod.id);
          showSuccess(`Removed ${prod.name}`);
        },
      },
    ]);
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Catalog',
      'Restore all 8 standard Senthur Finance loan schemes (Gold, Monthly, Weekly, Daily, Bike RC, Car RC, Land, House)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Defaults',
          onPress: async () => {
            await resetToDefaults();
            showSuccess('Restored default loan products');
          },
        },
      ]
    );
  };

  const filteredProducts = products.filter((p) => {
    if (activeCategoryFilter === 'ALL') return true;
    if (activeCategoryFilter === 'PROPERTY') {
      return p.category === 'Property' || p.category === 'Vehicle';
    }
    return p.category.toUpperCase() === activeCategoryFilter;
  });

  return (
    <Screen scrollable>
      <Header
        showBack
        title="Loan Products & Rules"
        showSupportPill={false}
      />

      <DisplayTitle
        title="Default Loan Rules"
        subtitle="Manage calculation schemes, rates, concessions & collateral roles"
      />

      {/* Top Action Bar */}
      <View style={styles.topActions}>
        <PillButton
          title="+ Add New Loan Scheme"
          onPress={openCreateModal}
          variant="primary"
          style={styles.addBtn}
        />
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {[
          { label: 'All Schemes', value: 'ALL' },
          { label: 'Gold Loan', value: 'GOLD' },
          { label: 'Monthly Hand Loan', value: 'MONTHLY' },
          { label: 'Weekly Micro', value: 'WEEKLY' },
          { label: 'Daily Thandal', value: 'DAILY' },
          { label: 'Property & Vehicle RC', value: 'PROPERTY' },
        ].map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            selected={activeCategoryFilter === filter.value}
            onPress={() => setActiveCategoryFilter(filter.value)}
          />
        ))}
      </ScrollView>

      {/* Products List */}
      <View style={styles.productsList}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((prod) => (
            <Card key={prod.id} variant="surface" style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.boxBorder, borderWidth: 1 }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text style={[styles.productName, { color: colors.ink }]}>{prod.name}</Text>
                  <Text style={[styles.productDesc, { color: colors.textSecondary }]}>{prod.description}</Text>
                </View>
                <Badge
                  status="ACTIVE"
                  label={prod.category}
                  size="sm"
                  showDot={false}
                />
              </View>

              {/* Metrics Row */}
              <View style={[styles.schemeSpecsRow, { backgroundColor: colors.primarySoft }]}>
                <View style={styles.specBox}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>INTEREST SCHEME</Text>
                  <Text style={[styles.specValue, { color: colors.ink }]}>{prod.interestType.replace(/_/g, ' ')}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>DEFAULT RATE</Text>
                  <Text style={[styles.specValueAmount, { color: colors.primaryDark }]}>
                    {prod.defaultRate}% {prod.ratePeriod === 'PER_MONTH' ? 'p.m.' : 'p.a.'}
                  </Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={[styles.specLabel, { color: colors.textSecondary }]}>COLLECTION</Text>
                  <Text style={[styles.specValue, { color: colors.ink }]}>
                    {prod.repaymentFrequency} • {prod.defaultTenureValue} {prod.defaultTenureUnit.toLowerCase()}
                  </Text>
                </View>
              </View>

              {/* Collateral & Documents Tags */}
              <View style={[styles.docsSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.docsHeader, { color: colors.textSecondary }]}>
                  PLEDGE: {prod.collateralType.toUpperCase()} COLLATERAL • {prod.graceDays}D GRACE
                </Text>
                <View style={styles.docTagsRow}>
                  {prod.requiredDocuments.map((doc, idx) => (
                    <View key={idx} style={[styles.docTag, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="document-text-outline" size={12} color={colors.primaryDark} />
                      <Text style={[styles.docTagText, { color: colors.primaryDark }]}>{doc}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Card Bottom Controls */}
              <View style={styles.cardBottomRow}>
                {prod.isConcessionAllowed && (
                  <Text style={styles.concessionNote}>
                    ✓ Foreclosure waiver up to {prod.maxConcessionPercent}%
                  </Text>
                )}
                <View style={styles.actionsGroup}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => openEditModal(prod)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primaryDark} />
                    <Text style={[styles.actionBtnText, { color: colors.primaryDark }]}>Edit</Text>
                  </TouchableOpacity>
                  {!prod.isSystemDefault && (
                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => handleDelete(prod)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            iconName="list-outline"
            title="No Schemes in Filter"
            description="No loan products match the selected category filter."
          />
        )}
      </View>

      {/* Reset to Defaults */}
      <View style={styles.resetWrap}>
        <TouchableOpacity onPress={handleResetDefaults} style={styles.resetBtn}>
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.resetText}>Restore Senthur Finance Default Schemes</Text>
        </TouchableOpacity>
      </View>

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                {editingProduct ? 'Edit Loan Scheme' : 'Add New Loan Scheme'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Input
                label="Scheme Name *"
                placeholder="e.g. Gold Loan, Bike RC Book Loan"
                value={name}
                onChangeText={setName}
              />

              <SelectModal
                label="Category *"
                selectedValue={category}
                onSelect={(val) => setCategory(val as any)}
                options={[
                  { label: 'Gold Loan (Jewel)', value: 'Gold', icon: 'diamond-outline' },
                  { label: 'Vehicle RC Book', value: 'Vehicle', icon: 'car-outline' },
                  { label: 'Property Title Deed', value: 'Property', icon: 'home-outline' },
                  { label: 'Monthly Hand Loan', value: 'Monthly', icon: 'cash-outline' },
                  { label: 'Weekly Micro Loan', value: 'Weekly', icon: 'calendar-outline' },
                  { label: 'Daily Thandal', value: 'Daily', icon: 'today-outline' },
                  { label: 'Business / Enterprise', value: 'Business', icon: 'briefcase-outline' },
                  { label: 'Personal Loan', value: 'Personal', icon: 'person-outline' },
                ]}
              />

              <Input
                label="Scheme Description"
                placeholder="Key conditions and notes for lender"
                value={description}
                onChangeText={setDescription}
              />

              {/* Interest Type & Rates */}
              <SelectModal
                label="Interest Calculation Scheme *"
                selectedValue={interestType}
                onSelect={(val) => setInterestType(val as any)}
                options={[
                  { label: 'Simple Interest', value: 'SIMPLE', subtitle: 'P × R × T on principal' },
                  { label: 'Reducing Balance EMI', value: 'REDUCING_BALANCE', subtitle: 'Standard periodic reducing balance' },
                  { label: 'Flat Rate', value: 'FLAT', subtitle: 'Equal interest per installment on initial principal' },
                  { label: 'Interest Only (Bullet Principal)', value: 'INTEREST_ONLY', subtitle: 'Periodic interest, principal at end' },
                  { label: 'Zero Interest', value: 'ZERO_INTEREST', subtitle: 'Principal split without interest' },
                ]}
              />

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Input
                    label="Default Rate (%) *"
                    placeholder="2.0"
                    keyboardType="numeric"
                    value={defaultRate}
                    onChangeText={setDefaultRate}
                  />
                </View>
                <View style={styles.formCol}>
                  <SelectModal
                    label="Rate Period"
                    selectedValue={ratePeriod}
                    onSelect={(val) => setRatePeriod(val as any)}
                    options={[
                      { label: 'Per Month (p.m.)', value: 'PER_MONTH' },
                      { label: 'Per Annum / Year (p.a.)', value: 'PER_YEAR' },
                    ]}
                  />
                </View>
              </View>

              {/* Repayment & Tenure */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <SelectModal
                    label="Repayment Frequency"
                    selectedValue={repaymentFrequency}
                    onSelect={(val) => setRepaymentFrequency(val as any)}
                    options={[
                      { label: 'Daily', value: 'DAILY' },
                      { label: 'Weekly', value: 'WEEKLY' },
                      { label: 'Bi-Weekly', value: 'BIWEEKLY' },
                      { label: 'Monthly', value: 'MONTHLY' },
                      { label: 'Bullet at End', value: 'BULLET' },
                    ]}
                  />
                </View>
                <View style={styles.formCol}>
                  <Input
                    label="Default Tenure"
                    placeholder="12"
                    keyboardType="numeric"
                    value={tenureValue}
                    onChangeText={setTenureValue}
                  />
                </View>
              </View>

              {/* Collateral & Penalties */}
              <SelectModal
                label="Collateral Type Required"
                selectedValue={collateralType}
                onSelect={(val) => setCollateralType(val as any)}
                options={[
                  { label: 'Gold Jewelry', value: 'Gold' },
                  { label: 'Vehicle (Bike/Car RC)', value: 'Vehicle' },
                  { label: 'Property Title / Land', value: 'Property' },
                  { label: 'Promissory Note (DPN)', value: 'Promissory' },
                  { label: 'Security Cheque', value: 'Cheque' },
                  { label: 'None (Unsecured)', value: 'None' },
                  { label: 'Other Collateral', value: 'Other' },
                ]}
              />

              {/* Required Documents Checklist */}
              <View style={styles.docInputWrap}>
                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>REQUIRED DOCUMENTS & PROOFS</Text>
                <View style={styles.docAddRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      placeholder="e.g. Original RC Book, Gold Slip"
                      value={docInput}
                      onChangeText={setDocInput}
                    />
                  </View>
                  <PillButton
                    title="Add"
                    onPress={handleAddDoc}
                    size="sm"
                    variant="secondary"
                    style={{ marginBottom: 16, marginLeft: 8 }}
                  />
                </View>

                <View style={styles.tagChips}>
                  {requiredDocs.map((doc, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.removableChip, { backgroundColor: colors.surfaceMuted }]}
                      onPress={() => handleRemoveDoc(doc)}
                    >
                      <Text style={[styles.chipText, { color: colors.ink }]}>{doc}</Text>
                      <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Concession & Grace */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Input
                    label="Grace Days"
                    placeholder="3"
                    keyboardType="numeric"
                    value={graceDays}
                    onChangeText={setGraceDays}
                  />
                </View>
                <View style={styles.formCol}>
                  <Input
                    label="Max Concession (%)"
                    placeholder="10"
                    keyboardType="numeric"
                    value={maxConcession}
                    onChangeText={setMaxConcession}
                  />
                </View>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <PillButton
                title={editingProduct ? 'Save Scheme Updates' : 'Create Loan Scheme'}
                onPress={handleSave}
                variant="primary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    marginVertical: 10,
  },
  addBtn: {
    marginBottom: 8,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  productsList: {
    gap: 14,
    marginBottom: 20,
  },
  productCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  productDesc: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  schemeSpecsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  specBox: {
    flex: 1,
  },
  specLabel: {
    ...typography.label,
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  specValue: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  specValueAmount: {
    fontFamily: typography.fontAmount,
    fontSize: 13,
    color: colors.primaryDark,
  },
  docsSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 10,
  },
  docsHeader: {
    ...typography.label,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  docTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  docTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  docTagText: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.primaryDark,
    fontSize: 11,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
  },
  concessionNote: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.success,
    fontSize: 11,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  iconActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.primaryDark,
  },
  resetWrap: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  resetText: {
    ...typography.captionMedium,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
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
  modalScroll: {
    maxHeight: 460,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
  },
  subLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  docInputWrap: {
    marginBottom: 16,
  },
  docAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  removableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    color: colors.ink,
  },
  modalFooter: {
    marginTop: 16,
  },
});
