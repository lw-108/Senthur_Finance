import React, { useState } from 'react';
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
import { Input } from '@/components/ui';

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (contact: { name: string; phone: string }) => void;
}

interface ContactItem {
  id?: string;
  name?: string;
  phoneNumbers?: { number?: string }[];
}

export function ContactPickerModal({
  visible,
  onClose,
  onSelectContact,
}: ContactPickerModalProps) {
  const { colors: dynamicColors, isDark } = useTheme();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const isWeb = Platform.OS === 'web';

  const loadContacts = async () => {
    if (isWeb) {
      setPermissionDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPermissionDenied(false);

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
          sort: Contacts.SortTypes.FirstName,
        });

        if (data && data.length > 0) {
          // Filter to only contacts with phone numbers
          const withPhones = data.filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0);
          setContacts(withPhones);
        } else {
          setContacts([]);
        }
      } else {
        setPermissionDenied(true);
      }
    } catch {
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (contacts.length === 0) {
      loadContacts();
    }
  };

  const filtered = contacts.filter((c) => {
    const name = c.name?.toLowerCase() || '';
    const phone = c.phoneNumbers?.[0]?.number || '';
    const s = search.toLowerCase();
    return name.includes(s) || phone.includes(s);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onShow={handleOpen}
      onRequestClose={onClose}
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
                <Ionicons name="person-add-outline" size={18} color={dynamicColors.primary} />
              </View>

              <View style={styles.headerTextCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: dynamicColors.ink }]}>
                    Import from Contacts
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
                  Auto-fill borrower details from address book
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
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

          {/* Search Input */}
          <Input
            placeholder="Search contacts by name or phone..."
            leadingIcon="search-outline"
            trailingIcon={search ? 'close-circle' : undefined}
            onTrailingIconPress={() => setSearch('')}
            value={search}
            onChangeText={setSearch}
            containerStyle={styles.searchWrap}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {/* Body Content */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={dynamicColors.primary} size="large" />
              <Text style={[styles.loadingText, { color: dynamicColors.textSecondary }]}>
                Reading phone contacts...
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
                {isWeb ? 'Mobile Device Feature' : 'Contacts Permission Required'}
              </Text>
              <Text style={[styles.stateDesc, { color: dynamicColors.textSecondary }]}>
                {isWeb
                  ? 'Address book sync is available on iOS and Android devices. On web desktop, please enter borrower details directly in the New Borrower form.'
                  : 'Grant contacts permission to quickly import borrower names and phone numbers.'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.permissionBtn,
                  {
                    backgroundColor: dynamicColors.primary,
                  },
                ]}
                onPress={isWeb ? onClose : loadContacts}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isWeb ? 'checkmark-outline' : 'refresh-outline'}
                  size={17}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.permissionBtnText}>
                  {isWeb ? 'Understood' : 'Allow Access'}
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
                {search ? 'No Matching Contacts' : 'No Contacts Available'}
              </Text>
              <Text style={[styles.stateDesc, { color: dynamicColors.textSecondary }]}>
                {search
                  ? `No contacts match "${search}". Try searching another name or number.`
                  : 'Your phone address book has no contacts with phone numbers.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const primaryPhone = item.phoneNumbers?.[0]?.number || '';
                const firstLetter = (item.name?.[0] || 'C').toUpperCase();

                return (
                  <TouchableOpacity
                    style={[
                      styles.contactRow,
                      {
                        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.07)' : dynamicColors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelectContact({
                        name: item.name || '',
                        phone: primaryPhone.replace(/\D/g, '').slice(-10),
                      });
                      onClose();
                    }}
                  >
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

                    <View style={styles.info}>
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
                        {item.name || 'Unnamed Contact'}
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
                        {primaryPhone}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.actionPill,
                        {
                          backgroundColor: isDark ? `${dynamicColors.primary}18` : dynamicColors.primarySoft,
                          borderColor: isDark ? `${dynamicColors.primary}40` : dynamicColors.primaryBorder,
                        },
                      ]}
                    >
                      <Ionicons name="person-add-outline" size={16} color={dynamicColors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
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
    maxHeight: '88%',
    minHeight: 460,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  searchWrap: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    ...typography.bodyMedium,
    fontSize: 15,
  },
  phone: {
    ...typography.caption,
    fontSize: 13,
    marginTop: 3,
  },
  actionPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
