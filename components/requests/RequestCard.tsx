import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import StatusBadge from '@/components/ui/StatusBadge';
import { strings } from '@/locales';
import { Request, RequestStatus } from '@/types/request';
import {
  AppRole,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
  getRoleTheme,
} from '@/constants/theme';
import { confirmHideRequest, formatPreviewTimestamp } from '@/components/requests/requestUi';

export type RequestCardProps = {
  role: AppRole;
  request: Request;
  canRespond: boolean;
  onUpdateStatus: (
    id: string,
    status: RequestStatus
  ) => Promise<{ success: boolean; redirectRequestId?: string }>;
  onHide: (id: string) => Promise<void>;
};

function getStatusLabel(status: RequestStatus) {
  switch (status) {
    case 'accepted':
      return strings.inboxStatusAccepted;
    case 'declined':
      return strings.inboxStatusDeclined;
    default:
      return strings.inboxStatusPending;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="body" weight="500" style={styles.detailValue}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.detailLabel}>
        {label}
      </AppText>
    </View>
  );
}

export default function RequestCard({
  role,
  request,
  canRespond,
  onUpdateStatus,
  onHide,
}: RequestCardProps) {
  const theme = getRoleTheme(role);
  const swipeableRef = useRef<Swipeable | null>(null);
  const {
    id,
    status,
    date,
    time,
    area,
    numChildren,
    childAgeRange,
    note,
    counterpartName,
    counterpartPhotoUrl,
    requestType,
    createdAt,
  } = request;
  const displayName = counterpartName ?? strings.notFilled;
  const isQuick = requestType === 'quick_message';
  const previewTimestamp = formatPreviewTimestamp(createdAt);

  async function handleAccept() {
    const result = await onUpdateStatus(id, 'accepted');

    if (result.success && result.redirectRequestId) {
      router.replace(
        `/chat?requestId=${result.redirectRequestId}&name=${encodeURIComponent(displayName)}`
      );
    }
  }

  function renderRightActions() {
    return (
      <View style={styles.swipeActionsWrap}>
        <TouchableOpacity
          style={styles.deleteAction}
          activeOpacity={0.86}
          onPress={() =>
            confirmHideRequest({
              swipeableRef,
              requestId: id,
              onHide,
              title: strings.inboxDeleteConfirmTitle,
              message: strings.inboxDeleteConfirmMessage,
            })
          }
        >
          <Ionicons name="trash-outline" size={18} color={BabyCityPalette.surface} />
          <AppText variant="caption" weight="800" style={styles.deleteActionText}>
            {strings.inboxDeleteAction}
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={42}
    >
      <AppCard role={role} variant="list" style={styles.card}>
        <View style={styles.headerRow}>
          <AvatarCircle name={displayName} photoUrl={counterpartPhotoUrl} size={56} />

          <View style={styles.identityWrap}>
            <View style={styles.nameRow}>
              {previewTimestamp ? (
                <AppText variant="caption" weight="700" tone="muted">
                  {previewTimestamp}
                </AppText>
              ) : null}
              <AppText variant="h2" weight="800" numberOfLines={1} style={styles.name}>
                {displayName}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.badgesRow}>
          <StatusBadge label={getStatusLabel(status)} status={status} />
          <AppChip
            label={isQuick ? strings.requestTypeQuick : strings.requestTypeFull}
            tone={isQuick ? 'accent' : 'primary'}
            size="sm"
          />
        </View>

        {note.trim() ? (
          <View style={styles.notePanel}>
            <AppText variant="caption" weight="700" tone="muted" style={styles.noteLabel}>
              {strings.quickMessageLabel}
            </AppText>
            <AppText variant="bodyLarge" style={styles.noteText}>
              {note}
            </AppText>
          </View>
        ) : null}

        {!isQuick ? (
          <View style={styles.detailsPanel}>
            <DetailRow label={strings.requestDate} value={date} />
            <DetailRow label={strings.requestTime} value={time} />
            <DetailRow label={strings.requestArea} value={area} />
            <DetailRow label={strings.requestNumChildren} value={String(numChildren)} />
            <DetailRow
              label={strings.requestChildAgeRange}
              value={childAgeRange.join(', ')}
            />
          </View>
        ) : null}

        {canRespond && status === 'pending' ? (
          <View style={styles.actionsRow}>
            <AppButton
              label={strings.inboxDecline}
              variant="secondary"
              textColor={ParentDesignTokens.text.secondary}
              backgroundColor={ParentDesignTokens.surfaces.controlMuted}
              borderColor={BabyCityPalette.border}
              onPress={() => void onUpdateStatus(id, 'declined')}
              style={styles.secondaryAction}
            />
            <AppPrimaryButton
              label={strings.inboxAccept}
              backgroundColor={theme.activeColor}
              borderColor={theme.activeColor}
              onPress={() => void handleAccept()}
              style={styles.primaryAction}
            />
          </View>
        ) : null}
      </AppCard>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
  },
  identityWrap: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  nameRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.md,
  },
  name: {
    flexShrink: 1,
    color: ParentDesignTokens.text.primary,
  },
  badgesRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.md,
    marginBottom: BabyCityGeometry.spacing.md,
  },
  notePanel: {
    borderRadius: ParentDesignTokens.radius.card,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    padding: ParentDesignTokens.spacing.cardInset,
    marginBottom: BabyCityGeometry.spacing.md,
  },
  noteLabel: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  noteText: {
    color: ParentDesignTokens.text.primary,
    lineHeight: 22,
  },
  detailsPanel: {
    gap: BabyCityGeometry.spacing.sm,
    borderRadius: ParentDesignTokens.radius.card,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    padding: ParentDesignTokens.spacing.cardInset,
    marginBottom: BabyCityGeometry.spacing.md,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: BabyCityGeometry.spacing.sm,
  },
  detailLabel: {
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    color: ParentDesignTokens.text.primary,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: BabyCityGeometry.spacing.sm,
  },
  primaryAction: {
    flex: 1,
  },
  secondaryAction: {
    flex: 1,
  },
  swipeActionsWrap: {
    justifyContent: 'center',
    marginBottom: ParentDesignTokens.spacing.cardGap,
    paddingLeft: 10,
  },
  deleteAction: {
    width: 92,
    flex: 1,
    borderRadius: 22,
    backgroundColor: BabyCityPalette.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteActionText: {
    color: BabyCityPalette.surface,
  },
});
