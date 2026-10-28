import React from 'react';
import { Text, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';

interface DisplayTitleProps {
  title: string;
  subtitle?: string;
  highlightText?: string;
  highlightColor?: string;
  size?: 'normal' | 'large';
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export function DisplayTitle({
  title,
  subtitle,
  highlightText,
  highlightColor,
  size = 'normal',
  style,
  titleStyle,
  subtitleStyle,
}: DisplayTitleProps) {
  const { colors: dynamicColors } = useTheme();
  const effectiveHighlightColor = highlightColor || dynamicColors.primaryDark;
  const fontStyle = size === 'large' ? typography.displayLarge : typography.display;

  const renderTitleContent = () => {
    if (!highlightText || !title.includes(highlightText)) {
      return (
        <Text style={[styles.title, fontStyle, { color: dynamicColors.ink }, titleStyle]}>
          {title}
        </Text>
      );
    }

    const parts = title.split(highlightText);
    return (
      <Text style={[styles.title, fontStyle, { color: dynamicColors.ink }, titleStyle]}>
        {parts[0]}
        <Text style={{ color: effectiveHighlightColor }}>{highlightText}</Text>
        {parts.slice(1).join(highlightText)}
      </Text>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderTitleContent()}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: dynamicColors.textSecondary }, subtitleStyle]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    color: colors.ink,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
