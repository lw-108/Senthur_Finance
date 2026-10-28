import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

export interface PrimaryButtonProps {
  title: string;
  variant?: 'filled' | 'outline';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  loading?: boolean;
  disabled?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  variant = 'filled',
  onPress,
  style,
  textStyle,
  loading = false,
  disabled = false,
}) => {
  const isFilled = variant === 'filled';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buttonBase,
        isFilled ? styles.filledButton : styles.outlineButton,
        pressed && !disabled && styles.pressedState,
        disabled && styles.disabledState,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isFilled ? theme.colors.white : theme.colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isFilled ? styles.filledText : styles.outlineText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    width: '100%',
    height: theme.spacing.buttonHeight,
    borderRadius: theme.spacing.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledButton: {
    backgroundColor: theme.colors.primary,
  },
  outlineButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontFamily: 'Polymath',
    fontSize: theme.typography.buttonTextSize,
    letterSpacing: 1.2,
    fontWeight: '600',
    textAlign: 'center',
  },
  filledText: {
    color: theme.colors.white,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  pressedState: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabledState: {
    opacity: 0.5,
  },
});

export default PrimaryButton;
