import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import {
  BabyCityChipTones,
  BabyCityPalette,
  BabysitterDesignTokens,
  BabyCityGeometry,
} from '@/constants/theme';

type StatTone = 'primary' | 'accent' | 'success' | 'muted';

type Props = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: StatTone;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
  layout?: 'inline' | 'stacked';
  emphasis?: 'value' | 'label';
};

const toneMap: Record<StatTone, { background: string; color: string }> = {
  primary: {
    background: BabyCityPalette.primarySoft,
    color: BabyCityPalette.primary,
  },
  accent: {
    background: BabyCityChipTones.accent.background,
    color: BabyCityChipTones.accent.text,
  },
  success: {
    background: BabyCityPalette.successSoft,
    color: BabyCityPalette.success,
  },
  muted: {
    background: BabysitterDesignTokens.surfaces.cardMuted,
    color: BabysitterDesignTokens.text.secondary,
  },
};

export default function BabysitterStatCard({
  label,
  value,
  icon = 'sparkles-outline',
  tone = 'accent',
  style,
  fill = true,
  layout = 'inline',
  emphasis = 'value',
}: Props) {
  const palette = toneMap[tone];
  const isStacked = layout === 'stacked';
  const isLabelPrimary = emphasis === 'label';

  return (
    <View
      style={[
        styles.card,
        fill ? styles.fillCard : null,
        isStacked ? styles.cardStacked : null,
        style,
      ]}
    >
      <View style={[styles.content, isStacked ? styles.contentStacked : null]}>
        <View style={[styles.iconWrap, { backgroundColor: palette.background }]}>
          <Ionicons name={icon} size={18} color={palette.color} />
        </View>

        <View style={[styles.textWrap, isStacked ? styles.textWrapStacked : null]}>
          {isLabelPrimary ? (
            <>
              <AppText
                variant={isStacked ? 'h3' : 'h2'}
                weight="800"
                align={isStacked ? 'center' : 'right'}
                numberOfLines={2}
                style={[styles.labelPrimary, isStacked ? styles.labelPrimaryStacked : null]}
              >
                {label}
              </AppText>
              <AppText
                variant="bodyLarge"
                tone="muted"
                align={isStacked ? 'center' : 'right'}
                numberOfLines={2}
                style={isStacked ? styles.valueSecondaryStacked : null}
              >
                {value}
              </AppText>
            </>
          ) : (
            <>
              <AppText
                variant="h3"
                weight="800"
                style={[styles.value, isStacked ? styles.valueStacked : null]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {value}
              </AppText>
              <AppText
                variant="caption"
                tone="muted"
                align={isStacked ? 'center' : 'right'}
                numberOfLines={isStacked ? 3 : 1}
                style={isStacked ? styles.labelStacked : null}
              >
                {label}
              </AppText>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceContainer,
    borderRadius: BabyCityGeometry.radius.control,
    padding: BabyCityGeometry.spacing.md,
  },
  fillCard: {
    flex: 1,
  },
  cardStacked: {
    minHeight: 132,
  },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
  },
  contentStacked: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  textWrapStacked: {
    flex: 0,
    width: '100%',
    alignItems: 'center',
  },
  value: {
    color: BabysitterDesignTokens.text.primary,
  },
  valueStacked: {
    textAlign: 'center',
  },
  labelPrimary: {
    color: BabysitterDesignTokens.text.primary,
    width: '100%',
  },
  labelPrimaryStacked: {
    textAlign: 'center',
  },
  valueSecondaryStacked: {
    minHeight: 40,
  },
  labelStacked: {
    paddingHorizontal: 4,
    lineHeight: 18,
    minHeight: 36,
  },
});
