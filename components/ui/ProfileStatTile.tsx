import { StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import SurfaceCard from '@/components/ui/SurfaceCard';
import { BabyCityGeometry, BabyCityPalette } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  tone?: 'primary' | 'accent' | 'success' | 'muted';
};

const TONE_COLORS = {
  primary: BabyCityPalette.primary,
  accent: BabyCityPalette.accent,
  success: BabyCityPalette.success,
  muted: BabyCityPalette.textPrimary,
} as const;

export default function ProfileStatTile({
  label,
  value,
  tone = 'muted',
}: Props) {
  return (
    <SurfaceCard variant="panel" elevation="none" style={styles.card}>
      <AppText variant="h3" weight="800" style={[styles.label, { color: TONE_COLORS[tone] }]}>
        {label}
      </AppText>
      <AppText variant="bodyLarge" tone="muted" style={styles.value}>
        {value}
      </AppText>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    minHeight: 140,
    gap: BabyCityGeometry.spacing.xs,
    backgroundColor: BabyCityPalette.surfaceMuted,
    justifyContent: 'flex-start',
  },
  label: {
    textAlign: 'right',
    lineHeight: 34,
  },
  value: {
    textAlign: 'right',
    lineHeight: 28,
    marginTop: BabyCityGeometry.spacing.sm,
  },
});
