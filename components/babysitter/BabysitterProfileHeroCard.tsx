import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import ProfilePhotoHero from '@/components/profile/ProfilePhotoHero';
import { strings } from '@/locales';
import {
  BabyCityChipTones,
  BabysitterDesignTokens,
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';

type HeroBadge = {
  label: string;
  tone?: 'primary' | 'accent' | 'success' | 'muted' | 'warning';
};

type Props = {
  name: string;
  subtitle?: string;
  photoUrl?: string;
  rateLabel?: string;
  ratingLabel?: string;
  badges?: HeroBadge[];
  photoAccessorySlot?: ReactNode;
  secondaryActionSlot?: ReactNode;
  actionSlot?: ReactNode;
};

export default function BabysitterProfileHeroCard({
  name,
  subtitle,
  photoUrl,
  rateLabel,
  ratingLabel,
  badges = [],
  photoAccessorySlot,
  secondaryActionSlot,
  actionSlot,
}: Props) {
  return (
    <AppCard role="babysitter" variant="hero" style={styles.card}>
      {/* Photo block */}
      <View style={styles.photoWrap}>
        <ProfilePhotoHero
          name={name}
          profilePhotoUrl={photoUrl}
          variant="fresh"
          layout="hero"
        />
        {photoAccessorySlot ? (
          <View style={styles.photoAccessory}>{photoAccessorySlot}</View>
        ) : null}
      </View>

      {/* Identity */}
      <AppText variant="h1" weight="800" align="center" style={styles.name}>
        {name}
      </AppText>

      {subtitle ? (
        <AppText variant="bodyLarge" tone="muted" align="center" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}

      {/* Rate + rating tiles row (centered) */}
      {(rateLabel || ratingLabel) ? (
        <View style={styles.metaRow}>
          {ratingLabel ? (
            <View style={styles.ratingPill}>
              <AppText variant="caption" weight="700" style={styles.ratingText}>
                {ratingLabel}
              </AppText>
            </View>
          ) : null}
          {rateLabel ? (
            <View style={styles.rateTile}>
              <AppText variant="caption" tone="muted" style={styles.rateCaption}>
                {strings.perHour}
              </AppText>
              <AppText variant="h3" weight="800" style={styles.rateText}>
                {rateLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Trust badges (centered) */}
      {badges.length > 0 ? (
        <View style={styles.badgesWrap}>
          {badges.map(badge => (
            <AppChip
              key={`${badge.label}-${badge.tone ?? 'muted'}`}
              label={badge.label}
              tone={badge.tone ?? 'muted'}
              size="sm"
            />
          ))}
        </View>
      ) : null}

      {secondaryActionSlot ? <View style={styles.slotWrap}>{secondaryActionSlot}</View> : null}
      {actionSlot ? <View style={styles.slotWrap}>{actionSlot}</View> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  photoWrap: {
    position: 'relative',
  },
  photoAccessory: {
    position: 'absolute',
    bottom: 24,
    right: 12,
  },
  name: {
    color: BabysitterDesignTokens.text.primary,
    marginTop: BabyCityGeometry.spacing.xs,
  },
  subtitle: {
    marginTop: BabyCityGeometry.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.md,
  },
  rateTile: {
    minWidth: 112,
    borderRadius: BabysitterDesignTokens.radius.control,
    borderWidth: 1,
    borderColor: BabyCityChipTones.primary.border,
    backgroundColor: BabyCityChipTones.primary.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rateCaption: {
    marginBottom: 2,
  },
  rateText: {
    color: BabyCityPalette.primary,
  },
  ratingPill: {
    flex: 1,
    minHeight: 52,
    maxWidth: 180,
    borderRadius: BabysitterDesignTokens.radius.control,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    color: BabysitterDesignTokens.text.secondary,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.sm,
  },
  slotWrap: {
    marginTop: BabyCityGeometry.spacing.sm,
  },
});
