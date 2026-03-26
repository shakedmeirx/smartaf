import React from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';

type SmartafWordmarkSize = 'sm' | 'md' | 'lg';

export interface SmartafWordmarkProps {
  readonly size?: SmartafWordmarkSize;
  readonly textColor?: string;
  readonly style?: StyleProp<ViewStyle>;
}

const SIZE_CONFIG: Record<SmartafWordmarkSize, {
  badge: number;
  radius: number;
  icon: number;
  gap: number;
  fontSize: number;
  lineHeight: number;
}> = {
  sm: {
    badge: 30,
    radius: 10,
    icon: 18,
    gap: 8,
    fontSize: 20,
    lineHeight: 24,
  },
  md: {
    badge: 34,
    radius: 12,
    icon: 20,
    gap: 10,
    fontSize: 22,
    lineHeight: 28,
  },
  lg: {
    badge: 40,
    radius: 14,
    icon: 24,
    gap: 12,
    fontSize: 28,
    lineHeight: 32,
  },
};

export default function SmartafWordmark({
  size = 'md',
  textColor = BabyCityPalette.primary,
  style,
}: SmartafWordmarkProps) {
  const config = SIZE_CONFIG[size];

  return (
    <View style={[styles.root, { gap: config.gap }, style]}>
      <View
        style={[
          styles.badge,
          {
            width: config.badge,
            height: config.badge,
            borderRadius: config.radius,
          },
        ]}
      >
        <MaterialIcons
          name="child-care"
          size={config.icon}
          color="#ffffff"
        />
      </View>
      <AppText
        variant="h2"
        weight="800"
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: config.fontSize,
            lineHeight: config.lineHeight,
          },
        ]}
      >
        {strings.appName}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: BabyCityPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  text: {
    letterSpacing: -0.5,
  },
});
