import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import ProfilePhotoHero from '@/components/profile/ProfilePhotoHero';
import {
  BabyCityGeometry,
  ParentDesignTokens,
} from '@/constants/theme';

type Props = {
  name: string;
  subtitle?: string;
  photoUrl?: string;
  badgeLabel?: string;
  badgeTone?: 'primary' | 'accent' | 'success' | 'muted' | 'warning';
  photoAccessorySlot?: ReactNode;
  actionSlot?: ReactNode;
  secondaryActionSlot?: ReactNode;
  metaSlot?: ReactNode;
};

export default function ProfileHeroCard({
  name,
  subtitle,
  photoUrl,
  badgeLabel,
  badgeTone = 'primary',
  photoAccessorySlot,
  actionSlot,
  secondaryActionSlot,
  metaSlot,
}: Props) {
  return (
    <AppCard variant="hero" style={styles.card}>
      {/* Photo block */}
      <View style={styles.photoWrap}>
        <ProfilePhotoHero
          name={name}
          profilePhotoUrl={photoUrl}
          variant="warm"
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

      {badgeLabel ? (
        <View style={styles.badgeRow}>
          <AppChip label={badgeLabel} tone={badgeTone} />
        </View>
      ) : null}

      {metaSlot ? <View style={styles.slotWrap}>{metaSlot}</View> : null}
      {secondaryActionSlot ? <View style={styles.slotWrap}>{secondaryActionSlot}</View> : null}
      {actionSlot ? <View style={styles.slotWrap}>{actionSlot}</View> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    // Override hero padding: photo area needs tighter top, content needs comfortable sides
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  photoWrap: {
    position: 'relative',
  },
  photoAccessory: {
    position: 'absolute',
    // bottom: 24 → stays within the photo (above the ProfilePhotoHero marginBottom:16)
    bottom: 24,
    right: 12,
  },
  name: {
    color: ParentDesignTokens.text.primary,
    marginTop: BabyCityGeometry.spacing.xs,
  },
  subtitle: {
    marginTop: BabyCityGeometry.spacing.xs,
  },
  badgeRow: {
    alignItems: 'center',
    marginTop: BabyCityGeometry.spacing.sm,
  },
  slotWrap: {
    marginTop: BabyCityGeometry.spacing.sm,
  },
});
