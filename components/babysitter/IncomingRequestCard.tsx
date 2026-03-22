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
  BabysitterDesignTokens,
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';
import { confirmHideRequest, formatPreviewTimestamp } from '@/components/requests/requestUi';

type Props = {
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
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

export default function IncomingRequestCard({
  request,
  canRespond,
  onUpdateStatus,
  onHide,
}: Props) {
  const swipeableRef = useRef<Swipeable | null>(null);
  const previewTimestamp = formatPreviewTimestamp(request.createdAt);
  const displayName = request.counterpartName ?? strings.notFilled;
  const isQuick = request.requestType === 'quick_message';

  async function handleAccept() {
    const result = await onUpdateStatus(request.id, 'accepted');

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
              requestId: request.id,
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
      <AppCard role="babysitter" variant="list" style={styles.card}>
        <View style={styles.headerRow}>
          <AvatarCircle name={displayName} photoUrl={request.counterpartPhotoUrl} size={58} tone="accent" />

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

            <View style={styles.badgesRow}>
              <StatusBadge label={getStatusLabel(request.status)} status={request.status} />
              <AppChip
                label={isQuick ? strings.requestTypeQuick : strings.requestTypeFull}
                tone={isQuick ? 'accent' : 'primary'}
                size="sm"
              />
            </View>
          </View>
        </View>

        {request.note.trim() ? (
          <View style={styles.notePanel}>
            <AppText variant="caption" weight="700" tone="muted" style={styles.noteLabel}>
              {strings.quickMessageLabel}
            </AppText>
            <AppText variant="bodyLarge" style={styles.noteText}>
              {request.note}
            </AppText>
          </View>
        ) : null}

        {!isQuick ? (
          <View style={styles.detailsPanel}>
            <DetailRow label={strings.requestDate} value={request.date} />
            <DetailRow label={strings.requestTime} value={request.time} />
            <DetailRow label={strings.requestArea} value={request.area} />
            <DetailRow label={strings.requestNumChildren} value={String(request.numChildren)} />
            <DetailRow
              label={strings.requestChildAgeRange}
              value={request.childAgeRange.join(', ')}
            />
          </View>
        ) : null}

        {canRespond && request.status === 'pending' ? (
          <View style={styles.actionsRow}>
            <AppButton
              label={strings.inboxDecline}
              variant="secondary"
              textColor={BabysitterDesignTokens.text.secondary}
              backgroundColor={BabysitterDesignTokens.surfaces.controlMuted}
              borderColor={BabyCityPalette.border}
              onPress={() => void onUpdateStatus(request.id, 'declined')}
              style={styles.secondaryAction}
            />
            <AppPrimaryButton
              label={strings.inboxAccept}
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
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
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
    gap: BabyCityGeometry.spacing.sm,
    minWidth: 0,
  },
  nameRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
  },
  name: {
    flexShrink: 1,
    color: BabysitterDesignTokens.text.primary,
  },
  badgesRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    width: '100%',
  },
  notePanel: {
    borderRadius: BabysitterDesignTokens.radius.card,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
    padding: BabysitterDesignTokens.spacing.cardInset,
    marginTop: BabyCityGeometry.spacing.md,
  },
  noteLabel: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  noteText: {
    color: BabysitterDesignTokens.text.primary,
    lineHeight: 22,
  },
  detailsPanel: {
    gap: BabyCityGeometry.spacing.sm,
    borderRadius: BabysitterDesignTokens.radius.card,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
    padding: BabysitterDesignTokens.spacing.cardInset,
    marginTop: BabyCityGeometry.spacing.md,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: BabyCityGeometry.spacing.sm,
  },
  detailValue: {
    flex: 1,
    color: BabysitterDesignTokens.text.primary,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.lg,
  },
  primaryAction: {
    flex: 1.1,
  },
  secondaryAction: {
    flex: 0.9,
  },
  swipeActionsWrap: {
    justifyContent: 'center',
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
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
