import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useTheme } from '@/store/useThemeStore';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  statusBarStyle?: 'light-content' | 'dark-content';
  backgroundColor?: string;
  keyboardVerticalOffset?: number;
}

export function Screen({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  edges = ['top', 'left', 'right'],
  statusBarStyle,
  backgroundColor,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 0,
}: ScreenProps) {
  const insets: EdgeInsets = useSafeAreaInsets();
  const { colors: dynamicColors, isDark } = useTheme();

  const effectiveBg = backgroundColor || dynamicColors.background;
  const effectiveStatusBarStyle =
    statusBarStyle || (isDark ? 'light-content' : 'dark-content');

  const containerStyle = [
    styles.container,
    { backgroundColor: effectiveBg },
    style,
  ];

  return (
    <SafeAreaView edges={edges} style={containerStyle}>
      <StatusBar
        barStyle={effectiveStatusBarStyle}
        backgroundColor={effectiveBg}
        translucent={Platform.OS === 'android'}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) },
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    minHeight: 0,
  },
});
