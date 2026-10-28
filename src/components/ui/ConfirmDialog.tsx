import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/useThemeStore';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  icon = 'alert-circle-outline',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors: dynamicColors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View
          style={[
            styles.dialogCard,
            {
              backgroundColor: dynamicColors.surface,
              borderColor: dynamicColors.border,
              borderWidth: 1,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDestructive
                  ? (isDark ? 'rgba(239, 68, 68, 0.2)' : dynamicColors.dangerLight)
                  : (isDark ? `${dynamicColors.primary}25` : dynamicColors.primarySoft),
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={28}
              color={isDestructive ? dynamicColors.danger : dynamicColors.primaryDark}
            />
          </View>

          <Text style={[styles.title, { color: dynamicColors.ink }]}>{title}</Text>
          <Text style={[styles.message, { color: dynamicColors.textSecondary }]}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: dynamicColors.surfaceMuted,
                  borderColor: dynamicColors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelText, { color: dynamicColors.ink }]}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { backgroundColor: isDestructive ? dynamicColors.danger : dynamicColors.primary },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: typography.fontHeadline,
    color: colors.ink,
    letterSpacing: 1.2,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: typography.fontHeadline,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
});
