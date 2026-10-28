import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

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
}: SelectModalProps<T>) {
  const { colors: dynamicColors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const isRequired = required || (label ? label.includes('*') : false);
  const cleanLabel = label ? label.replace(/\s*\*+$/, '') : '';

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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.bottomSheet, { backgroundColor: dynamicColors.surface }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dragHandle, { backgroundColor: dynamicColors.borderStrong }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: dynamicColors.ink }]}>{label || 'Select'}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color={dynamicColors.ink} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.value)}
                    style={[
                      styles.optionRow,
                      isSelected && [styles.optionSelected, { backgroundColor: dynamicColors.primarySoft }],
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      {item.icon && (
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={isSelected ? dynamicColors.primaryDark : dynamicColors.textSecondary}
                          style={styles.optionIcon}
                        />
                      )}
                      <View>
                        <Text
                          style={[
                            styles.optionLabel,
                            { color: isSelected ? dynamicColors.primaryDark : dynamicColors.ink },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.subtitle && (
                          <Text style={[styles.optionSubtitle, { color: dynamicColors.textSecondary }]}>{item.subtitle}</Text>
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
            />
          </View>
        </TouchableOpacity>
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
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
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
