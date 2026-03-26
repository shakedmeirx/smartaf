import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
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
  showDeleteButton?: boolean;
};

export default function ChatPreviewCard({
  thread,
  onHide,
  placeholderPhotoUrl,
  showDeleteButton = false,
}: ChatPreviewCardProps) {
  const swipeableRef = useRef<Swipeable | null>(null);
  const isPending = thread.state === 'pending';
  const isActive = thread.state === 'active';

  function handleDeletePress() {
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
    });
  }

  function renderRightActions() {
    return (
      <View style={styles.swipeActionsWrap}>
        <TouchableOpacity
          style={styles.deleteAction}
          activeOpacity={0.86}
          onPress={handleDeletePress}
        >
          <MaterialIcons name="delete-outline" size={18} color={BabyCityPalette.surface} />
          <AppText variant="caption" weight="800" style={styles.deleteActionText}>
            {strings.inboxDeleteAction}
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const cardContent = (
    <TouchableOpacity
      activeOpacity={showDeleteButton ? 1 : 0.9}
      disabled={showDeleteButton}
      style={[styles.card, showDeleteButton && styles.cardInEditMode]}
      onPress={() =>
        router.push(
          `/chat?requestId=${thread.requestId}&name=${encodeURIComponent(thread.counterpartName)}`
        )
      }
    >
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarBorder}>
            <AvatarCircle
              name={thread.counterpartName}
              photoUrl={thread.counterpartPhotoUrl || placeholderPhotoUrl}
              size={60}
            />
          </View>
          {isPending ? (
            <View style={styles.unreadDotAvatar} />
          ) : null}
          {isActive ? (
            <View style={styles.onlineDot} />
          ) : null}
        </View>

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

        <View style={styles.meta}>
          <AppText variant="caption" weight="700" tone="muted" align="center">
            {formatPreviewTimestamp(thread.previewCreatedAt)}
          </AppText>
          {isPending ? <View style={styles.metaDot} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (showDeleteButton) {
    return (
      <View style={styles.editModeRow}>
        <TouchableOpacity
          style={styles.inlineDeleteButton}
          activeOpacity={0.86}
          onPress={handleDeletePress}
        >
          <MaterialIcons name="delete-outline" size={20} color={BabyCityPalette.surface} />
          <AppText variant="caption" weight="800" style={styles.deleteActionText}>
            {strings.inboxDeleteAction}
          </AppText>
        </TouchableOpacity>
        {cardContent}
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
      {cardContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  editModeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 14,
  },
  inlineDeleteButton: {
    width: 76,
    borderRadius: 24,
    backgroundColor: BabyCityPalette.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: -8 },
    elevation: 2,
  },
  cardInEditMode: {
    marginBottom: 0,
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
    borderColor: 'rgba(112,42,225,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unreadDotAvatar: {
    position: 'absolute',
    top: 4,
    left: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#702ae1',
    borderWidth: 2,
    borderColor: '#ffffff',
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
    gap: 5,
    minWidth: 0,
  },
  name: {
    color: '#242f41',
    width: '100%',
    textAlign: 'right',
    fontSize: 18,
  },
  previewText: {
    width: '100%',
    textAlign: 'right',
    fontSize: 15,
  },
  previewTextPending: {
    color: BabyCityPalette.primary,
  },
  meta: {
    minWidth: 42,
    minHeight: 56,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 10,
  },
  metaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BabyCityPalette.primary,
    marginTop: 2,
  },
  swipeActionsWrap: {
    justifyContent: 'center',
    marginBottom: 12,
    paddingLeft: 10,
  },
  deleteAction: {
    width: 92,
    flex: 1,
    borderRadius: 24,
    backgroundColor: BabyCityPalette.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteActionText: {
    color: BabyCityPalette.surface,
  },
});
