import React from 'react';
import { StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InfoChip from '@/components/ui/InfoChip';
import AppText from '@/components/ui/AppText';
import { BabyCityChipTones, BabyCityGeometry, BabyCityPalette } from '@/constants/theme';

type AppChipTone = keyof typeof BabyCityChipTones;

type Props = {
  label: string;
  tone?: AppChipTone;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  variant?: 'soft' | 'filter';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export default function AppChip({
  label,
  tone = 'muted',
  selected = false,
  onPress,
  size = 'md',
  variant = 'soft',
  icon,
  style,
}: Props) {
  // No icon — delegate to InfoChip as before
  if (!icon) {
    return (
      <View style={style}>
        <InfoChip
          label={label}
          tone={tone}
          selected={selected}
          onPress={onPress}
          size={size}
          variant={variant}
        />
      </View>
    );
  }

  // With icon — render inline row so the icon doesn't overlap the text
  const palette = BabyCityChipTones[tone];
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 12 : 14;

  const chip = (
    <View
      style={[
        chipStyles.base,
        isSmall ? chipStyles.small : chipStyles.medium,
        variant === 'filter' && !selected ? chipStyles.filterIdle : null,
        {
          backgroundColor:
            selected || variant === 'soft' ? palette.background : BabyCityPalette.surface,
          borderColor:
            selected || variant === 'soft' ? palette.border : BabyCityPalette.border,
        },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={selected ? palette.text : BabyCityPalette.textSecondary}
      />
      <AppText
        variant={isSmall ? 'caption' : 'body'}
        weight={selected ? '700' : '600'}
        style={[chipStyles.label, { color: selected || variant === 'soft' ? palette.text : BabyCityPalette.textSecondary }]}
      >
        {label}
      </AppText>
    </View>
  );

  if (!onPress) return chip;

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress}>
      {chip}
    </TouchableOpacity>
  );
}

const chipStyles = {
  base: {
    flexDirection: 'row-reverse' as const,
    alignItems: 'center' as const,
    gap: 5,
    borderWidth: 1,
    borderRadius: BabyCityGeometry.radius.chip,
  },
  small: {
    minHeight: 30,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  medium: {
    minHeight: BabyCityGeometry.controlHeights.chip,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  filterIdle: {
    backgroundColor: BabyCityPalette.surface,
  },
  label: {
    textAlign: 'right' as const,
  },
};
