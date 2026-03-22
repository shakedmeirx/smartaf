import { View, StyleSheet } from 'react-native';
import {
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';
import InfoChip from '@/components/ui/InfoChip';

type Tone = 'green' | 'blue' | 'peach' | 'lavender' | 'amber';

type Props = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  // If true, only one option can be selected at a time
  singleSelect?: boolean;
  errorText?: string;
  tone?: Tone;
};

const TONES: Record<Tone, 'success' | 'accent' | 'muted' | 'primary' | 'warning'> = {
  green: 'success',
  blue: 'accent',
  peach: 'primary',
  lavender: 'primary',
  amber: 'warning',
};

export default function TagSelector({
  options,
  selected,
  onChange,
  singleSelect = false,
  errorText,
  tone = 'green',
}: Props) {
  const palette = TONES[tone];

  function toggle(option: string) {
    if (singleSelect) {
      // Replace selection with the tapped option (deselect if already selected)
      onChange(selected.includes(option) ? [] : [option]);
    } else {
      onChange(
        selected.includes(option)
          ? selected.filter(o => o !== option)
          : [...selected, option]
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.wrap}>
        {options.map(option => {
          const isSelected = selected.includes(option);
          return (
            <InfoChip
              key={option}
              label={option}
              tone={palette}
              variant="filter"
              selected={isSelected}
              onPress={() => toggle(option)}
            />
          );
        })}
      </View>
      {errorText ? (
        <AppText variant="caption" tone="error" style={styles.errorText}>
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: BabyCityGeometry.spacing.xl,
  },
  wrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
  },
  errorText: {
    marginTop: BabyCityGeometry.spacing.sm,
  },
});
