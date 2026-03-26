import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BabyCityGeometry,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';

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

const TONES: Record<Tone, { activeBg: string; activeText: string; idleBg: string; idleText: string }> = {
  green: {
    activeBg: '#e9def5',
    activeText: '#564f61',
    idleBg: '#dee8ff',
    idleText: '#515c70',
  },
  blue: {
    activeBg: '#e9def5',
    activeText: '#564f61',
    idleBg: '#dee8ff',
    idleText: '#515c70',
  },
  peach: {
    activeBg: '#ffebf1',
    activeText: '#8e294c',
    idleBg: '#dee8ff',
    idleText: '#515c70',
  },
  lavender: {
    activeBg: '#e9def5',
    activeText: '#564f61',
    idleBg: '#dee8ff',
    idleText: '#515c70',
  },
  amber: {
    activeBg: '#fff3e0',
    activeText: '#bb7a15',
    idleBg: '#dee8ff',
    idleText: '#515c70',
  },
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
            <TouchableOpacity
              key={option}
              onPress={() => toggle(option)}
              activeOpacity={0.86}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? palette.activeBg : palette.idleBg,
                },
              ]}
            >
              <AppText
                variant="body"
                weight={isSelected ? '700' : '600'}
                style={[
                  styles.chipLabel,
                  {
                    color: isSelected ? palette.activeText : palette.idleText,
                  },
                ]}
              >
                {option}
              </AppText>
            </TouchableOpacity>
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
    gap: 10,
  },
  chip: {
    minHeight: 38,
    borderRadius: BabyCityGeometry.radius.chip,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    textAlign: 'right',
  },
  errorText: {
    marginTop: BabyCityGeometry.spacing.sm,
    paddingHorizontal: 4,
  },
});
