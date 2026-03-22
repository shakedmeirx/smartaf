import { View, StyleSheet } from 'react-native';
import { BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { strings } from '@/locales';
import AppText from '@/components/ui/AppText';

type Props = {
  current: number;
  total: number;
  title: string;
};

export default function StepIndicator({ current, total, title }: Props) {
  const progress = current / total;
  const theme = getRoleTheme('babysitter');

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.highlightedSurface },
      ]}
    >
      {/* Small step counter above the title */}
      <AppText variant="caption" weight="600" style={[styles.stepCount, { color: theme.subtitle }]}>
        {strings.stepLabel} {current} {strings.outOf} {total}
      </AppText>
      {/* Title is the main visual focus */}
      <AppText variant="h1" weight="800" style={[styles.title, { color: theme.title }]}>
        {title}
      </AppText>
      {/* Progress bar */}
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 8,
  },
  stepCount: {
  },
  title: {
    lineHeight: 38,
  },
  barBackground: {
    height: 8,
    backgroundColor: BabyCityPalette.surface,
    borderRadius: 999,
    alignItems: 'flex-end',
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: 8,
    backgroundColor: BabyCityPalette.primary,
    borderRadius: 999,
  },
});
