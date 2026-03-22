import { TouchableOpacity, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';

type InfoChipTone = keyof typeof BabyCityChipTones;
type InfoChipVariant = 'soft' | 'filter';
type InfoChipSize = 'sm' | 'md';

type Props = {
  label: string;
  tone?: InfoChipTone;
  variant?: InfoChipVariant;
  size?: InfoChipSize;
  selected?: boolean;
  onPress?: () => void;
};

export default function InfoChip({
  label,
  tone = 'muted',
  variant = 'soft',
  size = 'md',
  selected = false,
  onPress,
}: Props) {
  const palette = BabyCityChipTones[tone];

  const content = (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.small : styles.medium,
        variant === 'filter' && !selected ? styles.filterIdle : null,
        {
          backgroundColor:
            selected || variant === 'soft' ? palette.background : BabyCityPalette.surface,
          borderColor:
            selected || variant === 'soft' ? palette.border : BabyCityPalette.border,
        },
      ]}
    >
      <AppText
        variant={size === 'sm' ? 'caption' : 'body'}
        weight={selected ? '700' : '600'}
        style={[
          styles.label,
          {
            color:
              selected || variant === 'soft' ? palette.text : BabyCityPalette.textSecondary,
          },
        ]}
      >
        {label}
      </AppText>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: BabyCityGeometry.radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: 28,
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
    textAlign: 'right',
  },
});
