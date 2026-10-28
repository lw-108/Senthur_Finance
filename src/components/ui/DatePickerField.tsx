import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';
import { formatDate } from '@/utils/formatters';

interface DatePickerFieldProps {
  label?: string;
  value: Date | string;
  onChangeDate: (date: Date) => void;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export function DatePickerField({
  label,
  value,
  onChangeDate,
  required,
  error,
  hint,
  containerStyle,
}: DatePickerFieldProps) {
  const { colors: dynamicColors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const currentDate = typeof value === 'string' ? new Date(value) : value;

  const isRequired = required || (label ? label.includes('*') : false);
  const cleanLabel = label ? label.replace(/\s*\*+$/, '') : '';

  // Simple clean modal date incrementer / helper (days, months, years)
  const adjustDays = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    onChangeDate(d);
  };

  const adjustMonths = (months: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + months);
    onChangeDate(d);
  };

  const setToday = () => {
    onChangeDate(new Date());
    setModalVisible(false);
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
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        style={[
          styles.field,
          {
            backgroundColor: dynamicColors.surface,
            borderColor: dynamicColors.border,
          },
          Boolean(error) && {
            borderColor: dynamicColors.danger,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : dynamicColors.dangerLight,
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={19}
          color={dynamicColors.primaryDark}
          style={styles.icon}
        />
        <Text style={[styles.valueText, { color: dynamicColors.ink }]}>
          {formatDate(currentDate, 'dd MMMM yyyy')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={dynamicColors.textSecondary} />
      </TouchableOpacity>

      {error ? (
        <Text style={[styles.errorText, { color: dynamicColors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: dynamicColors.textSecondary }]}>{hint}</Text>
      ) : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: dynamicColors.surface,
                borderColor: dynamicColors.border,
                borderWidth: 1,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dynamicColors.ink }]}>
                {label || 'Select Date'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={dynamicColors.ink} />
              </TouchableOpacity>
            </View>

            <View style={[styles.currentDateDisplay, { backgroundColor: dynamicColors.primarySoft }]}>
              <Text style={[styles.bigDateText, { color: dynamicColors.primaryDark }]}>
                {formatDate(currentDate, 'EEEE')}
              </Text>
              <Text style={[styles.hugeDateNumber, { color: dynamicColors.ink }]}>
                {formatDate(currentDate, 'dd MMM yyyy')}
              </Text>
            </View>

            {/* Quick date adjusters */}
            <View style={styles.quickRows}>
              <View style={styles.adjustRow}>
                <Text style={[styles.adjustLabel, { color: dynamicColors.textSecondary }]}>Day:</Text>
                <TouchableOpacity
                  style={[
                    styles.adjustBtn,
                    {
                      backgroundColor: dynamicColors.surfaceMuted,
                      borderColor: dynamicColors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => adjustDays(-1)}
                >
                  <Text style={[styles.adjustBtnText, { color: dynamicColors.ink }]}>-1d</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.adjustBtn,
                    {
                      backgroundColor: dynamicColors.surfaceMuted,
                      borderColor: dynamicColors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => adjustDays(1)}
                >
                  <Text style={[styles.adjustBtnText, { color: dynamicColors.ink }]}>+1d</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.adjustRow}>
                <Text style={[styles.adjustLabel, { color: dynamicColors.textSecondary }]}>Month:</Text>
                <TouchableOpacity
                  style={[
                    styles.adjustBtn,
                    {
                      backgroundColor: dynamicColors.surfaceMuted,
                      borderColor: dynamicColors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => adjustMonths(-1)}
                >
                  <Text style={[styles.adjustBtnText, { color: dynamicColors.ink }]}>-1m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.adjustBtn,
                    {
                      backgroundColor: dynamicColors.surfaceMuted,
                      borderColor: dynamicColors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => adjustMonths(1)}
                >
                  <Text style={[styles.adjustBtnText, { color: dynamicColors.ink }]}>+1m</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.todayBtn,
                  {
                    backgroundColor: dynamicColors.surfaceMuted,
                    borderColor: dynamicColors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={setToday}
              >
                <Text style={[styles.todayBtnText, { color: dynamicColors.ink }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: dynamicColors.primary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.doneBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
  icon: {
    marginRight: 10,
  },
  valueText: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.ink,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
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
  },
  currentDateDisplay: {
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: radii.tile,
    alignItems: 'center',
    marginBottom: 20,
  },
  bigDateText: {
    ...typography.captionMedium,
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  hugeDateNumber: {
    fontFamily: typography.fontAmount,
    fontSize: 22,
    color: colors.ink,
    marginTop: 4,
  },
  quickRows: {
    gap: 12,
    marginBottom: 20,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    width: 60,
  },
  adjustBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  adjustBtnText: {
    fontFamily: typography.fontHeadline,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: 1.0,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  todayBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  todayBtnText: {
    fontFamily: typography.fontHeadline,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: 1.0,
  },
  doneBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: typography.fontHeadline,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1.0,
  },
});
