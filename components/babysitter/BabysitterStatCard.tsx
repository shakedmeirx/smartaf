import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import {
  BabyCityChipTones,
  BabyCityPalette,
  BabyCityShadows,
  BabysitterDesignTokens,
  BabyCityGeometry,
} from '@/constants/theme';

type StatTone = 'primary' | 'accent' | 'success' | 'muted' | 'warning' | 'indigo';
type StatVariant = 'default' | 'premium';

type Props = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconNode?: ReactNode;
  tone?: StatTone;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
  layout?: 'inline' | 'stacked';
  emphasis?: 'value' | 'label';
  variant?: StatVariant;
  badgeLabel?: string;
  badgeTone?: StatTone;
};

const toneMap: Record<StatTone, { background: string; color: string; border?: string }> = {
  primary: {
    background: BabyCityPalette.primarySoft,
    color: BabyCityPalette.primary,
    border: '#d8cfee',
  },
  accent: {
    background: BabyCityChipTones.accent.background,
    color: BabyCityChipTones.accent.text,
    border: BabyCityChipTones.accent.border,
  },
  success: {
    background: BabyCityPalette.successSoft,
    color: BabyCityPalette.success,
    border: '#cfeee7',
  },
  muted: {
    background: BabysitterDesignTokens.surfaces.cardMuted,
    color: BabysitterDesignTokens.text.secondary,
    border: BabyCityPalette.borderSoft,
  },
  warning: {
    background: '#fff3e0',
    color: '#bb7a15',
    border: '#ffcc80',
  },
  indigo: {
    background: '#eef2ff',
    color: '#6366f1',
    border: '#dbeafe',
  },
};

export default function BabysitterStatCard({
  label,
  value,
  icon = 'sparkles-outline',
  iconNode,
  tone = 'accent',
  style,
  fill = true,
  layout = 'inline',
  emphasis = 'value',
  variant = 'default',
  badgeLabel,
  badgeTone = tone,
}: Props) {
  const palette = toneMap[tone];
  const badgePalette = toneMap[badgeTone];
  const isStacked = layout === 'stacked';
  const isLabelPrimary = emphasis === 'label';
  const isPremium = variant === 'premium';
  const valueColor = isPremium ? '#ffffff' : BabysitterDesignTokens.text.primary;
  const labelColor = isPremium ? 'rgba(255,255,255,0.82)' : BabysitterDesignTokens.text.secondary;
  const badgeTextColor = isPremium ? '#ffffff' : badgePalette.color;

  return (
    <View
      style={[
        styles.card,
        fill ? styles.fillCard : null,
        isStacked ? styles.cardStacked : null,
        isPremium ? styles.premiumCard : null,
        style,
      ]}
    >
      {isPremium ? <View style={styles.premiumGlow} /> : null}
      {badgeLabel ? (
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              isPremium
                ? styles.badgePremium
                : {
                    backgroundColor: badgePalette.background,
                    borderColor: badgePalette.border ?? 'transparent',
                  },
            ]}
          >
            <AppText
              variant="caption"
              weight="700"
              style={[styles.badgeText, { color: badgeTextColor }]}
            >
              {badgeLabel}
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={[styles.content, isStacked ? styles.contentStacked : null]}>
        <View
          style={[
            styles.iconWrap,
            isPremium
              ? styles.iconWrapPremium
              : { backgroundColor: palette.background },
          ]}
        >
          {iconNode ?? (
            <Ionicons
              name={icon}
              size={18}
              color={isPremium ? '#ffffff' : palette.color}
            />
          )}
        </View>

        <View style={[styles.textWrap, isStacked ? styles.textWrapStacked : null]}>
          {isLabelPrimary ? (
            <>
              <AppText
                variant={isStacked ? 'h3' : 'h2'}
                weight="800"
                align={isStacked ? 'center' : 'right'}
                numberOfLines={2}
                style={[
                  styles.labelPrimary,
                  { color: valueColor },
                  isStacked ? styles.labelPrimaryStacked : null,
                ]}
              >
                {label}
              </AppText>
              <AppText
                variant="bodyLarge"
                align={isStacked ? 'center' : 'right'}
                numberOfLines={2}
                style={[
                  { color: labelColor },
                  isStacked ? styles.valueSecondaryStacked : null,
                ]}
              >
                {value}
              </AppText>
            </>
          ) : (
            <>
              <AppText
                variant="h3"
                weight="800"
                style={[
                  styles.value,
                  { color: valueColor },
                  isStacked ? styles.valueStacked : null,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {value}
              </AppText>
              <AppText
                variant="caption"
                align={isStacked ? 'center' : 'right'}
                numberOfLines={isStacked ? 3 : 1}
                style={[
                  { color: labelColor },
                  isStacked ? styles.labelStacked : null,
                ]}
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
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: BabyCityGeometry.radius.card,
    padding: BabyCityGeometry.spacing.lg,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.outline}22`,
    ...BabyCityShadows.soft,
  },
  premiumCard: {
    backgroundColor: BabyCityPalette.primary,
    borderWidth: 0,
    overflow: 'hidden',
    ...BabyCityShadows.elevated,
  },
  fillCard: {
    flex: 1,
  },
  cardStacked: {
    minHeight: 132,
  },
  premiumGlow: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginBottom: BabyCityGeometry.spacing.md,
  },
  badge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePremium: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  badgeText: {
    lineHeight: 14,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapPremium: {
    backgroundColor: 'rgba(255,255,255,0.18)',
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
  },
  valueStacked: {
    textAlign: 'center',
  },
  labelPrimary: {
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
