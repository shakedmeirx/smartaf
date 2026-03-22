import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  BabyCityGeometry,
  BabysitterDesignTokens,
} from '@/constants/theme';

type Props = {
  counterpartName: string;
  counterpartPhotoUrl?: string;
  statusLabel: string;
  status?: 'upcoming' | 'completed' | 'active';
  dateLabel: string;
  timeLabel?: string;
  areaLabel?: string;
  childrenLabel?: string;
  notePreview?: string;
  onPress?: () => void;
  actionLabel?: string;
  onActionPress?: () => void;
  actionDisabled?: boolean;
};

function Content({
  counterpartName,
  counterpartPhotoUrl,
  statusLabel,
  status = 'upcoming',
  dateLabel,
  timeLabel,
  areaLabel,
  childrenLabel,
  notePreview,
  actionLabel,
  onActionPress,
  actionDisabled = false,
}: Omit<Props, 'onPress'>) {
  return (
    <AppCard role="babysitter" variant="list" style={styles.card}>
      <View style={styles.headerRow}>
        <AvatarCircle
          name={counterpartName}
          photoUrl={counterpartPhotoUrl}
          size={56}
          tone="accent"
        />

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

      {notePreview ? (
        <AppText variant="body" tone="muted" numberOfLines={2} style={styles.notePreview}>
          {notePreview}
        </AppText>
      ) : null}

      {(timeLabel || areaLabel || childrenLabel) ? (
        <View style={styles.metaRow}>
          {timeLabel ? <AppChip label={timeLabel} tone="muted" size="sm" /> : null}
          {areaLabel ? <AppChip label={areaLabel} tone="accent" size="sm" /> : null}
          {childrenLabel ? <AppChip label={childrenLabel} tone="primary" size="sm" /> : null}
        </View>
      ) : null}

      {actionLabel ? (
        <AppButton
          label={actionLabel}
          variant="secondary"
          fullWidth={false}
          style={styles.actionButton}
          onPress={onActionPress}
          disabled={actionDisabled}
        />
      ) : null}
    </AppCard>
  );
}

export default function BabysitterScheduleCard(props: Props) {
  if (!props.onPress) {
    return <Content {...props} />;
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={props.onPress}>
      <Content {...props} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: BabyCityGeometry.spacing.xs,
  },
  nameRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
  },
  metaRow: {
    marginTop: BabyCityGeometry.spacing.md,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
  },
  notePreview: {
    marginTop: BabyCityGeometry.spacing.sm,
    lineHeight: 21,
  },
  actionButton: {
    alignSelf: 'flex-end',
    marginTop: BabyCityGeometry.spacing.md,
  },
});
