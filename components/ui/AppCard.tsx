import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import SurfaceCard from '@/components/ui/SurfaceCard';
import {
  AppRole,
  BabyCityPalette,
} from '@/constants/theme';

type AppCardVariant = 'default' | 'hero' | 'panel' | 'list';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  role?: AppRole;
  variant?: AppCardVariant;
  backgroundColor?: string;
  borderColor?: string;
};

export default function AppCard({
  children,
  style,
  role = 'parent',
  variant = 'default',
  backgroundColor,
  borderColor,
}: Props) {
  const isHero = variant === 'hero';
  const isPanel = variant === 'panel';

  return (
    <SurfaceCard
      variant={isHero ? 'hero' : isPanel ? 'panel' : 'card'}
      elevation={isHero ? 'elevated' : 'soft'}
      backgroundColor={
        backgroundColor ??
        (isHero || isPanel
          ? BabyCityPalette.surfaceLow
          : BabyCityPalette.surfaceLowest)
      }
      borderColor={borderColor ?? 'transparent'}
      style={style}
    >
      {children}
    </SurfaceCard>
  );
}
