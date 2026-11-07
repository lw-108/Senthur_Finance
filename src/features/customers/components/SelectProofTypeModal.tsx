import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/useThemeStore';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { IdProofType } from '../types';
import { PROOF_CATALOG, ProofOptionItem } from '../proofCatalog';

export { PROOF_CATALOG, ProofOptionItem };

interface SelectProofTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectProof: (type: IdProofType) => void;
  existingTypes?: IdProofType[];
  title?: string;
  subtitle?: string;
}

export function SelectProofTypeModal({
  visible,
  onClose,
  onSelectProof,
  existingTypes = [],
  title = 'Which proof do you want to select and upload next?',
  subtitle = 'Choose the ID or address document you want to record and save to Supabase.',
}: SelectProofTypeModalProps) {
  const { colors: dynamicColors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: dynamicColors.surface,
                  borderColor: dynamicColors.border,
                },
                shadows.floating,
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View
                    style={[
                      styles.headerIconWrap,
                      { backgroundColor: dynamicColors.primarySoft },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={22}
                      color={dynamicColors.primaryDark}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.title,
                        { color: dynamicColors.headingPrimary || dynamicColors.ink },
                      ]}
                    >
                      {title}
                    </Text>
                    <Text
                      style={[
                        styles.subtitle,
                        { color: dynamicColors.textSecondary },
                      ]}
                    >
                      {subtitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={[
                      styles.closeBtn,
                      { backgroundColor: isDark ? '#2D3748' : '#F1F5F9' },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Close proof picker"
                  >
                    <Ionicons name="close" size={20} color={dynamicColors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Proofs List */}
              <ScrollView
                style={styles.optionsList}
                contentContainerStyle={styles.optionsListContent}
                showsVerticalScrollIndicator={false}
              >
                {PROOF_CATALOG.map((proof) => {
                  const alreadyCount = existingTypes.filter((t) => t === proof.type).length;
                  const isAlreadyAdded = alreadyCount > 0;

                  return (
                    <TouchableOpacity
                      key={proof.type}
                      activeOpacity={0.75}
                      onPress={() => {
                        onSelectProof(proof.type);
                        onClose();
                      }}
                      style={[
                        styles.optionItem,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isAlreadyAdded
                            ? (isDark ? '#334155' : '#E2E8F0')
                            : (isDark ? '#334155' : dynamicColors.primaryBorder),
                        },
                      ]}
                    >
                      {/* Left Icon */}
                      <View
                        style={[
                          styles.optionIconWrap,
                          {
                            backgroundColor: isDark
                              ? `${dynamicColors.primary}20`
                              : dynamicColors.primarySoft,
                          },
                        ]}
                      >
                        <Ionicons
                          name={proof.icon as any}
                          size={22}
                          color={dynamicColors.primaryDark}
                        />
                      </View>

                      {/* Details */}
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <View style={styles.optionTitleRow}>
                          <Text
                            style={[
                              styles.optionTitle,
                              { color: dynamicColors.headingPrimary || dynamicColors.ink },
                            ]}
                          >
                            {proof.title}
                          </Text>
                          {isAlreadyAdded && (
                            <View
                              style={[
                                styles.badgeAdded,
                                {
                                  backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
                                  borderColor: isDark ? '#3B82F6' : '#93C5FD',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeAddedText,
                                  { color: dynamicColors.primaryDark },
                                ]}
                              >
                                {alreadyCount > 1 ? `${alreadyCount} Added` : 'Added'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.optionTagline,
                            { color: dynamicColors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {proof.tagline}
                        </Text>
                        <Text
                          style={[
                            styles.optionHint,
                            { color: dynamicColors.textTertiary },
                          ]}
                          numberOfLines={1}
                        >
                          Format: {proof.numberHint}
                        </Text>
                      </View>

                      {/* Right Action Arrow */}
                      <View style={styles.optionRightArrow}>
                        <Ionicons
                          name="add-circle"
                          size={22}
                          color={dynamicColors.primary}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Footer Cancel */}
              <View style={[styles.footer, { borderTopColor: dynamicColors.border }]}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor: isDark ? '#334155' : '#F1F5F9',
                      borderColor: dynamicColors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelBtnText,
                      { color: dynamicColors.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: radii.card + 4,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    flexGrow: 1,
    flexShrink: 1,
  },
  optionsListContent: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radii.sm + 4,
    borderWidth: 1,
    gap: 12,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontFamily: typography.fontHeadline,
    fontSize: 14,
    fontWeight: '700',
  },
  badgeAdded: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeAddedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  optionTagline: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    marginTop: 2,
  },
  optionHint: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    marginTop: 2,
  },
  optionRightArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: radii.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: typography.fontHeadline,
    fontSize: 13,
    fontWeight: '700',
  },
});