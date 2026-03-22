import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '@/components/ui/AppText';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
} from '@/constants/theme';

type Tone = 'green' | 'blue' | 'peach' | 'lavender' | 'amber';

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  // Optional short description shown beneath the toggle row
  hint?: string;
  tone?: Tone;
};

const TONES: Record<Tone, { border: string; bg: string; track: string; hint: string; text: string }> = {
  green: {
    border: BabyCityChipTones.success.border,
    bg: BabyCityPalette.surface,
    track: BabyCityChipTones.success.text,
    hint: BabyCityPalette.textSecondary,
    text: BabyCityPalette.textPrimary,
  },
  blue: {
    border: BabyCityChipTones.accent.border,
    bg: ParentDesignTokens.surfaces.card,
    track: BabyCityChipTones.accent.text,
    hint: BabyCityPalette.textSecondary,
    text: BabyCityPalette.textPrimary,
  },
  peach: {
    border: BabyCityChipTones.warning.border,
    bg: ParentDesignTokens.surfaces.card,
    track: BabyCityChipTones.warning.text,
    hint: BabyCityPalette.textSecondary,
    text: BabyCityPalette.textPrimary,
  },
  lavender: {
    border: BabyCityChipTones.primary.border,
    bg: ParentDesignTokens.surfaces.card,
    track: BabyCityChipTones.primary.text,
    hint: BabyCityPalette.textSecondary,
    text: BabyCityPalette.textPrimary,
  },
  amber: {
    border: BabyCityChipTones.warning.border,
    bg: ParentDesignTokens.surfaces.card,
    track: BabyCityChipTones.warning.text,
    hint: BabyCityPalette.textSecondary,
    text: BabyCityPalette.textPrimary,
  },
};

export default function ToggleRow({ label, value, onChange, hint, tone = 'green' }: Props) {
  const palette = TONES[tone];

  return (
    <View style={[styles.container, { borderColor: palette.border, backgroundColor: palette.bg }]}>
      <TouchableOpacity style={styles.row} onPress={() => onChange(!value)}>
        <AppText variant="bodyLarge" weight="700" style={[styles.label, { color: palette.text }]}>
          {label}
        </AppText>
        <View style={[styles.track, value && { backgroundColor: palette.track }]}>
          <View style={[styles.thumb, value && styles.thumbOn]} />
        </View>
      </TouchableOpacity>
      {hint ? (
        <AppText style={[styles.hint, { color: palette.hint }]}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: ParentDesignTokens.radius.card,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 14,
  },
  label: {
    flex: 1,
  },
  track: {
    width: 56,
    height: 32,
    borderRadius: BabyCityGeometry.radius.chip,
    backgroundColor: BabyCityPalette.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BabyCityPalette.surface,
    alignSelf: 'flex-start',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  hint: {
    paddingBottom: 12,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
});
