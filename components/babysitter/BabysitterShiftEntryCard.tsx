import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import {
  BabyCityGeometry,
  BabysitterDesignTokens,
  BabyCityPalette,
} from '@/constants/theme';
import { strings } from '@/locales';
import {
  BabysitterShift,
} from '@/types/shift';
import {
  formatShiftCurrency,
  formatShiftHours,
} from '@/lib/babysitterShifts';

type Props = {
  shift: BabysitterShift;
  onEditPress?: (shift: BabysitterShift) => void;
  onDeletePress?: (shift: BabysitterShift) => void;
  onTogglePaymentPress?: (shift: BabysitterShift) => void;
  deleting?: boolean;
  paymentUpdating?: boolean;
  editing?: boolean;
  placeholderPhotoUrl?: string;
};

function formatShiftDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BabysitterShiftEntryCard({
  shift,
  onEditPress,
  onDeletePress,
  onTogglePaymentPress,
  deleting = false,
  paymentUpdating = false,
  editing = false,
  placeholderPhotoUrl,
}: Props) {
  const isPaid = shift.paymentStatus === 'paid';

  return (
    <AppCard
      role="babysitter"
      variant="list"
      style={[styles.card, editing && styles.cardEditing]}
      borderColor={editing ? BabyCityPalette.primary : undefined}
    >
      <View style={styles.headerRow}>
        <AvatarCircle name={shift.parentName} photoUrl={placeholderPhotoUrl} size={44} />

        <View style={styles.identity}>
          <AppText variant="h3" weight="800" numberOfLines={1}>
            {shift.parentName}
          </AppText>
          <AppText variant="body" tone="muted">
            {formatShiftDate(shift.shiftDate)}
          </AppText>
        </View>

        <View style={styles.amountWrap}>
          <AppText variant="caption" tone="muted" style={styles.amountLabel}>
            {strings.babysitterShiftTotalLabel}
          </AppText>
          <AppText variant="h3" weight="800" style={styles.amount}>
            {formatShiftCurrency(shift.totalAmount)}
          </AppText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <AppChip
          label={`${shift.startTime} ${strings.babysitterShiftTimeRangeSeparator} ${shift.endTime}`}
          tone="accent"
          size="sm"
        />
        <AppChip
          label={`${formatShiftHours(shift.hoursWorked)} ${strings.babysitterShiftManagerSummaryHours}`}
          tone="success"
          size="sm"
        />
        <AppChip
          label={`${formatShiftCurrency(shift.hourlyRate)} ${strings.perHour}`}
          tone="primary"
          size="sm"
        />
        <AppChip
          label={isPaid ? strings.babysitterShiftPaid : strings.babysitterShiftUnpaid}
          tone={isPaid ? 'success' : 'muted'}
          size="sm"
        />
      </View>

      {shift.notes.trim() ? (
        <View style={styles.notesWrap}>
          <AppText variant="body" tone="muted" style={styles.notes}>
            {shift.notes}
          </AppText>
        </View>
      ) : null}

      {onEditPress || onDeletePress || onTogglePaymentPress ? (
        <View style={styles.actionsRow}>
          {onTogglePaymentPress ? (
            <AppButton
              label={isPaid ? strings.babysitterShiftMarkUnpaid : strings.babysitterShiftMarkPaid}
              variant={isPaid ? 'secondary' : 'primary'}
              fullWidth={false}
              loading={paymentUpdating}
              backgroundColor={isPaid ? BabyCityPalette.surface : BabyCityPalette.success}
              borderColor={isPaid ? BabyCityPalette.border : BabyCityPalette.success}
              textColor={isPaid ? BabyCityPalette.textPrimary : BabyCityPalette.surface}
              onPress={() => onTogglePaymentPress(shift)}
              style={styles.actionButton}
            />
          ) : null}
          {onEditPress ? (
            <AppButton
              label={editing ? strings.babysitterShiftUpdate : strings.babysitterShiftEdit}
              variant="secondary"
              fullWidth={false}
              onPress={() => onEditPress(shift)}
              backgroundColor={editing ? BabyCityPalette.primarySoft : BabyCityPalette.surface}
              borderColor={editing ? '#d7d4ff' : BabyCityPalette.border}
              textColor={editing ? BabyCityPalette.primary : BabyCityPalette.textPrimary}
              style={styles.actionButton}
            />
          ) : null}
        </View>
      ) : null}

      {onDeletePress ? (
        <View style={styles.deleteRow}>
          <AppButton
            label={strings.babysitterShiftDelete}
            variant="ghost"
            fullWidth={false}
            loading={deleting}
            textColor={BabyCityPalette.error}
            spinnerColor={BabyCityPalette.error}
            onPress={() => onDeletePress(shift)}
            style={styles.deleteButton}
          />
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  cardEditing: {
    borderWidth: 2,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.md,
  },
  amountWrap: {
    minWidth: 110,
    alignItems: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BabyCityGeometry.radius.control,
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
  },
  amount: {
    color: BabyCityPalette.success,
    textAlign: 'right',
  },
  amountLabel: {
    marginBottom: 4,
    textAlign: 'right',
  },
  identity: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
    gap: 4,
  },
  metaRow: {
    marginTop: BabyCityGeometry.spacing.md,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
  },
  notesWrap: {
    marginTop: BabyCityGeometry.spacing.md,
    paddingTop: BabyCityGeometry.spacing.md,
  },
  notes: {
    lineHeight: 22,
    textAlign: 'right',
  },
  actionsRow: {
    marginTop: BabyCityGeometry.spacing.md,
    flexDirection: 'row-reverse',
    gap: BabyCityGeometry.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  deleteRow: {
    marginTop: BabyCityGeometry.spacing.sm,
    flexDirection: 'row-reverse',
  },
  deleteButton: {
    alignSelf: 'flex-end',
  },
});
