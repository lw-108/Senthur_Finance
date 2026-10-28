import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useTheme } from '@/store/useThemeStore';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  showBorder?: boolean;
  style?: ViewStyle;
}

export function Avatar({
  uri,
  name = 'Admin',
  size = 40,
  backgroundColor,
  textColor,
  borderColor,
  showBorder = true,
  style,
}: AvatarProps) {
  const { colors: dynamicColors } = useTheme();
  const effectiveBg = backgroundColor || dynamicColors.primaryLight;
  const effectiveTextColor = textColor || dynamicColors.primaryDark;
  const effectiveBorderColor = borderColor || dynamicColors.primary;

  const getInitials = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const borderWidth = showBorder ? 2 : 0;
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: effectiveBg,
    borderWidth,
    borderColor: effectiveBorderColor,
  };

  if (uri) {
    const imageSize = size - borderWidth * 2;
    return (
      <View style={[styles.container, containerStyle, style]}>
        <Image
          source={{ uri }}
          style={[styles.image, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}
          resizeMode="cover"
        />
      </View>
    );
  }

  const fontSize = Math.max(Math.floor(size * 0.38), 11);

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Text style={[styles.initials, { fontSize, color: effectiveTextColor }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: colors.surfaceMuted,
  },
  initials: {
    fontFamily: typography.fontHeadline,
    letterSpacing: 0.5,
  },
});
