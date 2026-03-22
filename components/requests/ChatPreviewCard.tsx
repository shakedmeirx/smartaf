import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '@/context/AuthContext';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { strings } from '@/locales';
import { ChatThread } from '@/types/chat';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
} from '@/constants/theme';
import { confirmHideRequest, formatPreviewTimestamp } from '@/components/requests/requestUi';

export type ChatPreviewCardProps = {
  thread: ChatThread;
  onHide: (id: string) => Promise<void>;
  placeholderPhotoUrl?: string;
};

export default function ChatPreviewCard({ thread, onHide, placeholderPhotoUrl }: ChatPreviewCardProps) {
  const { activeRole } = useAuth();
  const swipeableRef = useRef<Swipeable | null>(null);
  const role = activeRole ?? 'parent';
  const isPending = thread.state === 'pending';

  function renderRightActions() {
    return (
      <View style={styles.swipeActionsWrap}>
        <TouchableOpacity
          style={styles.deleteAction}
          activeOpacity={0.86}
          onPress={() =>
            confirmHideRequest({
              swipeableRef,
              requestId: thread.requestId,
              onHide,
              title: isPending
                ? strings.inboxDeletePendingConfirmTitle
                : strings.inboxCloseChatConfirmTitle,
              message: isPending
                ? strings.inboxDeletePendingConfirmMessage
                : strings.inboxCloseChatConfirmMessage,
            })
          }
        >
          <MaterialIcons name="delete-outline" size={18} color={BabyCityPalette.surface} />
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
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push(
            `/chat?requestId=${thread.requestId}&name=${encodeURIComponent(thread.counterpartName)}`
          )
        }
      >
        <AppCard role={role} variant="list" style={styles.card}>
          <View style={styles.row}>
            <AvatarCircle
              name={thread.counterpartName}
              photoUrl={thread.counterpartPhotoUrl || placeholderPhotoUrl}
              size={44}
            />

            <View style={styles.body}>
              <View style={styles.topRow}>
                <AppText variant="bodyLarge" weight="800" numberOfLines={1} style={styles.name}>
                  {thread.counterpartName}
                </AppText>
                {isPending ? (
                  <View style={styles.pendingBadge}>
                    <AppText variant="caption" weight="800" style={styles.pendingBadgeText}>
                      {strings.chatPendingBadge}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppText
                variant="body"
                tone="muted"
                numberOfLines={1}
                style={[styles.previewText, isPending ? styles.previewTextPending : null]}
              >
                {thread.previewText}
              </AppText>
            </View>

            <View style={styles.meta}>
              <AppText variant="caption" weight="700" tone="muted" align="center">
                {formatPreviewTimestamp(thread.previewCreatedAt)}
              </AppText>
              {isPending ? (
                <View style={styles.unreadDot} />
              ) : null}
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
  },
  body: {
    flex: 1,
    alignItems: 'flex-end',
    gap: BabyCityGeometry.spacing.sm,
    minWidth: 0,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
  },
  name: {
    color: ParentDesignTokens.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  previewText: {
    width: '100%',
    textAlign: 'right',
  },
  previewTextPending: {
    color: BabyCityPalette.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BabyCityPalette.primary,
  },
  pendingBadge: {
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: BabyCityPalette.primarySoft,
    borderWidth: 1,
    borderColor: BabyCityChipTones.primary.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pendingBadgeText: {
    color: BabyCityPalette.primary,
  },
  meta: {
    width: 42,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'space-between',
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
