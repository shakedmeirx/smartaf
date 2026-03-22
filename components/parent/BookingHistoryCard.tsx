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
  locationLabel?: string;
  amountLabel?: string;
  onPress?: () => void;
};

export default function BookingHistoryCard({
  counterpartName,
  counterpartPhotoUrl,
  statusLabel,
  status = 'completed',
  dateLabel,
  locationLabel,
  amountLabel,
  onPress,
}: Props) {
  const content = (
    <AppCard variant="list" style={styles.card}>
      <View style={styles.topRow}>
        <AvatarCircle name={counterpartName} photoUrl={counterpartPhotoUrl} size={54} />

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <StatusBadge label={statusLabel} status={status} />
            <AppText variant="h3" weight="800" numberOfLines={1}>
              {counterpartName}
            </AppText>
          </View>
          <AppText variant="body" tone="muted">
            {dateLabel}
          </AppText>
        </View>
      </View>

      {(locationLabel || amountLabel) ? (
        <View style={styles.metaRow}>
          {amountLabel ? (
            <View style={styles.metaItem}>
              <AppText variant="body" weight="700">
                {amountLabel}
              </AppText>
              <Ionicons name="wallet-outline" size={16} color={BabyCityPalette.textSecondary} />
            </View>
          ) : null}
          {locationLabel ? (
            <View style={styles.metaItem}>
              <AppText variant="body" tone="muted" numberOfLines={1}>
                {locationLabel}
              </AppText>
              <Ionicons name="location-outline" size={16} color={BabyCityPalette.textSecondary} />
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
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
  },
  identity: {
    flex: 1,
    alignItems: 'flex-end',
    gap: BabyCityGeometry.spacing.xs,
    minWidth: 0,
  },
  nameRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.md,
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.xs,
    borderRadius: ParentDesignTokens.radius.control,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
});
