import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { BabyCityGeometry, BabyCityPalette, ParentDesignTokens } from '@/constants/theme';
import AppText from '@/components/ui/AppText';

type Props = {
  variant: 'parent' | 'babysitter';
  selectedRadiusKm: number;
  locating: boolean;
  notice?: string | null;
  onSelectRadius: (radiusKm: number) => void;
  showHeader?: boolean;
};

export default function NearbyRadiusCard({
  variant,
  selectedRadiusKm,
  locating,
  notice,
  onSelectRadius,
  showHeader = true,
}: Props) {
  const [isSliding, setIsSliding] = useState(false);
  const [draftRadiusKm, setDraftRadiusKm] = useState(selectedRadiusKm);

  useEffect(() => {
    if (!isSliding) {
      setDraftRadiusKm(selectedRadiusKm);
    }
  }, [selectedRadiusKm, isSliding]);

  const visibleRadiusKm = isSliding ? draftRadiusKm : selectedRadiusKm;

  const theme =
    variant === 'parent'
      ? {
          cardBackground: BabyCityPalette.surfaceMuted,
          cardBorder: BabyCityPalette.borderSoft,
          accentBackground: BabyCityPalette.primarySoft,
          accentText: BabyCityPalette.primary,
          title: BabyCityPalette.textPrimary,
          subtitle: BabyCityPalette.textSecondary,
          chipBorder: BabyCityPalette.border,
          chipActiveBorder: BabyCityPalette.primary,
        }
      : {
          cardBackground: BabyCityPalette.surfaceMuted,
          cardBorder: BabyCityPalette.borderSoft,
          accentBackground: BabyCityPalette.accentSoft,
          accentText: BabyCityPalette.accent,
          title: BabyCityPalette.textPrimary,
          subtitle: BabyCityPalette.textSecondary,
          chipBorder: BabyCityPalette.border,
          chipActiveBorder: BabyCityPalette.accent,
        };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
      {showHeader ? (
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: theme.accentBackground }]}>
            {locating ? (
              <ActivityIndicator size="small" color={theme.accentText} />
            ) : (
              <Ionicons name="locate-outline" size={18} color={theme.accentText} />
            )}
          </View>
          <View style={styles.textWrap}>
            <AppText variant="bodyLarge" weight="800" style={[styles.title, { color: theme.title }]}>
              {strings.nearbyTitle}
            </AppText>
            <AppText variant="caption" tone="muted" style={[styles.subtitle, { color: theme.subtitle }]}>
              {strings.nearbySubtitle}
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={[styles.sliderWrap, !showHeader && styles.sliderWrapCompact]}>
        <View style={styles.sliderHeader}>
          <AppText
            variant="body"
            weight="900"
            align="center"
            style={[styles.sliderValue, { color: theme.accentText, backgroundColor: theme.accentBackground }]}
          >
            {visibleRadiusKm} {strings.kilometersSuffix}
          </AppText>
          <AppText variant="caption" weight="800" style={[styles.sliderLabel, { color: theme.subtitle }]}>
            {strings.nearbyTitle}
          </AppText>
        </View>

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={200}
          step={1}
          value={selectedRadiusKm}
          minimumTrackTintColor={theme.chipActiveBorder}
          maximumTrackTintColor={theme.chipBorder}
          thumbTintColor={theme.accentText}
          onSlidingStart={() => {
            setDraftRadiusKm(selectedRadiusKm);
            setIsSliding(true);
          }}
          onValueChange={value => setDraftRadiusKm(Math.round(value))}
          onSlidingComplete={value => {
            setIsSliding(false);
            onSelectRadius(Math.round(value));
          }}
        />

        <View style={styles.scaleRow}>
          <AppText variant="caption" weight="700" align="left" style={[styles.scaleText, { color: theme.subtitle }]}>
            0 {strings.kilometersSuffix}
          </AppText>
          <AppText variant="caption" weight="700" align="right" style={[styles.scaleText, { color: theme.subtitle }]}>
            200 {strings.kilometersSuffix}
          </AppText>
        </View>
      </View>

      {notice ? (
        <AppText variant="caption" tone="muted" style={[styles.notice, { color: theme.subtitle }]}>
          {notice}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: ParentDesignTokens.radius.card,
    borderWidth: 1,
    padding: ParentDesignTokens.spacing.cardInset,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 4,
    lineHeight: 18,
  },
  sliderWrap: {
    marginTop: 14,
  },
  sliderWrapCompact: {
    marginTop: 0,
  },
  sliderHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sliderLabel: {
  },
  sliderValue: {
    borderRadius: BabyCityGeometry.radius.chip,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 86,
  },
  slider: {
    marginTop: 10,
    marginHorizontal: -4,
    height: 36,
  },
  scaleRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scaleText: {},
  notice: {
    marginTop: 12,
    lineHeight: 18,
  },
});
