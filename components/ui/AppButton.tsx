import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BabyCityGeometry, BabyCityPalette } from '@/constants/theme';
import AppText from '@/components/ui/AppText';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost';
type AppButtonSize = 'md' | 'lg';

type Props = Omit<TouchableOpacityProps, 'style'> & {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  spinnerColor?: string;
};

export default function AppButton({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  labelStyle,
  backgroundColor,
  borderColor,
  textColor,
  spinnerColor,
  activeOpacity = 0.9,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary' && !backgroundColor;

  const palette = {
    primary: {
      backgroundColor: 'transparent',
      borderColor: borderColor ?? 'transparent',
      textColor: textColor ?? '#ffffff',
      spinnerColor: spinnerColor ?? '#ffffff',
    },
    secondary: {
      backgroundColor: backgroundColor ?? BabyCityPalette.primarySoft,
      borderColor: borderColor ?? 'transparent',
      textColor: textColor ?? '#564f61',
      spinnerColor: spinnerColor ?? BabyCityPalette.primary,
    },
    ghost: {
      backgroundColor: backgroundColor ?? 'transparent',
      borderColor: borderColor ?? 'transparent',
      textColor: textColor ?? BabyCityPalette.textSecondary,
      spinnerColor: spinnerColor ?? BabyCityPalette.primary,
    },
  }[variant];

  const sizeStyle = size === 'lg' ? styles.large : styles.medium;

  const inner = loading ? (
    <ActivityIndicator color={palette.spinnerColor} />
  ) : (
    <AppText
      variant={size === 'lg' ? 'h3' : 'bodyLarge'}
      weight="700"
      style={[styles.label, { color: palette.textColor }, labelStyle]}
    >
      {label}
    </AppText>
  );

  if (isPrimary) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        disabled={isDisabled}
        style={[
          styles.base,
          sizeStyle,
          fullWidth && styles.fullWidth,
          styles.primaryShadow,
          isDisabled && styles.disabled,
          style,
        ]}
        {...rest}
      >
        <LinearGradient
          colors={['#702ae1', '#6411d5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle]}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyle,
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.withBorder,
        {
          backgroundColor: backgroundColor ?? palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryShadow: {
    shadowColor: '#702ae1',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  medium: {
    minHeight: 52,
    paddingVertical: 12,
  },
  large: {
    minHeight: 58,
    paddingVertical: 14,
  },
  fullWidth: {
    width: '100%',
  },
  withBorder: {
    borderWidth: 1.5,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    textAlign: 'center',
  },
});
