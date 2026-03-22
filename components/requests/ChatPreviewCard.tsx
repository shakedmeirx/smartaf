import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '@/context/AuthContext';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { strings } from '@/locales';
import { ChatThread } from '@/types/chat';
import {
  BabyCityPalette,
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
  const isPending = thread.state === 'pending';
  const isActive = thread.state === 'active';

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
        style={styles.card}
        onPress={() =>
          router.push(
            `/chat?requestId=${thread.requestId}&name=${encodeURIComponent(thread.counterpartName)}`
          )
        }
      >
        <View style={styles.row}>
          {/* Avatar with optional online dot */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatarBorder}>
              <AvatarCircle
                name={thread.counterpartName}
                photoUrl={thread.counterpartPhotoUrl || placeholderPhotoUrl}
                size={60}
              />
            </View>
            {isActive ? (
              <View style={styles.onlineDot} />
            ) : null}
          </View>

          {/* Body */}
          <View style={styles.body}>
            <AppText
              variant="bodyLarge"
              weight={isPending ? '800' : '600'}
              numberOfLines={1}
              style={styles.name}
            >
              {thread.counterpartName}
            </AppText>
            <AppText
              variant="body"
              tone="muted"
              numberOfLines={1}
              style={[
                styles.previewText,
                isPending ? styles.previewTextPending : null,
              ]}
            >
              {thread.previewText}
            </AppText>
          </View>

          {/* Meta: time + unread dot */}
          <View style={styles.meta}>
            <AppText variant="caption" weight="700" tone="muted" align="center">
              {formatPreviewTimestamp(thread.previewCreatedAt)}
            </AppText>
            {isPending ? (
              <View style={styles.unreadDot} />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: -8 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarBorder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(112,42,225,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  body: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 0,
  },
  name: {
    color: '#242f41',
    width: '100%',
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#702ae1',
  },
  meta: {
    minWidth: 42,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swipeActionsWrap: {
    justifyContent: 'center',
    marginBottom: 12,
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
