import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { useTheme } from '@/store/useThemeStore';

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  stepTitle?: string;
  nextStepTitle?: string;
  style?: ViewStyle;
}

export function Stepper({
  currentStep,
  totalSteps,
  stepTitle,
  nextStepTitle,
  style,
}: StepperProps) {
  const { colors: dynamicColors } = useTheme();
  const progressPercent = Math.min(Math.max((currentStep / totalSteps) * 100, 0), 100);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textRow}>
        <View style={styles.leftInfo}>
          <Text style={[styles.stepCounter, { color: dynamicColors.headingPrimary }]}>
            Step {currentStep} of {totalSteps}
          </Text>
          {stepTitle && (
            <Text style={[styles.stepTitle, { color: dynamicColors.ink }]}>
              {stepTitle}
            </Text>
          )}
        </View>

        {nextStepTitle ? (
          <View
            style={[
              styles.nextStepBadge,
              {
                backgroundColor: dynamicColors.primarySoft,
                borderColor: dynamicColors.primaryBorder,
              },
            ]}
          >
            <Text style={[styles.nextStepText, { color: dynamicColors.headingPrimary }]}>
              Next: {nextStepTitle}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.track, { backgroundColor: dynamicColors.surfaceMuted }]}>
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
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  stepCounter: {
    ...typography.captionMedium,
    fontFamily: typography.fontAmount,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepTitle: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
  },
  nextStepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  nextStepText: {
    ...typography.captionMedium,
    fontFamily: typography.fontHeadline,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  track: {
    height: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  indicator: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
