import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ViewStyle,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SelectModalProps<T = string> {
  label?: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function SelectModal<T = string>({
  label,
  required,
  placeholder = 'Select option',
  options,
  selectedValue,
  onSelect,
  error,
  hint,
  containerStyle,
  searchable,
  searchPlaceholder,
}: SelectModalProps<T>) {
  const { colors: dynamicColors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const isRequired = required || (label ? label.includes('*') : false);
  const cleanLabel = label ? label.replace(/\s*\*+$/, '') : '';

  const isSearchEnabled =
    searchable ??
    (options.length >= 4 ||
      cleanLabel.toLowerCase().includes('borrower') ||
      cleanLabel.toLowerCase().includes('customer') ||
      cleanLabel.toLowerCase().includes('loan'));

  // Reset search and expansion state whenever the modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsExpanded(false);
    }
  }, [isOpen]);

  const toggleExpand = (forceState?: boolean) => {
    if (Platform.OS !== 'web') {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
    }
    setIsExpanded((prev) => (forceState !== undefined ? forceState : !prev));
  };

  // PanResponder to allow swipe up/down or tap on the top pin handle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -20) {
          // Swiped up: fully expand
          toggleExpand(true);
        } else if (gesture.dy > 20) {
          // Swiped down: retract
          toggleExpand(false);
        } else {
          // Tap / click on pin: toggle
          toggleExpand();
        }
      },
    })
  ).current;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const labelMatch = opt.label?.toLowerCase().includes(q);
      const subtitleMatch = opt.subtitle?.toLowerCase().includes(q);
      return labelMatch || subtitleMatch;
    });
  }, [options, searchQuery]);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = (val: T) => {
    onSelect(val);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: dynamicColors.ink }]}>
          {cleanLabel}
          {isRequired && (
            <Text style={{ color: dynamicColors.danger, fontWeight: '700' }}> *</Text>
          )}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
        style={[
          styles.field,
          { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border },
          Boolean(error) && styles.fieldError,
        ]}
      >
        {selectedOption?.icon && (
          <Ionicons
            name={selectedOption.icon}
            size={18}
            color={dynamicColors.primaryDark}
            style={styles.leadingIcon}
          />
        )}
        <Text
          style={[
            styles.valueText,
            { color: selectedOption ? dynamicColors.ink : dynamicColors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={dynamicColors.textSecondary} />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: dynamicColors.textSecondary }]}>{hint}</Text>
      ) : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
            accessibilityLabel="Close dialog"
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidWrap}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.bottomSheet,
                isExpanded ? styles.bottomSheetExpanded : styles.bottomSheetRetracted,
                { backgroundColor: dynamicColors.surface },
              ]}
            >
              {/* TOP PIN CONTROLLER: User-only Expand & Retract */}
              <TouchableOpacity
                onPress={() => toggleExpand()}
                activeOpacity={0.7}
                style={styles.dragHandleContainer}
                accessibilityRole="button"
                accessibilityLabel={isExpanded ? 'Retract dialog' : 'Fully expand dialog'}
              >
                <View
                  style={[
                    styles.dragHandle,
                    {
                      backgroundColor: isExpanded
                        ? dynamicColors.primary
                        : dynamicColors.borderStrong,
                    },
                  ]}
                />
                <View style={styles.pinIndicatorRow}>
                </View>
              </TouchableOpacity>

              <View style={[styles.sheetHeader, { borderBottomColor: dynamicColors.border }]}>
                <Text style={[styles.sheetTitle, { color: dynamicColors.ink }]}>
                  {cleanLabel || 'Select'}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={24} color={dynamicColors.ink} />
                </TouchableOpacity>
              </View>

              {isSearchEnabled && (
                <View
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: dynamicColors.surfaceMuted,
                      borderColor: dynamicColors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={dynamicColors.textSecondary}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    ref={searchInputRef}
                    style={[
                      styles.searchInput,
                      { color: dynamicColors.ink },
                      Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
                    ]}
                    placeholder={
                      searchPlaceholder ||
                      `Search ${cleanLabel.toLowerCase() || 'options'}...`
                    }
                    placeholderTextColor={dynamicColors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={dynamicColors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => String(item.value)}
                style={styles.flatList}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelect(item.value)}
                      style={[
                        styles.optionRow,
                        isSelected && [
                          styles.optionSelected,
                          { backgroundColor: dynamicColors.primarySoft },
                        ],
                      ]}
                    >
                      <View style={styles.optionLeft}>
                        {item.icon && (
                          <Ionicons
                            name={item.icon}
                            size={20}
                            color={
                              isSelected
                                ? dynamicColors.primaryDark
                                : dynamicColors.textSecondary
                            }
                            style={styles.optionIcon}
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionLabel,
                              {
                                color: isSelected
                                  ? dynamicColors.primaryDark
                                  : dynamicColors.ink,
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                          {item.subtitle && (
                            <Text
                              style={[
                                styles.optionSubtitle,
                                { color: dynamicColors.textSecondary },
                              ]}
                            >
                              {item.subtitle}
                            </Text>
                          )}
                        </View>
                      </View>

                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={dynamicColors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptySearchWrap}>
                    <Ionicons
                      name="search-outline"
                      size={32}
                      color={dynamicColors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.emptySearchText,
                        { color: dynamicColors.textSecondary },
                      ]}
                    >
                      {searchQuery.trim()
                        ? `No options found matching "${searchQuery}"`
                        : 'No options available'}
                    </Text>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  fieldError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  leadingIcon: {
    marginRight: 10,
  },
  valueText: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.ink,
  },
  placeholderText: {
    color: colors.textTertiary,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  keyboardAvoidWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    paddingBottom: 24,
    width: '100%',
    ...(Platform.OS === 'web'
      ? ({ transition: 'height 0.28s cubic-bezier(0.4, 0, 0.2, 1)' } as any)
      : {}),
  },
  bottomSheetRetracted: {
    height: '58%',
    maxHeight: '60%',
  },
  bottomSheetExpanded: {
    height: '95%',
    maxHeight: '96%',
  },
  flatList: {
    flex: 1,
  },
  dragHandleContainer: {
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 4,
  },
  pinIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinActionText: {
    ...typography.caption,
    fontSize: 10,
    fontFamily: typography.fontAmount,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm + 4,
    borderWidth: 1,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
  },
  emptySearchWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptySearchText: {
    ...typography.captionMedium,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    ...typography.bodyMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  optionLabelSelected: {
    color: colors.primaryDark,
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
