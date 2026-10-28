import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  stepTitle?: string;
  style?: ViewStyle;
}

export function Stepper({
  currentStep,
  totalSteps,
  stepTitle,
  style,
}: StepperProps) {
  const { colors: dynamicColors } = useTheme();
  const progressPercent = Math.min(Math.max((currentStep / totalSteps) * 100, 0), 100);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textRow}>
        <Text style={[styles.stepCounter, { color: dynamicColors.primaryDark }]}>
          Step {currentStep} of {totalSteps}
        </Text>
        {stepTitle && <Text style={styles.stepTitle}>{stepTitle}</Text>}
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.indicator,
            { width: `${progressPercent}%`, backgroundColor: dynamicColors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCounter: {
    ...typography.captionMedium,
    fontFamily: typography.fontAmount,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepTitle: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
  },
  track: {
    height: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  indicator: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
});
