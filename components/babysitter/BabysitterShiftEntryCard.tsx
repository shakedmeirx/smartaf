import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppText from '@/components/ui/AppText';
import { MaterialIcons } from '@expo/vector-icons';
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
  /** When true, renders with reduced opacity (older month groups) */
  dimmed?: boolean;
};

function formatShiftDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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
  dimmed = false,
}: Props) {
  const isPaid = shift.paymentStatus === 'paid';

  const statusBg = isPaid ? '#E7F7EF' : '#FFF7ED';
  const statusText = isPaid ? '#059669' : '#EA580C';
  const statusLabel = isPaid ? strings.babysitterShiftPaid : strings.babysitterShiftUnpaid;

  const timeRangeLabel = `${shift.startTime} - ${shift.endTime} • ${formatShiftHours(shift.hoursWorked)} ${strings.babysitterShiftManagerSummaryHours}`;

  return (
    <AppCard
      role="babysitter"
      variant="list"
      style={[
        styles.card,
        editing && styles.cardEditing,
        dimmed && styles.cardDimmed,
      ]}
      borderColor={editing ? BabyCityPalette.primary : undefined}
    >
      {/* Main row: avatar+info on the right, price+badge on the left */}
      <View style={styles.mainRow}>
        {/* Price + status badge (left in RTL = visual right for LTR readers, but we keep RTL) */}
        <View style={styles.priceCol}>
          <AppText style={styles.priceText}>
            {formatShiftCurrency(shift.totalAmount)}
          </AppText>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <AppText style={[styles.statusText, { color: statusText }]}>
              {statusLabel}
            </AppText>
          </View>
        </View>

        {/* Family info */}
        <View style={styles.infoCol}>
          <AppText variant="h3" weight="800" numberOfLines={1} style={styles.familyName}>
            {shift.parentName}
          </AppText>
          <AppText variant="body" tone="muted" style={styles.dateText}>
            {formatShiftDate(shift.shiftDate)}
          </AppText>

          {/* Timer chip */}
          <View style={styles.timerChip}>
            <MaterialIcons name="timer" size={13} color={BabyCityPalette.textSecondary} />
            <AppText style={styles.timerText}>{timeRangeLabel}</AppText>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {placeholderPhotoUrl ? (
            <Image
              source={{ uri: placeholderPhotoUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <MaterialIcons name="history" size={22} color={BabyCityPalette.textSecondary} />
            </View>
          )}
          <View style={styles.avatarBadge}>
            <MaterialIcons name="check-circle" size={16} color={BabyCityPalette.primary} />
          </View>
        </View>
      </View>

      {/* Notes */}
      {shift.notes.trim() ? (
        <View style={styles.notesWrap}>
          <AppText variant="body" tone="muted" style={styles.notes}>
            {shift.notes}
          </AppText>
        </View>
      ) : null}

      {/* Action buttons */}
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

const AVATAR_SIZE = 56;

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
  cardDimmed: {
    opacity: 0.8,
  },
  mainRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    flexShrink: 0,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#d5e3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
    gap: 2,
  },
  familyName: {
    textAlign: 'right',
    fontSize: 16,
  },
  dateText: {
    fontSize: 13,
    textAlign: 'right',
  },
  timerChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: '#ecf1ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '600',
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
  },
  priceCol: {
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 64,
  },
  priceText: {
    fontSize: 19,
    fontWeight: '700',
    color: BabyCityPalette.primary,
    textAlign: 'left',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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
