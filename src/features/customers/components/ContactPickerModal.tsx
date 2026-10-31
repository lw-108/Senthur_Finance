import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/useThemeStore';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { Input, useToast } from '@/components/ui';
import { useBatchMergeContacts } from '@/features/customers/hooks';

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (contact: { name: string; phone: string }) => void;
}

interface ParsedContact {
  id: string;
  name: string;
  phone: string;
  displayPhone: string;
}

export function ContactPickerModal({
  visible,
  onClose,
  onSelectContact,
}: ContactPickerModalProps) {
  const { colors: dynamicColors, isDark } = useTheme();
  const { showSuccess, showError } = useToast();
  const batchMergeMutation = useBatchMergeContacts();

  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, ParsedContact>>(new Map());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const isWeb = Platform.OS === 'web';

  const cleanPhoneDigits = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return digits;
  };

  const loadContacts = useCallback(async () => {
    if (isWeb) {
      setPermissionDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPermissionDenied(false);

    try {
      let { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') {
        const req = await Contacts.requestPermissionsAsync();
        status = req.status;
      }

      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Name,
            Contacts.Fields.FirstName,
            Contacts.Fields.LastName,
          ],
          sort: Contacts.SortTypes.FirstName,
        });

        if (data && data.length > 0) {
          const parsedList: ParsedContact[] = [];
          const seenPhones = new Set<string>();

          for (const item of data) {
            if (!item.phoneNumbers || item.phoneNumbers.length === 0) continue;

            const name = (
              item.name?.trim() ||
              [item.firstName, item.lastName].filter(Boolean).join(' ').trim() ||
              (item as any).company?.trim() ||
              'Unknown Contact'
            );

            for (const p of item.phoneNumbers) {
              const rawNum = p.number?.trim() || '';
              const digits10 = cleanPhoneDigits(rawNum);

              if (digits10.length === 10 && !seenPhones.has(digits10)) {
                seenPhones.add(digits10);
                parsedList.push({
                  id: item.id ? `${item.id}-${digits10}` : `${name}-${digits10}`,
                  name,
                  phone: digits10,
                  displayPhone: `+91 ${digits10.slice(0, 5)} ${digits10.slice(5)}`,
                });
                break; // One primary number per contact
              }
            }
          }

          setContacts(parsedList);
        } else {
          setContacts([]);
        }
      } else {
        setPermissionDenied(true);
      }
    } catch (e) {
      console.warn('[ContactPicker] Error loading contacts:', e);
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  }, [isWeb]);

  const handleClose = () => {
    setSelectedMap(new Map());
    setSearch('');
    onClose();
  };

  // Automatically trigger contact loading whenever the modal becomes visible
  useEffect(() => {
    let active = true;
    if (visible && contacts.length === 0) {
      setTimeout(() => {
        if (active) {
          loadContacts();
        }
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [visible, contacts.length, loadContacts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const s = search.toLowerCase().trim();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(s) || c.phone.includes(s)
    );
  }, [contacts, search]);

  const toggleSelect = (item: ParsedContact) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMap.size === filtered.length) {
      setSelectedMap(new Map());
    } else {
      const next = new Map<string, ParsedContact>();
      filtered.forEach((c) => next.set(c.id, c));
      setSelectedMap(next);
    }
  };

  // Quick single-save as borrower
  const handleQuickSaveSingle = async (item: ParsedContact) => {
    try {
      await batchMergeMutation.mutateAsync([{ name: item.name, phone: item.phone }]);
      showSuccess(`Saved "${item.name}" to your borrowers list!`);
      onClose();
    } catch {
      showError('Failed to save contact as borrower');
    }
  };

  // Batch merge selected contacts
  const handleBatchMerge = async () => {
    const list = Array.from(selectedMap.values()).map((c) => ({
      name: c.name,
      phone: c.phone,
    }));
    if (list.length === 0) return;

    try {
      const res = await batchMergeMutation.mutateAsync(list);
      showSuccess(`Merged ${res.added + res.updated} contact${list.length !== 1 ? 's' : ''} into your borrowers list!`);
      setSelectedMap(new Map());
      onClose();
    } catch {
      showError('Failed to merge contacts');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.overlay,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(17, 17, 17, 0.45)',
          },
        ]}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: isDark ? dynamicColors.border : 'transparent',
              borderTopWidth: isDark ? 1 : 0,
            },
          ]}
        >
          {/* Top Sheet Drag Pill */}
          <View
            style={[
              styles.dragHandle,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)',
              },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View
                style={[
                  styles.headerIconBadge,
                  {
                    backgroundColor: isDark ? `${dynamicColors.primary}20` : dynamicColors.primarySoft,
                    borderColor: isDark ? `${dynamicColors.primary}45` : dynamicColors.primaryBorder,
                  },
                ]}
              >
                <Ionicons name="people-outline" size={18} color={dynamicColors.primary} />
              </View>

              <View style={styles.headerTextCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: dynamicColors.ink }]}>
                    Merge Device Contacts
                  </Text>
                  {contacts.length > 0 && (
                    <View
                      style={[
                        styles.countPill,
                        {
                          backgroundColor: isDark ? `${dynamicColors.primary}20` : dynamicColors.primarySoft,
                          borderColor: isDark ? `${dynamicColors.primary}40` : dynamicColors.primaryBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          {
                            color: dynamicColors.primary,
                            fontFamily: typography.fontPolymath,
                          },
                        ]}
                      >
                        {filtered.length}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.subtitle, { color: dynamicColors.textSecondary }]}>
                  Select contacts to save directly to borrowers
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : dynamicColors.surfaceMuted,
                  borderColor: isDark ? dynamicColors.border : 'transparent',
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={dynamicColors.ink} />
            </TouchableOpacity>
          </View>

          {/* Search Input & Select All Toolbar */}
          <View style={styles.toolbarRow}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="Search name or 10-digit number..."
                leadingIcon="search-outline"
                trailingIcon={search ? 'close-circle' : undefined}
                onTrailingIconPress={() => setSearch('')}
                value={search}
                onChangeText={setSearch}
                containerStyle={styles.searchWrap}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {filtered.length > 0 && (
              <TouchableOpacity
                onPress={toggleSelectAll}
                style={[
                  styles.selectAllPill,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : dynamicColors.surfaceMuted,
                    borderColor: dynamicColors.border,
                  },
                ]}
              >
                <Text style={[styles.selectAllText, { color: dynamicColors.primary }]}>
                  {selectedMap.size === filtered.length ? 'Deselect' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={dynamicColors.primary} size="large" />
              <Text style={[styles.loadingText, { color: dynamicColors.textSecondary }]}>
                Loading phone contacts...
              </Text>
            </View>
          ) : permissionDenied ? (
            <View style={styles.centerBox}>
              <View
                style={[
                  styles.stateIconCircle,
                  {
                    backgroundColor: isWeb
                      ? (isDark ? `${dynamicColors.primary}20` : dynamicColors.primarySoft)
                      : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2'),
                    borderColor: isWeb
                      ? (isDark ? `${dynamicColors.primary}45` : dynamicColors.primaryBorder)
                      : (isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5'),
                  },
                ]}
              >
                <Ionicons
                  name={isWeb ? 'phone-portrait-outline' : 'lock-closed-outline'}
                  size={32}
                  color={isWeb ? dynamicColors.primary : dynamicColors.danger}
                />
              </View>
              <Text style={[styles.stateTitle, { color: dynamicColors.ink }]}>
                {isWeb ? 'Mobile Device Feature' : 'Contacts Permission Needed'}
              </Text>
              <Text style={[styles.stateDesc, { color: dynamicColors.textSecondary }]}>
                {isWeb
                  ? 'Contact merging is available on Android and iOS devices. On web desktop, please enter borrower details manually.'
                  : 'Please allow Senthur Finance to read your contacts so you can quickly save borrowers.'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.permissionBtn,
                  {
                    backgroundColor: dynamicColors.primary,
                  },
                ]}
                onPress={isWeb ? handleClose : loadContacts}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isWeb ? 'checkmark-outline' : 'refresh-outline'}
                  size={17}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.permissionBtnText}>
                  {isWeb ? 'Close' : 'Allow Access'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centerBox}>
              <View
                style={[
                  styles.stateIconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : dynamicColors.surfaceMuted,
                    borderColor: isDark ? dynamicColors.border : 'transparent',
                  },
                ]}
              >
                <Ionicons name="person-outline" size={32} color={dynamicColors.textTertiary} />
              </View>
              <Text style={[styles.stateTitle, { color: dynamicColors.ink }]}>
                {search ? 'No Matching Contacts' : 'No Contacts Found'}
              </Text>
              <Text style={[styles.stateDesc, { color: dynamicColors.textSecondary }]}>
                {search
                  ? `No contacts match "${search}". Try searching another name or number.`
                  : 'Your phone address book has no contacts with 10-digit mobile numbers.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = selectedMap.has(item.id);
                const firstLetter = (item.name[0] || 'C').toUpperCase();

                return (
                  <View
                    style={[
                      styles.contactRow,
                      {
                        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.07)' : dynamicColors.border,
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF')
                          : 'transparent',
                      },
                    ]}
                  >
                    {/* Select Checkbox */}
                    <TouchableOpacity
                      onPress={() => toggleSelect(item)}
                      style={styles.checkboxTouch}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? dynamicColors.primary : dynamicColors.textTertiary}
                      />
                    </TouchableOpacity>

                    {/* Contact Avatar */}
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: isDark ? `${dynamicColors.primary}20` : dynamicColors.primarySoft,
                          borderColor: isDark ? `${dynamicColors.primary}45` : dynamicColors.primaryBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          {
                            color: dynamicColors.primary,
                            fontFamily: typography.fontPolymath,
                          },
                        ]}
                      >
                        {firstLetter}
                      </Text>
                    </View>

                    {/* Info */}
                    <TouchableOpacity
                      style={styles.info}
                      onPress={() => toggleSelect(item)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.name,
                          {
                            color: dynamicColors.ink,
                            fontFamily: typography.fontHeadline,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.phone,
                          {
                            color: dynamicColors.textSecondary,
                            fontFamily: typography.fontPolymath,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.displayPhone}
                      </Text>
                    </TouchableOpacity>

                    {/* Action buttons */}
                    <View style={styles.rowActions}>
                      {/* 1-Tap Quick Save */}
                      <TouchableOpacity
                        style={[
                          styles.quickSaveBtn,
                          {
                            backgroundColor: dynamicColors.primary,
                          },
                        ]}
                        onPress={() => handleQuickSaveSingle(item)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        <Text style={styles.quickSaveBtnText}>Save</Text>
                      </TouchableOpacity>

                      {/* Open Full Wizard */}
                      <TouchableOpacity
                        style={[
                          styles.editIconBtn,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : dynamicColors.surfaceMuted,
                            borderColor: dynamicColors.border,
                          },
                        ]}
                        onPress={() => {
                          onSelectContact({
                            name: item.name,
                            phone: item.phone,
                          });
                          onClose();
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Edit full details"
                      >
                        <Ionicons name="create-outline" size={15} color={dynamicColors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Sticky Bottom Action Bar when items selected */}
          {selectedMap.size > 0 && (
            <View
              style={[
                styles.bottomBar,
                {
                  backgroundColor: dynamicColors.surface,
                  borderTopColor: dynamicColors.border,
                },
              ]}
            >
              <View>
                <Text style={[styles.bottomBarCount, { color: dynamicColors.ink }]}>
                  {selectedMap.size} Selected
                </Text>
                <Text style={[styles.bottomBarSub, { color: dynamicColors.textSecondary }]}>
                  Ready to add to borrowers
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.mergeBatchBtn,
                  {
                    backgroundColor: dynamicColors.primary,
                  },
                ]}
                onPress={handleBatchMerge}
                disabled={batchMergeMutation.isPending}
                activeOpacity={0.85}
              >
                {batchMergeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#FFFFFF" />
                    <Text style={styles.mergeBatchBtnText}>
                      Save {selectedMap.size} to Borrowers
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    maxHeight: '90%',
    minHeight: 480,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    fontSize: 17,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchWrap: {
    marginBottom: 0,
  },
  selectAllPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    ...typography.caption,
    marginTop: 12,
    fontSize: 13,
  },
  stateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  stateDesc: {
    ...typography.caption,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderBottomWidth: 1,
  },
  checkboxTouch: {
    paddingRight: 10,
    paddingLeft: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    ...typography.bodyMedium,
    fontSize: 14,
  },
  phone: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 6,
  },
  bottomBarCount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontHeadline,
  },
  bottomBarSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  mergeBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  mergeBatchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
