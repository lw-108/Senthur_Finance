import React, { useRef, useState, useEffect, createContext, useContext, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { SafeAreaView, EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useTheme } from '@/store/useThemeStore';

export interface KeyboardAwareContextValue {
  scrollToFocusedInput: (targetNode: any) => void;
  scrollRef: React.RefObject<ScrollView | null>;
}

export const KeyboardAwareContext = createContext<KeyboardAwareContextValue | null>(null);

export function useKeyboardAware() {
  return useContext(KeyboardAwareContext);
}

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
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Monitor keyboard display to dynamically expand bottom scroll padding
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Smoothly scroll the focused input into clear view above the mobile keyboard
  const scrollToFocusedInput = useCallback((targetNode: any) => {
    if (Platform.OS === 'web') return;
    if (!scrollRef.current || !targetNode) return;

    // Small delay to allow soft keyboard to slide into place
    setTimeout(() => {
      try {
        if (typeof targetNode.measureLayout === 'function') {
          targetNode.measureLayout(
            scrollRef.current as any,
            (_left: number, top: number) => {
              scrollRef.current?.scrollTo({
                y: Math.max(0, top - 80),
                animated: true,
              });
            },
            () => {}
          );
        }
      } catch {}
    }, Platform.OS === 'android' ? 120 : 60);
  }, []);

  const effectiveBg = backgroundColor || dynamicColors.background;
  const effectiveStatusBarStyle =
    statusBarStyle || (isDark ? 'light-content' : 'dark-content');

  const containerStyle = [
    styles.container,
    { backgroundColor: effectiveBg },
    style,
  ];

  // Extra padding when keyboard is open so bottom inputs can scroll above keypad
  const dynamicBottomPadding =
    Math.max(insets.bottom, 24) +
    (keyboardHeight > 0
      ? Platform.OS === 'android'
        ? 180
        : keyboardHeight + 30
      : 24);

  return (
    <SafeAreaView edges={edges} style={containerStyle}>
      <StatusBar
        barStyle={effectiveStatusBarStyle}
        backgroundColor={effectiveBg}
        translucent={Platform.OS === 'android'}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={
          scrollable
            ? undefined
            : Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <KeyboardAwareContext.Provider value={{ scrollToFocusedInput, scrollRef }}>
          {scrollable ? (
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: dynamicBottomPadding },
                contentContainerStyle,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'web' ? 'none' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
        </KeyboardAwareContext.Provider>
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
