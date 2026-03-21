import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  BabyCityGeometry,
  BabyCityPalette,
  BabyCityShadows,
} from '@/constants/theme';

type SurfaceCardVariant = 'hero' | 'card' | 'panel';
type SurfaceCardElevation = 'soft' | 'elevated' | 'none';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  variant?: SurfaceCardVariant;
  elevation?: SurfaceCardElevation;
};

export default function SurfaceCard({
  children,
  style,
  backgroundColor = BabyCityPalette.surfaceLowest,
  borderColor = 'transparent',
  variant = 'card',
  elevation = 'soft',
}: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'hero' ? styles.hero : variant === 'panel' ? styles.panel : styles.card,
        elevation === 'soft'
          ? BabyCityShadows.editorial
          : elevation === 'elevated'
            ? BabyCityShadows.elevated
            : null,
        { backgroundColor, borderColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 0,
  },
  hero: {
    borderRadius: BabyCityGeometry.radius.hero,
    padding: BabyCityGeometry.spacing.xl,
  },
  card: {
    borderRadius: BabyCityGeometry.radius.card,
    padding: BabyCityGeometry.spacing.lg,
  },
  panel: {
    borderRadius: BabyCityGeometry.radius.card,
    padding: BabyCityGeometry.spacing.md,
  },
});
