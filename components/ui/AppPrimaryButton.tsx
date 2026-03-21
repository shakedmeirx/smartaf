import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '@/components/ui/AppText';
import { BabyCityGeometry } from '@/constants/theme';

type AppButtonSize = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: AppButtonSize;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
};

export default function AppPrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  size = 'lg',
  style,
  backgroundColor,
  borderColor,
  textColor,
}: Props) {
  const isDisabled = disabled || loading;
  const labelColor = textColor ?? '#ffffff';
  const useGradient = !backgroundColor;

  const sizeStyle = size === 'lg' ? styles.large : styles.medium;

  const inner = loading ? (
    <ActivityIndicator color={labelColor} />
  ) : (
    <AppText
      variant={size === 'lg' ? 'h3' : 'bodyLarge'}
      weight="700"
      align="center"
      style={{ color: labelColor }}
    >
      {label}
    </AppText>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        sizeStyle,
        !useGradient && { backgroundColor },
        borderColor ? { borderWidth: 1, borderColor } : null,
        useGradient && styles.primaryShadow,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {useGradient ? (
        <LinearGradient
          colors={['#702ae1', '#6411d5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle]}
        >
          {inner}
        </LinearGradient>
      ) : inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BabyCityGeometry.radius.pill,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 18,
  },
  large: {
    minHeight: 58,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.55,
  },
});
