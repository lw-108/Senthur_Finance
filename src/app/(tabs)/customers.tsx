import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Header,
  DisplayTitle,
  Input,
  Chip,
  ListRow,
  FAB,
  Avatar,
  EmptyState,
  SkeletonLoader,
  Badge,
  useToast,
} from '@/components/ui';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';
import { useCustomers, useSeedCustomers } from '@/features/customers/hooks';
import { Customer } from '@/features/customers/types';
import { formatIndianCurrency } from '@/utils/formatters';
import { openWhatsApp } from '@/utils/whatsapp';
import { ContactPickerModal } from '@/features/customers/components/ContactPickerModal';
import { useCustomerWizardDraft } from '@/features/customers/CustomerWizardDraft';

type FilterType = 'ALL' | 'Active' | 'OVERDUE_ONLY' | 'HIGH_VALUE';
type SortOption = 'name' | 'outstanding' | 'overdue' | 'score';

export default function CustomersScreen() {
  const router = useRouter();
  const { colors: dynamicColors, isDark } = useTheme();
  const { showSuccess } = useToast();

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [contactPickerOpen, setContactPickerOpen] = useState(false);

  const { data: rawCustomers, isLoading, refetch, isRefetching } = useCustomers({
    sortBy: 'name',
  });

  const seedMutation = useSeedCustomers();
  const { setField, resetDraft } = useCustomerWizardDraft();

  const handleSelectPhoneContact = (contact: { name: string; phone: string }) => {
    resetDraft();
    setField('fullName', contact.name);
    setField('phone', contact.phone);
    router.push('/customers/new' as any);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    openWhatsApp(phone, `Hello ${name}, greetings from Senthur Finance.`);
  };

  const handleLoadDemoData = async () => {
    await seedMutation.mutateAsync();
    showSuccess('Loaded 25 demo borrowers with active loans & balances');
    refetch();
  };

  // Compute live aggregates across all customers
  const aggregates = useMemo(() => {
    const list = rawCustomers || [];
    let totalOutstandingPaise = 0;
    let totalOverduePaise = 0;
    let overdueCount = 0;
    let activeLoansCount = 0;
    let highValueCount = 0;
    let activeCustomersCount = 0;

    list.forEach((c) => {
      totalOutstandingPaise += c.totals?.totalOutstanding || 0;
      activeLoansCount += c.totals?.activeLoans || 0;
      if ((c.totals?.overdueAmount || 0) > 0) {
        totalOverduePaise += c.totals.overdueAmount;
        overdueCount += 1;
      }
      if (c.status === 'Active') {
        activeCustomersCount += 1;
      }
      if (c.tags?.includes('High Value') || (c.totals?.totalOutstanding || 0) > 20000000) {
        highValueCount += 1;
      }
    });

    return {
      totalCount: list.length,
      activeCustomersCount,
      overdueCount,
      highValueCount,
      activeLoansCount,
      totalOutstandingFormatted: formatIndianCurrency(totalOutstandingPaise, { isMinorUnit: true }).formatted,
      totalOverdueFormatted: formatIndianCurrency(totalOverduePaise, { isMinorUnit: true }).formatted,
      hasOverdue: overdueCount > 0,
    };
  }, [rawCustomers]);

  // Filter and sort customer records locally
  const filteredCustomers = useMemo(() => {
    let list = (rawCustomers || []).filter((c) => !c.isDeleted);

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.address.city.toLowerCase().includes(q) ||
          (c.occupation && c.occupation.toLowerCase().includes(q))
      );
    }

    // Apply category filter
    if (selectedFilter === 'Active') {
      list = list.filter((c) => c.status === 'Active');
    } else if (selectedFilter === 'OVERDUE_ONLY') {
      list = list.filter((c) => (c.totals?.overdueAmount || 0) > 0);
    } else if (selectedFilter === 'HIGH_VALUE') {
      list = list.filter(
        (c) => c.tags?.includes('High Value') || (c.totals?.totalOutstanding || 0) > 20000000
      );
    }

    // Apply sorting
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'outstanding':
          return (b.totals?.totalOutstanding || 0) - (a.totals?.totalOutstanding || 0);
        case 'overdue':
          return (b.totals?.overdueAmount || 0) - (a.totals?.overdueAmount || 0);
        case 'score':
          return (b.creditScoreInternal || 50) - (a.creditScoreInternal || 50);
        case 'name':
        default:
          return a.fullName.localeCompare(b.fullName);
      }
    });

    return list;
  }, [rawCustomers, search, selectedFilter, sortBy]);

  // List header component with KPI metric cards & active result counts
  const renderListHeader = () => {
    if (!rawCustomers || rawCustomers.length === 0) return null;

    return (
      <View style={styles.listHeaderWrapper}>
        {/* KPI Mini-Dashboard */}
        <View
          style={[
            styles.kpiContainer,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: dynamicColors.boxBorder,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.kpiMetric}>
            <Text style={[styles.kpiLabel, { color: dynamicColors.textSecondary }]}>Borrowers</Text>
            <Text style={[styles.kpiValue, { color: dynamicColors.headingPrimary }]}>
              {aggregates.totalCount}
            </Text>
            <Text style={[styles.kpiSub, { color: dynamicColors.textTertiary }]}>
              {aggregates.activeLoansCount} active loans
            </Text>
          </View>

          <View style={[styles.kpiDivider, { backgroundColor: dynamicColors.border }]} />

          <View style={styles.kpiMetric}>
            <Text style={[styles.kpiLabel, { color: dynamicColors.textSecondary }]}>Portfolio Balance</Text>
            <Text style={[styles.kpiValue, { color: dynamicColors.headingPrimary }]}>
              {aggregates.totalOutstandingFormatted}
            </Text>
            <Text style={[styles.kpiSub, { color: dynamicColors.textTertiary }]}>
              Outstanding
            </Text>
          </View>

          {aggregates.hasOverdue && (
            <>
              <View style={[styles.kpiDivider, { backgroundColor: dynamicColors.border }]} />
              <View style={styles.kpiMetric}>
                <Text style={[styles.kpiLabel, { color: dynamicColors.danger }]}>Overdue</Text>
                <Text style={[styles.kpiValue, { color: dynamicColors.danger }]}>
                  {aggregates.totalOverdueFormatted}
                </Text>
                <Text style={[styles.kpiSub, { color: dynamicColors.danger }]}>
                  {aggregates.overdueCount} accounts
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Results count & current sort indicator */}
        <View style={styles.resultsInfoRow}>
          <Text style={[styles.resultsCountText, { color: dynamicColors.textSecondary }]}>
            Showing <Text style={{ color: dynamicColors.ink, fontWeight: '700' }}>{filteredCustomers.length}</Text> of {rawCustomers.length} borrowers
          </Text>

          {/* Sort selector pill */}
          <View style={styles.sortOptionsRow}>
            <TouchableOpacity
              onPress={() => {
                const nextSort: Record<SortOption, SortOption> = {
                  name: 'outstanding',
                  outstanding: 'overdue',
                  overdue: 'score',
                  score: 'name',
                };
                setSortBy(nextSort[sortBy]);
              }}
              style={[
                styles.sortPill,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : dynamicColors.surfaceMuted,
                  borderColor: dynamicColors.border,
                },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="swap-vertical" size={13} color={dynamicColors.primary} />
              <Text style={[styles.sortPillText, { color: dynamicColors.ink }]}>
                {sortBy === 'name' && 'A → Z'}
                {sortBy === 'outstanding' && 'Highest Balance'}
                {sortBy === 'overdue' && 'Most Overdue'}
                {sortBy === 'score' && 'Credit Score'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render individual borrower card
  const renderCustomerItem = ({ item }: { item: Customer }) => {
    const hasOverdue = (item.totals?.overdueAmount || 0) > 0;
    const outstandingFormatted = formatIndianCurrency(item.totals?.totalOutstanding || 0, {
      isMinorUnit: true,
    }).formatted;
    const overdueFormatted = formatIndianCurrency(item.totals?.overdueAmount || 0, {
      isMinorUnit: true,
    }).formatted;

    return (
      <View
        style={[
          styles.customerCard,
          shadows.soft,
          {
            backgroundColor: dynamicColors.surface,
            borderColor: hasOverdue ? `${dynamicColors.danger}40` : dynamicColors.boxBorder,
            borderWidth: 1,
          },
        ]}
      >
        <ListRow
          title={item.fullName}
          subtitle={`+91 ${item.phone} • ${item.address.city}`}
          metaText={`${item.totals.activeLoans} Active Loan${item.totals.activeLoans !== 1 ? 's' : ''} • Score ${item.creditScoreInternal || 75}`}
          leftNode={
            <Avatar
              uri={item.photoUrl}
              name={item.fullName}
              size={46}
              borderColor={hasOverdue ? dynamicColors.danger : dynamicColors.primary}
              backgroundColor={hasOverdue ? dynamicColors.dangerLight : dynamicColors.primaryLight}
              textColor={hasOverdue ? dynamicColors.danger : dynamicColors.primaryDark}
              style={styles.avatarMargin}
            />
          }
          rightAmount={outstandingFormatted}
          rightAmountType={hasOverdue ? 'negative' : 'neutral'}
          rightSubtext={hasOverdue ? `OVERDUE ${overdueFormatted}` : 'Balance'}
          showChevron
          onPress={() => router.push(`/customers/${item.id}` as any)}
        />

        {/* Quick action bar at bottom of card */}
        <View
          style={[
            styles.quickBar,
            {
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.quickBarBtn}
            onPress={() => handleCall(item.phone)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="call-outline" size={15} color={dynamicColors.ink} />
            <Text style={[styles.quickBarText, { color: dynamicColors.ink }]}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBarBtn}
            onPress={() => handleWhatsApp(item.phone, item.fullName)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="logo-whatsapp" size={15} color={dynamicColors.success} />
            <Text style={[styles.quickBarText, { color: dynamicColors.success }]}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBarBtn}
            onPress={() => router.push(`/loans/new?customerId=${item.id}` as any)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add-circle-outline" size={15} color={dynamicColors.primary} />
            <Text style={[styles.quickBarText, { color: dynamicColors.primary }]}>New Loan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBarBtn}
            onPress={() => router.push(`/customers/${item.id}` as any)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="eye-outline" size={15} color={dynamicColors.textSecondary} />
            <Text style={[styles.quickBarText, { color: dynamicColors.textSecondary }]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render empty state with seed data & add buttons
  const renderEmptyState = () => {
    if (isLoading) return null;

    if (search.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <EmptyState
            iconName="search-outline"
            title="No Matching Borrowers"
            description={`No borrowers match "${search}". Try searching by phone number, city, or name.`}
            actionTitle="Clear Search"
            onAction={() => setSearch('')}
          />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          iconName="people-outline"
          title="No Borrowers Found"
          description="Add your first borrower, merge from phone contacts, or load realistic demo data to explore all features."
          actionTitle="Add New Customer"
          onAction={() => {
            resetDraft();
            router.push('/customers/new' as any);
          }}
        />

        <View style={styles.emptyActionsRow}>
          <TouchableOpacity
            style={[
              styles.emptyActionBtn,
              {
                backgroundColor: isDark ? `${dynamicColors.primary}18` : dynamicColors.primarySoft,
                borderColor: isDark ? `${dynamicColors.primary}40` : dynamicColors.primaryBorder,
              },
            ]}
            onPress={() => setContactPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={16} color={dynamicColors.primary} />
            <Text style={[styles.emptyActionBtnText, { color: dynamicColors.primary }]}>
              Merge from Contacts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.emptyActionBtn,
              {
                backgroundColor: isDark ? `${dynamicColors.success}18` : dynamicColors.successLight,
                borderColor: `${dynamicColors.success}40`,
              },
            ]}
            onPress={handleLoadDemoData}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles-outline" size={16} color={dynamicColors.success} />
            <Text style={[styles.emptyActionBtnText, { color: dynamicColors.success }]}>
              Load 25 Demo Borrowers
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Screen contentContainerStyle={styles.screenContainer}>
      {/* Top Header Bar */}
      <Header
        showSupportPill={false}
        rightAction={
          <View style={styles.topRightActions}>
            <TouchableOpacity
              onPress={() => router.push('/calculator' as any)}
              style={[
                styles.topNavBtn,
                {
                  backgroundColor: isDark ? `${dynamicColors.primary}18` : dynamicColors.primarySoft,
                  borderColor: isDark ? `${dynamicColors.primary}40` : dynamicColors.primaryBorder,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Open Financial Calculator"
            >
              <Ionicons name="calculator-outline" size={19} color={dynamicColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setContactPickerOpen(true)}
              style={[
                styles.topNavBtn,
                {
                  backgroundColor: isDark ? `${dynamicColors.primary}18` : dynamicColors.primarySoft,
                  borderColor: isDark ? `${dynamicColors.primary}40` : dynamicColors.primaryBorder,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Merge from phone contacts"
            >
              <Ionicons name="person-add-outline" size={19} color={dynamicColors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLoadDemoData}
              style={[
                styles.topNavBtn,
                {
                  backgroundColor: isDark ? `${dynamicColors.success}18` : dynamicColors.successLight,
                  borderColor: `${dynamicColors.success}40`,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Refresh demo borrowers"
            >
              <Ionicons name="refresh-outline" size={18} color={dynamicColors.success} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Screen Title & Subtitle */}
      <DisplayTitle
        title="Borrowers"
        subtitle="Manage customer KYC, loans & guarantees"
      />

      {/* Sticky Search Bar */}
      <Input
        placeholder="Search by name, phone, or city..."
        leadingIcon="search-outline"
        trailingIcon={search ? 'close-circle' : undefined}
        onTrailingIconPress={() => setSearch('')}
        value={search}
        onChangeText={setSearch}
        containerStyle={styles.searchBar}
      />

      {/* Sticky Filter Chips Row */}
      <View style={styles.filtersScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <Chip
            label="All"
            selected={selectedFilter === 'ALL'}
            count={aggregates.totalCount}
            onPress={() => setSelectedFilter('ALL')}
          />
          <Chip
            label="Active"
            selected={selectedFilter === 'Active'}
            count={aggregates.activeCustomersCount}
            onPress={() => setSelectedFilter('Active')}
          />
          <Chip
            label="Overdue Only"
            selected={selectedFilter === 'OVERDUE_ONLY'}
            count={aggregates.overdueCount}
            color={dynamicColors.danger}
            onPress={() => setSelectedFilter('OVERDUE_ONLY')}
          />
          <Chip
            label="High Value"
            selected={selectedFilter === 'HIGH_VALUE'}
            count={aggregates.highValueCount}
            color={dynamicColors.primary}
            onPress={() => setSelectedFilter('HIGH_VALUE')}
          />
        </ScrollView>
      </View>

      {/* Loading Skeleton */}
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonLoader height={80} style={styles.skeletonItem} />
          <SkeletonLoader height={80} style={styles.skeletonItem} />
          <SkeletonLoader height={80} style={styles.skeletonItem} />
          <SkeletonLoader height={80} style={styles.skeletonItem} />
        </View>
      ) : (
        /* Virtualized Scrollable Customer List */
        <FlatList
          style={styles.flatList}
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={dynamicColors.primary}
              colors={[dynamicColors.primary]}
            />
          }
          renderItem={renderCustomerItem}
        />
      )}

      {/* FAB: Floating Add Customer Button */}
      <FAB
        onPress={() => {
          resetDraft();
          router.push('/customers/new' as any);
        }}
        iconName="person-add"
        accessibilityLabel="Add Customer"
      />

      {/* Phone Contact Picker Modal */}
      <ContactPickerModal
        visible={contactPickerOpen}
        onClose={() => setContactPickerOpen(false)}
        onSelectContact={handleSelectPhoneContact}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    minHeight: 0,
  },
  searchBar: {
    marginBottom: 6,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScrollWrap: {
    marginBottom: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  flatList: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    flexGrow: 1,
  },
  cardSeparator: {
    height: 10,
  },
  listHeaderWrapper: {
    marginBottom: 10,
    gap: 8,
  },
  kpiContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  kpiMetric: {
    alignItems: 'center',
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.fontHeadline,
    marginBottom: 1,
  },
  kpiSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  kpiDivider: {
    width: 1,
    height: 28,
  },
  resultsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sortOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  customerCard: {
    borderRadius: radii.card,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },
  avatarMargin: {
    marginRight: 12,
  },
  quickBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
    justifyContent: 'space-around',
  },
  quickBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  quickBarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skeletonWrap: {
    gap: 12,
    marginTop: 10,
  },
  skeletonItem: {
    borderRadius: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: -4,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
