import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';
import { formatYMD } from '@/features/analytics/computeDayAnalytics';

interface CalendarPickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  activeDates?: Set<string>; // Dates that have DB / audit transactions
  onClose: () => void;
  onSelectDate: (date: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarPickerModal({
  visible,
  selectedDate,
  activeDates = new Set(),
  onClose,
  onSelectDate,
}: CalendarPickerModalProps) {
  const { colors } = useTheme();

  // Selected date initial month/year
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState<number>(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );

  const todayStr = formatYMD(new Date());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build calendar matrix
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  const days: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Blank slots for previous month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    days.push({ dayNumber: d, dateStr, isCurrentMonth: true });
  }

  // Quick preset dates
  const handlePreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const dateStr = formatYMD(d);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    onSelectDate(dateStr);
    onClose();
  };

  const handleDayPress = (dateStr: string) => {
    if (!dateStr) return;
    onSelectDate(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.ink, fontFamily: typography.fontHeadline, letterSpacing: 0.8 },
                ]}
              >
                Select Analytics Date
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Draw real-time graphs and transaction histories
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceMuted }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsRow}
          >
            <TouchableOpacity
              style={[
                styles.presetChip,
                selectedDate === todayStr && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
                selectedDate !== todayStr && {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handlePreset(0)}
            >
              <Text
                style={[
                  styles.presetChipText,
                  { color: selectedDate === todayStr ? '#FFFFFF' : colors.ink },
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              onPress={() => handlePreset(1)}
            >
              <Text style={[styles.presetChipText, { color: colors.ink }]}>Yesterday</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              onPress={() => handlePreset(2)}
            >
              <Text style={[styles.presetChipText, { color: colors.ink }]}>2 Days Ago</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              onPress={() => handlePreset(7)}
            >
              <Text style={[styles.presetChipText, { color: colors.ink }]}>1 Week Ago</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Month & Year Navigation Bar */}
          <View style={styles.monthNavBar}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.navArrowBtn, { backgroundColor: colors.surfaceMuted }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </TouchableOpacity>

            <Text
              style={[
                styles.monthTitle,
                { color: colors.ink, fontFamily: typography.fontHeadline, letterSpacing: 0.6 },
              ]}
            >
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navArrowBtn, { backgroundColor: colors.surfaceMuted }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Row */}
          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((day, idx) => (
              <View key={idx} style={styles.dayLabelCell}>
                <Text
                  style={[
                    styles.dayLabelText,
                    { color: idx === 0 || idx === 6 ? colors.danger : colors.textSecondary },
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return <View key={idx} style={styles.dayCell} />;
              }

              const isSelected = item.dateStr === selectedDate;
              const isToday = item.dateStr === todayStr;
              const hasActivity = activeDates.has(item.dateStr);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary }],
                    isToday && !isSelected && [
                      styles.todayCell,
                      { borderColor: colors.primary, borderWidth: 1.5 },
                    ],
                  ]}
                  onPress={() => handleDayPress(item.dateStr)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      { color: isSelected ? '#FFFFFF' : colors.ink },
                    ]}
                  >
                    {item.dayNumber}
                  </Text>

                  {/* Activity Indicator Dot */}
                  {hasActivity && (
                    <View
                      style={[
                        styles.activityDot,
                        { backgroundColor: isSelected ? '#FFFFFF' : colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Legend */}
          <View style={[styles.footerLegend, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                DB Transactions / Activity
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                handlePreset(0);
              }}
              style={styles.jumpTodayBtn}
            >
              <Text
                style={[
                  styles.jumpTodayText,
                  { color: colors.primary, fontFamily: typography.fontHeadline, letterSpacing: 0.6 },
                ]}
              >
                Jump to Today
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayLabelCell: {
    width: 40,
    alignItems: 'center',
  },
  dayLabelText: {
    fontFamily: typography.fontPolymathThin,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCell: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  todayCell: {},
  dayNumberText: {
    fontFamily: typography.fontPolymath,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  activityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  footerLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
  },
  jumpTodayBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  jumpTodayText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
