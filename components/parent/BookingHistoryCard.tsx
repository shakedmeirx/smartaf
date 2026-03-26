import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
} from '@/constants/theme';

type Props = {
  counterpartName: string;
  counterpartPhotoUrl?: string;
  statusLabel: string;
  status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'upcoming' | 'draft' | 'active';
  dateLabel: string;
  timeLabel?: string;
  locationLabel?: string;
  onPress?: () => void;
};

export default function BookingHistoryCard({
  counterpartName,
  counterpartPhotoUrl,
  statusLabel,
  status = 'completed',
  dateLabel,
  timeLabel,
  locationLabel,
  onPress,
}: Props) {
  const content = (
    <AppCard variant="list" style={styles.card}>
      <View style={styles.topRow}>
        <StatusBadge label={statusLabel} status={status} style={styles.statusBadge} />

        <View style={styles.identityRow}>
          <AvatarCircle
            name={counterpartName}
            photoUrl={counterpartPhotoUrl}
            size={58}
            tone="muted"
          />

          <View style={styles.identity}>
            <AppText variant="h3" weight="800" numberOfLines={1} style={styles.nameText}>
              {counterpartName}
            </AppText>
            <AppText variant="body" tone="muted" style={styles.dateText}>
              {dateLabel}
            </AppText>
          </View>
        </View>
      </View>

      {(locationLabel || timeLabel) ? (
        <View style={styles.footerRow}>
          {locationLabel ? (
            <View style={styles.metaItem}>
              <AppText variant="body" tone="muted" numberOfLines={1} style={styles.metaText}>
                {locationLabel}
              </AppText>
              <Ionicons name="location-outline" size={15} color={BabyCityPalette.primary} />
            </View>
          ) : null}

          {timeLabel ? (
            <View style={styles.metaItem}>
              <AppText variant="body" tone="muted" numberOfLines={1} style={styles.metaText}>
                {timeLabel}
              </AppText>
              <Ionicons name="time-outline" size={15} color={BabyCityPalette.primary} />
            </View>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.md,
  },
  statusBadge: {
    marginTop: 2,
  },
  identityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
    flex: 1,
    minWidth: 0,
  },
  identity: {
    alignItems: 'flex-end',
    gap: BabyCityGeometry.spacing.xs,
    minWidth: 0,
    flex: 1,
  },
  nameText: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  dateText: {
    textAlign: 'right',
  },
  footerRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.md,
    paddingTop: BabyCityGeometry.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(162,173,196,0.12)',
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.xs,
    borderRadius: ParentDesignTokens.radius.control,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    paddingVertical: 9,
    paddingHorizontal: 13,
    maxWidth: '100%',
  },
  metaText: {
    textAlign: 'right',
  },
});
