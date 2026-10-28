import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/store/useThemeStore';
import { LockMorphToast } from './LockMorphToast';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showLockMorph: (onComplete?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCount = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors: dynamicColors, isDark } = useTheme();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [lockMorphVisible, setLockMorphVisible] = useState(false);
  const [lockMorphCallback, setLockMorphCallback] = useState<(() => void) | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastCount;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);

  const showLockMorph = useCallback((onComplete?: () => void) => {
    setLockMorphCallback(() => (onComplete ? onComplete : null));
    setLockMorphVisible(true);
  }, []);

  const handleLockMorphComplete = useCallback(() => {
    setLockMorphVisible(false);
    if (lockMorphCallback) {
      lockMorphCallback();
    }
  }, [lockMorphCallback]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={20} color={dynamicColors.success} />;
      case 'error':
        return <Ionicons name="alert-circle" size={20} color={dynamicColors.danger} />;
      case 'info':
      default:
        return <Ionicons name="information-circle" size={20} color={dynamicColors.primaryDark} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showLockMorph }}>
      {children}
      <View pointerEvents="box-none" style={styles.toastContainer}>
        {toasts.map((toast) => (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(200)}
            exiting={FadeOutUp.duration(200)}
            style={[
              styles.toastCard,
              shadows.card,
              {
                backgroundColor: dynamicColors.surface,
                borderColor: dynamicColors.border,
              },
            ]}
          >
            {getIcon(toast.type)}
            <Text style={[styles.toastMessage, { color: dynamicColors.ink }]}>{toast.message}</Text>
          </Animated.View>
        ))}
      </View>
      <LockMorphToast
        visible={lockMorphVisible}
        onComplete={handleLockMorphComplete}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 30,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
    gap: 8,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 400,
    width: '100%',
    gap: 10,
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
});
