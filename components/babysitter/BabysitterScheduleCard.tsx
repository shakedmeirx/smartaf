import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import StatusBadge from '@/components/ui/StatusBadge';
import { strings } from '@/locales';
import {
  BabyCityGeometry,
  BabyCityPalette,
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
  variant?: 'default' | 'registration';
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
  variant = 'default',
}: Omit<Props, 'onPress'>) {
  if (variant === 'registration') {
    const registrationMetaChips = [areaLabel, childrenLabel].filter(Boolean) as string[];

    return (
      <AppCard
        role="babysitter"
        variant="list"
        backgroundColor="#ffffff"
        borderColor={`${BabyCityPalette.primary}10`}
        style={[styles.card, styles.registrationCard]}
      >
        <View style={styles.registrationHeaderRow}>
          <AvatarCircle
            name={counterpartName}
            photoUrl={counterpartPhotoUrl}
            size={52}
            tone="accent"
          />

          <View style={styles.registrationIdentity}>
            <View style={styles.registrationNameRow}>
              <View
                style={[
                  styles.registrationStatusPill,
                  status === 'active'
                    ? styles.registrationStatusActive
                    : status === 'completed'
                      ? styles.registrationStatusCompleted
                      : styles.registrationStatusUpcoming,
                ]}
              >
                <AppText
                  variant="caption"
                  weight="800"
                  style={[
                    styles.registrationStatusText,
                    status === 'active'
                      ? styles.registrationStatusTextActive
                      : status === 'completed'
                        ? styles.registrationStatusTextCompleted
                        : styles.registrationStatusTextUpcoming,
                  ]}
                >
                  {statusLabel}
                </AppText>
              </View>
              <AppText variant="h3" weight="800" numberOfLines={1}>
                {counterpartName}
              </AppText>
            </View>

            <AppText variant="caption" tone="muted" style={styles.registrationDateLabel}>
              {dateLabel}
            </AppText>
          </View>
        </View>

        <View style={styles.registrationTimeCard}>
          <View style={styles.registrationTimeHeader}>
            <MaterialIcons name="schedule" size={16} color={BabyCityPalette.primary} />
            <AppText variant="caption" weight="800" style={styles.registrationTimeTitle}>
              {strings.babysitterShiftHoursLabel}
            </AppText>
          </View>

          <View style={styles.registrationTimeField}>
            <AppText variant="caption" weight="700" style={styles.registrationFieldLabel}>
              {strings.babysitterShiftStartLabel}
            </AppText>
            <AppText variant="bodyLarge" weight="800" style={styles.registrationTimeValue}>
              {timeLabel || strings.babysitterCalendarNoTime}
            </AppText>
          </View>

          {registrationMetaChips.length ? (
            <View style={styles.registrationChipRow}>
              {registrationMetaChips.map(label => (
                <View key={label} style={styles.registrationChip}>
                  <AppText variant="caption" weight="700" style={styles.registrationChipText}>
                    {label}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {notePreview ? (
          <View style={styles.registrationNoteWrap}>
            <AppText variant="caption" weight="700" style={styles.registrationFieldLabel}>
              {strings.babysitterShiftNotesLabel}
            </AppText>
            <AppText
              variant="body"
              tone="muted"
              numberOfLines={3}
              style={styles.registrationNoteText}
            >
              {notePreview}
            </AppText>
          </View>
        ) : null}

        {actionLabel ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={onActionPress}
            disabled={actionDisabled}
            style={[
              styles.registrationActionButton,
              actionDisabled && styles.registrationActionButtonDisabled,
            ]}
          >
            <MaterialIcons name="arrow-back" size={18} color="#ffffff" />
            <AppText variant="body" weight="800" style={styles.registrationActionText}>
              {actionLabel}
            </AppText>
          </TouchableOpacity>
        ) : null}
      </AppCard>
    );
  }

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
    return <Content {...props} variant={props.variant} />;
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={props.onPress}>
      <Content {...props} variant={props.variant} />
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
  registrationCard: {
    borderRadius: 30,
    marginBottom: 12,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  registrationHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
  },
  registrationIdentity: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 4,
  },
  registrationNameRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
  },
  registrationStatusPill: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BabyCityGeometry.radius.pill,
  },
  registrationStatusActive: {
    backgroundColor: BabyCityPalette.successSoft,
  },
  registrationStatusCompleted: {
    backgroundColor: BabyCityPalette.primarySoft,
  },
  registrationStatusUpcoming: {
    backgroundColor: BabyCityPalette.accentSoft,
  },
  registrationStatusText: {
    textAlign: 'center',
  },
  registrationStatusTextActive: {
    color: BabyCityPalette.success,
  },
  registrationStatusTextCompleted: {
    color: BabyCityPalette.primary,
  },
  registrationStatusTextUpcoming: {
    color: '#2f7de1',
  },
  registrationDateLabel: {
    textAlign: 'right',
  },
  registrationTimeCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: `${BabyCityPalette.primary}08`,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}12`,
  },
  registrationTimeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  registrationTimeTitle: {
    color: BabyCityPalette.primary,
  },
  registrationTimeField: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  registrationFieldLabel: {
    color: `${BabyCityPalette.primary}99`,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'right',
  },
  registrationTimeValue: {
    marginTop: 3,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  registrationChipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  registrationChip: {
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}12`,
  },
  registrationChipText: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
  },
  registrationNoteWrap: {
    marginTop: 16,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
  },
  registrationNoteText: {
    marginTop: 6,
    lineHeight: 21,
    textAlign: 'right',
  },
  registrationActionButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BabyCityGeometry.radius.control,
    backgroundColor: BabyCityPalette.primary,
  },
  registrationActionButtonDisabled: {
    opacity: 0.6,
  },
  registrationActionText: {
    color: '#ffffff',
  },
});
