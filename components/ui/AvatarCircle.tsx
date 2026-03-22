import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
} from '@/constants/theme';

type AvatarTone = 'primary' | 'accent' | 'muted';

type Props = {
  name: string;
  photoUrl?: string;
  size?: number;
  tone?: AvatarTone;
};

const toneStyles: Record<AvatarTone, { backgroundColor: string; borderColor: string; textColor: string }> = {
  primary: {
    backgroundColor: BabyCityChipTones.primary.background,
    borderColor: BabyCityChipTones.primary.border,
    textColor: BabyCityChipTones.primary.text,
  },
  accent: {
    backgroundColor: BabyCityChipTones.accent.background,
    borderColor: BabyCityChipTones.accent.border,
    textColor: BabyCityChipTones.accent.text,
  },
  muted: {
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    borderColor: BabyCityPalette.borderSoft,
    textColor: ParentDesignTokens.text.secondary,
  },
};

export default function AvatarCircle({
  name,
  photoUrl,
  size = 56,
  tone = 'primary',
}: Props) {
  const palette = toneStyles[tone];
  const radius = Math.round(size / 2);
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
        />
      ) : (
        <AppText
          variant={size >= 64 ? 'h2' : 'bodyLarge'}
          weight="800"
          style={{ color: palette.textColor }}
        >
          {initial}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
});
