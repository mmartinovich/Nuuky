import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, gradients, interactionStates } from '../../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'solid';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const VARIANT_GRADIENTS: Record<ButtonVariant, [string, string]> = {
  primary: gradients.button as [string, string],
  secondary: ['rgba(100, 100, 120, 0.4)', 'rgba(80, 80, 100, 0.4)'],
  danger: ['rgba(239, 68, 68, 0.8)', 'rgba(220, 38, 38, 0.8)'],
  ghost: ['transparent', 'transparent'],
  solid: ['transparent', 'transparent'], // Solid uses View background instead
};

const SIZE_STYLES: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number; minHeight: number }> = {
  sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, fontSize: typography.size.sm, minHeight: 40 },
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, fontSize: typography.size.base, minHeight: 48 },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, fontSize: typography.size.lg, minHeight: 56 },
};

export const GradientButton: React.FC<GradientButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const sizeStyle = SIZE_STYLES[size];
  const gradientColors = disabled
    ? (['rgba(100, 100, 100, 0.3)', 'rgba(80, 80, 80, 0.3)'] as [string, string])
    : VARIANT_GRADIENTS[variant];

  const contentStyle = [
    styles.gradient,
    {
      paddingVertical: sizeStyle.paddingVertical,
      paddingHorizontal: sizeStyle.paddingHorizontal,
      minHeight: sizeStyle.minHeight,
    },
    variant === 'ghost' && styles.ghostGradient,
    variant === 'solid' && styles.solidGradient,
    variant === 'solid' && disabled && styles.solidDisabled,
  ];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.text.primary}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text
            style={[
              styles.text,
              { fontSize: sizeStyle.fontSize },
              disabled && styles.textDisabled,
              variant === 'ghost' && styles.ghostText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, (variant === 'ghost' || variant === 'solid') && styles.ghostButton, style]}
      activeOpacity={interactionStates.pressed}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityHint={accessibilityHint}
    >
      {variant === 'solid' ? (
        <View style={contentStyle}>{content}</View>
      ) : (
        <LinearGradient colors={gradientColors} style={contentStyle}>
          {content}
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ghostGradient: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.full,
  },
  solidGradient: {
    backgroundColor: colors.accent?.primary || colors.mood.notGreat.base,
    borderRadius: radius.full,
  },
  solidDisabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
  },
  text: {
    fontWeight: typography.weight.semibold as any,
    color: colors.text.primary,
  },
  textDisabled: {
    color: colors.text.tertiary,
  },
  ghostText: {
    color: colors.text.secondary,
  },
});

export default GradientButton;
