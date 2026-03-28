import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import {
  BabysitterDesignTokens,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
  getRoleTheme,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppContext';
import { strings } from '@/locales';
import { Conversation, Message } from '@/types/chat';
import { RequestInitiator, RequestStatus } from '@/types/request';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/pushNotifications';

function rowToMessage(row: Record<string, unknown>): Message {
  const usersJoin = row.users as { name?: string } | null;
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    text: row.text as string,
    createdAt: row.created_at as string,
    senderName: usersJoin?.name,
  };
}

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id:                  row.id as string,
    requestId:           row.request_id as string,
    parentId:            row.parent_id as string,
    babysitterId:        row.babysitter_id as string,
    createdAt:           row.created_at as string,
    closedAt:            (row.closed_at as string | null) ?? null,
    closedByUserId:      (row.closed_by_user_id as string | null) ?? null,
    lastMessageAt:       (row.last_message_at as string | null) ?? null,
    lastMessageSenderId: (row.last_message_sender_id as string | null) ?? null,
    lastMessageText:     (row.last_message_text as string | null) ?? null,
  };
}

function errorMatches(
  error: { message?: string | null; details?: string | null; hint?: string | null; code?: string | null } | null | undefined,
  expected: string
) {
  if (!error) return false;

  const haystack = [error.message, error.details, error.hint, error.code]
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .join(' ')
    .toLowerCase();

  return haystack.includes(expected.toLowerCase());
}

type ChatRequestGate = {
  id: string;
  parentId: string;
  babysitterId: string;
  initiatedBy: RequestInitiator;
  status: RequestStatus;
  note: string;
  createdAt: string;
  seedSenderId: string;
  counterpartUserId: string; // other user's user_id (for push notifications)
};

export default function ChatScreen() {
  const { requestId, name } = useLocalSearchParams<{
    requestId: string;
    name: string;
  }>();
  const { activeRole } = useAuth();
  const {
    conversations,
    chatThreads,
    currentUserId,
    incomingRequests,
    refreshParentData,
    refreshBabysitterData,
    sentRequests,
    setActiveConversationId,
    markConversationRead,
    isUserExcluded,
  } = useAppState();
  const insets = useSafeAreaInsets();

  const [conversation, setConversation] = useState<Conversation | null | undefined>(undefined);
  const [requestGate, setRequestGate] = useState<ChatRequestGate | null | undefined>(undefined);
  const [isClosedConversation, setIsClosedConversation] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);

  const role = activeRole ?? 'parent';
  const design = role === 'babysitter' ? BabysitterDesignTokens : ParentDesignTokens;
  const activeTab = 'chats';
  const otherName = typeof name === 'string' ? name : '';
  const roleTheme = getRoleTheme(role);
  const shellBackground = roleTheme.screenBackground;
  const conversationId = conversation?.id;
  const isCounterpartBlocked =
    !!requestGate?.counterpartUserId && isUserExcluded(requestGate.counterpartUserId);

  // Register this screen as the "active conversation" so the in-app banner
  // is suppressed for new messages arriving in this exact chat.
  useEffect(() => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    markConversationRead(conversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId]);

  const bottomBarReservedSpace = 70 + Math.max(insets.bottom, 8);
  const composerOffset = Math.max(keyboardHeight - bottomBarReservedSpace, 0);
  const counterpartPhotoUrl = useMemo(() => {
    const threadPhoto = chatThreads.find(thread => thread.requestId === requestId)?.counterpartPhotoUrl;

    if (threadPhoto) {
      return threadPhoto;
    }

    const requestPhoto = [...incomingRequests, ...sentRequests].find(
      request => request.id === requestId
    )?.counterpartPhotoUrl;

    return requestPhoto ?? undefined;
  }, [chatThreads, incomingRequests, requestId, sentRequests]);
  const headerStatus = useMemo(() => {
    if (requestGate?.status === 'pending') {
      return {
        label: strings.chatPendingBadge,
        color: '#f59e0b',
      };
    }

    if (requestGate?.status === 'declined') {
      return {
        label: strings.chatDeclinedTitle,
        color: BabyCityPalette.error,
      };
    }

    if (isClosedConversation) {
      return {
        label: strings.chatClosedTitle,
        color: BabyCityPalette.textTertiary,
      };
    }

    if (conversation) {
      return {
        label: strings.chatStatusActive,
        color: '#22c55e',
      };
    }

    return {
      label: strings.chatPreparingTitle,
      color: BabyCityPalette.primary,
    };
  }, [conversation, isClosedConversation, requestGate?.status]);
  const headerTitleContent = useMemo(
    () => (
      <View style={styles.headerIdentity}>
        <View style={styles.headerIdentityText}>
          <AppText numberOfLines={1} variant="h2" style={styles.headerIdentityName}>
            {otherName || strings.navChats}
          </AppText>
          <View style={styles.headerStatusRow}>
            <AppText variant="caption" weight="700" style={styles.headerStatusText}>
              {headerStatus.label}
            </AppText>
            <View style={[styles.headerStatusDot, { backgroundColor: headerStatus.color }]} />
          </View>
        </View>

        <View style={styles.headerAvatarWrap}>
          <AvatarCircle
            name={otherName || strings.navChats}
            photoUrl={counterpartPhotoUrl}
            size={48}
            tone={role === 'parent' ? 'accent' : 'primary'}
          />
          <View style={styles.headerAvatarBadge}>
            <LinearGradient
              colors={[BabyCityPalette.primary, '#8a4af3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerAvatarBadgeGradient}
            >
              <MaterialIcons name="stars" size={10} color="#ffffff" />
            </LinearGradient>
          </View>
        </View>
      </View>
    ),
    [counterpartPhotoUrl, headerStatus.color, headerStatus.label, otherName, role]
  );
  const theme = {
    outgoingBubble: BabyCityPalette.primary,
    outgoingText: BabyCityPalette.surface,
    outgoingTime: 'rgba(255,255,255,0.8)',
    incomingBubble: BabyCityPalette.surface,
    incomingBorder: BabyCityPalette.borderSoft,
    incomingText: BabyCityPalette.textPrimary,
    incomingTime: BabyCityPalette.textTertiary,
    chatSurface: roleTheme.highlightedSurface,
    chatBorder: roleTheme.highlightedBorder,
    inputSurface: BabyCityPalette.surface,
    inputBorder: BabyCityPalette.border,
    sendButton: BabyCityPalette.primary,
  };

  const canRepairConversation =
    !!requestGate &&
    requestGate.status === 'accepted' &&
    ((role === 'parent' && requestGate.initiatedBy === 'babysitter') ||
      (role === 'babysitter' && requestGate.initiatedBy === 'parent'));
  const isOutgoingPendingRequest =
    !!requestGate &&
    requestGate.status === 'pending' &&
    requestGate.initiatedBy === role;

  useEffect(() => {
    setConversation(undefined);
    setRequestGate(undefined);
    setIsClosedConversation(false);
    setMessages([]);
  }, [requestId]);

  const refreshRoleData = useCallback(async () => {
    if (role === 'parent') {
      await refreshParentData();
    } else {
      await refreshBabysitterData();
    }
  }, [refreshBabysitterData, refreshParentData, role]);

  const reloadRequestGate = useCallback(async () => {
    const { data } = await supabase
      .from('requests')
      .select(`
        id,
        parent_id,
        babysitter_id,
        initiated_by,
        status,
        note,
        created_at,
        babysitter_profile:babysitter_profiles!babysitter_id ( user_id )
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (!data) {
      setRequestGate(null);
      return;
    }

    setRequestGate({
      id: data.id as string,
      parentId: data.parent_id as string,
      babysitterId: data.babysitter_id as string,
      initiatedBy: data.initiated_by as RequestInitiator,
      status: data.status as RequestStatus,
      note: (data.note as string | null) ?? '',
      createdAt: data.created_at as string,
      seedSenderId:
        (data.initiated_by as RequestInitiator) === 'parent'
          ? (data.parent_id as string)
          : ((data.babysitter_profile as { user_id?: string | null } | null)?.user_id as string) ??
            '',
      counterpartUserId:
        role === 'babysitter'
          ? (data.parent_id as string)
          : ((data.babysitter_profile as { user_id?: string | null } | null)?.user_id as string) ?? '',
    });
  }, [requestId]);

  const findActivePairConversation = useCallback(
    async (parentId: string, babysitterId: string) => {
      const localConversation = conversations.find(
        item =>
          item.parentId === parentId &&
          item.babysitterId === babysitterId &&
          !item.closedAt
      );

      if (localConversation) {
        return localConversation;
      }

      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('parent_id', parentId)
        .eq('babysitter_id', babysitterId)
        .is('closed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data ? rowToConversation(data as Record<string, unknown>) : null;
    },
    [conversations]
  );

  useEffect(() => {
    let isMounted = true;

    reloadRequestGate().then(() => {
      if (!isMounted) return;
    });

    return () => {
      isMounted = false;
    };
  }, [reloadRequestGate]);

  const syncConversationState = useCallback(async () => {
    if (requestGate === undefined) return;

    const existingConversation = conversations.find(
      item => item.requestId === requestId && !item.closedAt
    );

    if (existingConversation) {
      setIsClosedConversation(false);
      setConversation(existingConversation);
      return;
    }

    const { data: existingRow } = await supabase
      .from('conversations')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    if (existingRow) {
      const mappedConversation = rowToConversation(existingRow as Record<string, unknown>);

      if (mappedConversation.closedAt) {
        setIsClosedConversation(true);
        setConversation(null);
        return;
      }

      setIsClosedConversation(false);
      setConversation(mappedConversation);
      return;
    }

    if (requestGate?.status === 'accepted') {
      const pairConversation = await findActivePairConversation(
        requestGate.parentId,
        requestGate.babysitterId
      );

      if (pairConversation) {
        if (pairConversation.closedAt) {
          setIsClosedConversation(true);
          setConversation(null);
          return;
        }

        setIsClosedConversation(false);
        setConversation(pairConversation);
        return;
      }
    }

    if (requestGate?.status === 'accepted' && canRepairConversation) {
      const { data: insertedRow } = await supabase
        .from('conversations')
        .insert({
          request_id: requestGate.id,
          parent_id: requestGate.parentId,
          babysitter_id: requestGate.babysitterId,
        })
        .select()
        .maybeSingle();

      if (insertedRow) {
        setIsClosedConversation(false);
        setConversation(rowToConversation(insertedRow as Record<string, unknown>));
        await refreshRoleData();
        return;
      }

      const { data: retriedRow } = await supabase
        .from('conversations')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle();

      const mappedConversation = retriedRow
        ? rowToConversation(retriedRow as Record<string, unknown>)
        : null;

      if (mappedConversation?.closedAt) {
        setIsClosedConversation(true);
        setConversation(null);
        return;
      }

      setIsClosedConversation(false);
      setConversation(mappedConversation);
      return;
    }

    setIsClosedConversation(false);
    setConversation(null);
  }, [
    canRepairConversation,
    conversations,
    findActivePairConversation,
    refreshRoleData,
    requestGate,
    requestId,
  ]);

  useEffect(() => {
    void syncConversationState();
  }, [syncConversationState]);

  useEffect(() => {
    if (!conversationId) return;

    supabase
      .from('messages')
      .select('*, users!sender_id(name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return;

        const loadedMessages = data.map(rowToMessage);
        setMessages(loadedMessages);
      });
  }, [conversationId, requestGate]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, event => {
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const incoming = rowToMessage(payload.new as Record<string, unknown>);
          setMessages(prev =>
            prev.find(message => message.id === incoming.id) ? prev : [...prev, incoming]
          );
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat_state:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${requestId}`,
        },
        payload => {
          const row = payload.new as Record<string, unknown>;
          setRequestGate({
            id: row.id as string,
            parentId: row.parent_id as string,
            babysitterId: row.babysitter_id as string,
            initiatedBy: row.initiated_by as RequestInitiator,
            status: row.status as RequestStatus,
            note: (row.note as string | null) ?? '',
            createdAt: row.created_at as string,
            seedSenderId:
              (row.initiated_by as RequestInitiator) === 'parent'
                ? (row.parent_id as string)
                : requestGate?.seedSenderId ?? '',
            counterpartUserId: requestGate?.counterpartUserId ?? '',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `request_id=eq.${requestId}`,
        },
        payload => {
          const nextConversation = rowToConversation(payload.new as Record<string, unknown>);
          if (nextConversation.closedAt) {
            setIsClosedConversation(true);
            setConversation(null);
            return;
          }
          setIsClosedConversation(false);
          setConversation(nextConversation);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `request_id=eq.${requestId}`,
        },
        payload => {
          const nextConversation = rowToConversation(payload.new as Record<string, unknown>);
          if (nextConversation.closedAt) {
            setIsClosedConversation(true);
            setConversation(null);
            void refreshRoleData();
            return;
          }
          setIsClosedConversation(false);
          setConversation(nextConversation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshRoleData, requestGate?.seedSenderId, requestId]);

  async function send() {
    const text = draft.trim();
    if (!text || !conversation || conversation.closedAt) return;
    if (isCounterpartBlocked) {
      Alert.alert(strings.userBlockedTitle, strings.userBlockedBody);
      return;
    }

    setDraft('');

    const optimistic: Message = {
      id: `msg_tmp_${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUserId,
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: currentUserId,
        text,
      })
      .select()
      .single();

    if (error) {
      setMessages(prev => prev.filter(message => message.id !== optimistic.id));
      await Promise.all([reloadRequestGate(), syncConversationState(), refreshRoleData()]);
      if (errorMatches(error, 'user-blocked')) {
        Alert.alert(strings.userBlockedTitle, strings.userBlockedBody);
      }
      return;
    }

    if (data) {
      setMessages(prev =>
        prev.map(message =>
          message.id === optimistic.id ? rowToMessage(data as Record<string, unknown>) : message
        )
      );
    }

    // Push notification to the other user (fire-and-forget)
    if (requestGate?.counterpartUserId) {
      void sendPushToUser(
        requestGate.counterpartUserId,
        otherName || strings.inAppNewMessage,
        text,
        { requestId }
      );
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(role === 'parent' ? '/parent-requests' : '/babysitter-inbox');
  }

  async function handleRetryConversation() {
    setConversation(undefined);
    setIsClosedConversation(false);
    await reloadRequestGate();
  }

  function handleStartNewRequest() {
    if (!requestGate) {
      handleBack();
      return;
    }

    const targetId =
      role === 'parent' ? requestGate.babysitterId : requestGate.parentId;
    const targetRole = role === 'parent' ? 'babysitter' : 'parent';

    router.replace(
      `/send-request?id=${targetId}&name=${encodeURIComponent(otherName)}&targetRole=${targetRole}`
    );
  }

  const lockedState =
    isCounterpartBlocked
      ? {
          title: strings.userBlockedTitle,
          body: strings.userBlockedBody,
          showRetry: false,
          showRequestAgain: false,
        }
      : requestGate?.status === 'declined'
      ? {
          title: strings.chatDeclinedTitle,
          body: strings.chatDeclinedBody,
          showRetry: false,
          showRequestAgain: false,
        }
      : isClosedConversation
        ? {
            title: strings.chatClosedTitle,
            body: strings.chatClosedBody,
            showRetry: false,
            showRequestAgain: true,
        }
      : requestGate?.status === 'accepted' && conversation === null
        ? {
            title: strings.chatPreparingTitle,
            body: strings.chatPreparingBody,
            showRetry: true,
            showRequestAgain: false,
          }
        : {
            title: strings.chatLockedTitle,
            body: strings.chatLockedBody,
            showRetry: false,
            showRequestAgain: false,
          };
  const pendingSeedMessages =
    isOutgoingPendingRequest && requestGate && requestGate.note.trim() !== '' && requestGate.seedSenderId
      ? [
          {
            id: `pending_request_seed_${requestGate.id}`,
            conversationId: `pending_${requestGate.id}`,
            senderId: requestGate.seedSenderId,
            text: requestGate.note.trim(),
            createdAt: requestGate.createdAt,
          } satisfies Message,
        ]
      : [];
  const seededThreadMessages =
    requestGate && requestGate.note.trim() !== '' && requestGate.seedSenderId
      ? [
          {
            id: `request_seed_${requestGate.id}`,
            conversationId: conversation?.id ?? `pending_${requestGate.id}`,
            senderId: requestGate.seedSenderId,
            text: requestGate.note.trim(),
            createdAt: requestGate.createdAt,
          } satisfies Message,
          ...messages,
        ]
      : messages;
  const visibleMessages = conversation === null && isOutgoingPendingRequest
    ? pendingSeedMessages
    : seededThreadMessages;
  const messageDayBadge = useMemo(() => {
    if (!visibleMessages.length) {
      return null;
    }

    const uniqueDayKeys = new Set(visibleMessages.map(message => getMessageDayKey(message.createdAt)));
    if (uniqueDayKeys.size !== 1) {
      return null;
    }

    return formatDayBadge(visibleMessages[0]?.createdAt);
  }, [visibleMessages]);
  const messageListHeader = messageDayBadge ? (
    <View style={styles.dateBadgeWrap}>
      <View style={styles.dateBadge}>
        <AppText variant="caption" weight="800" style={styles.dateBadgeText}>
          {messageDayBadge}
        </AppText>
      </View>
    </View>
  ) : null;

  return (
    <AppShell
      title={otherName || strings.navChats}
      titleContent={headerTitleContent}
      subtitle={null}
      activeTab={activeTab}
      backgroundColor={shellBackground}
      showBackButton
      backButtonVariant="icon"
      onBack={handleBack}
      hideHeaderMenuButton
      swapHeaderEdgeControls
      renderHeaderActions={() => <View style={styles.headerSpacer} />}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(112,42,225,0.12)', 'rgba(112,42,225,0.02)', 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.backdropGlowTop}
        />
        <LinearGradient
          colors={['rgba(112,42,225,0.1)', 'rgba(112,42,225,0.02)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.backdropGlowBottom}
        />
        {requestGate === undefined || conversation === undefined ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.sendButton} />
          </View>
        ) : conversation === null && isOutgoingPendingRequest ? (
          <FlatList
            ref={listRef}
            data={pendingSeedMessages}
            keyExtractor={item => item.id}
            style={[styles.flex, { backgroundColor: shellBackground }]}
            contentContainerStyle={[
              styles.messageList,
              { paddingHorizontal: design.spacing.pageHorizontal },
            ]}
            ListHeaderComponent={
              <View style={styles.pendingHeaderWrap}>
                {messageListHeader}
                <AppCard
                  role={role}
                  variant="default"
                  backgroundColor={theme.chatSurface}
                  borderColor="transparent"
                  style={[styles.lockedCard, styles.pendingCard]}
                >
                  <View style={styles.pendingHeader}>
                    <View style={[styles.pendingBadge, { borderColor: `${theme.sendButton}22` }]}>
                      <AppText
                        variant="caption"
                        weight="800"
                        style={[styles.pendingBadgeText, { color: theme.sendButton }]}
                      >
                        {strings.chatPendingBadge}
                      </AppText>
                    </View>
                    <AppText variant="h2" weight="800" style={styles.lockedTitle}>
                      {strings.chatPendingTitle}
                    </AppText>
                    <AppText variant="body" tone="muted" style={styles.lockedText}>
                      {strings.chatPendingBody}
                    </AppText>
                  </View>
                </AppCard>
              </View>
            }
            ListEmptyComponent={
              <AppCard
                role={role}
                variant="default"
                backgroundColor={theme.chatSurface}
                borderColor="transparent"
                style={styles.emptyChatCard}
              >
                <AppText variant="body" tone="muted" style={styles.emptyChatText}>
                  {strings.chatPendingBody}
                </AppText>
              </AppCard>
            }
            renderItem={({ item }) => (
              <Bubble
                message={item}
                currentUserId={currentUserId}
                outgoingBubble={theme.outgoingBubble}
                outgoingText={theme.outgoingText}
                outgoingTime={theme.outgoingTime}
                incomingBubble={theme.incomingBubble}
                incomingBorder={theme.incomingBorder}
                incomingText={theme.incomingText}
                incomingTime={theme.incomingTime}
              />
            )}
          />
        ) : conversation === null || isCounterpartBlocked ? (
          <View style={styles.centered}>
            <AppCard
              role={role}
              variant="default"
              backgroundColor={theme.chatSurface}
              borderColor={theme.chatBorder}
              style={styles.lockedCard}
            >
              <AppText variant="h2" weight="800" style={styles.lockedTitle}>
                {lockedState.title}
              </AppText>
              <AppText variant="body" tone="muted" style={styles.lockedText}>
                {lockedState.body}
              </AppText>
              {lockedState.showRetry ? (
                <AppPrimaryButton
                  label={strings.chatRetry}
                  backgroundColor={theme.sendButton}
                  borderColor={theme.sendButton}
                  onPress={handleRetryConversation}
                  style={styles.lockedButton}
                />
              ) : null}
              {lockedState.showRequestAgain ? (
                <AppPrimaryButton
                  label={strings.chatClosedCta}
                  backgroundColor={theme.sendButton}
                  borderColor={theme.sendButton}
                  onPress={handleStartNewRequest}
                  style={styles.lockedButton}
                />
              ) : null}
            </AppCard>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={seededThreadMessages}
              keyExtractor={item => item.id}
              style={[styles.flex, { backgroundColor: shellBackground }]}
              contentContainerStyle={[
                styles.messageList,
                { paddingHorizontal: design.spacing.pageHorizontal },
              ]}
              ListHeaderComponent={messageListHeader}
              ListEmptyComponent={
                <AppCard
                  role={role}
                  variant="default"
                  backgroundColor={theme.chatSurface}
                  borderColor="transparent"
                  style={styles.emptyChatCard}
                >
                  <AppText variant="h3" weight="800" style={styles.emptyChatTitle}>
                    {strings.chatWelcome}
                  </AppText>
                  <AppText variant="body" tone="muted" style={styles.emptyChatText}>
                    {strings.chatNoMessages}
                  </AppText>
                </AppCard>
              }
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => (
                <Bubble
                  message={item}
                  currentUserId={currentUserId}
                  outgoingBubble={theme.outgoingBubble}
                  outgoingText={theme.outgoingText}
                  outgoingTime={theme.outgoingTime}
                  incomingBubble={theme.incomingBubble}
                  incomingBorder={theme.incomingBorder}
                  incomingText={theme.incomingText}
                  incomingTime={theme.incomingTime}
                />
              )}
            />

            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: 'rgba(255,255,255,0.88)',
                  borderTopColor: `${BabyCityPalette.primary}14`,
                  marginBottom: composerOffset,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
                onPress={send}
                activeOpacity={0.85}
                disabled={!draft.trim()}
              >
                <LinearGradient
                  colors={[BabyCityPalette.primary, '#8a4af3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButtonGradient}
                >
                  <MaterialIcons name="send" size={24} color="#ffffff" style={styles.sendIcon} />
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={strings.chatPlaceholder}
                  placeholderTextColor={BabyCityPalette.textTertiary}
                  textAlign="right"
                  multiline
                  blurOnSubmit={false}
                  returnKeyType="default"
                  submitBehavior="newline"
                />
              </View>
            </View>
          </>
        )}
      </View>
    </AppShell>
  );
}

function Bubble({
  message,
  currentUserId,
  outgoingBubble,
  outgoingText,
  outgoingTime,
  incomingBubble,
  incomingBorder,
  incomingText,
  incomingTime,
}: {
  message: Message;
  currentUserId: string;
  outgoingBubble: string;
  outgoingText: string;
  outgoingTime: string;
  incomingBubble: string;
  incomingBorder: string;
  incomingText: string;
  incomingTime: string;
}) {
  const isMe = message.senderId === currentUserId;

  const bubbleContent = (
    <>
      <AppText
        style={[
          styles.bubbleText,
          styles.bubbleTextAligned,
          { color: isMe ? outgoingText : incomingText },
        ]}
      >
        {message.text}
      </AppText>
      <AppText
        variant="caption"
        weight="600"
        style={[
          styles.bubbleTime,
          styles.bubbleTimeAligned,
          { color: isMe ? outgoingTime : incomingTime },
        ]}
      >
        {formatTime(message.createdAt)}
      </AppText>
    </>
  );

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={styles.bubbleWrapper}>
        {isMe ? (
          <LinearGradient
            colors={[outgoingBubble, '#8a4af3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleOutgoing]}
          >
            {bubbleContent}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.bubble,
              styles.bubbleIncoming,
              { backgroundColor: incomingBubble, borderColor: incomingBorder },
            ]}
          >
            {bubbleContent}
          </View>
        )}
      </View>
    </View>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getMessageDayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayBadge(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if (getMessageDayKey(value) === todayKey) {
    return strings.chatTodayBadge;
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backdropGlowTop: {
    position: 'absolute',
    top: -24,
    right: -64,
    width: 260,
    height: 220,
    borderRadius: 999,
  },
  backdropGlowBottom: {
    position: 'absolute',
    left: -72,
    bottom: 120,
    width: 220,
    height: 200,
    borderRadius: 999,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockedCard: {
    width: '100%',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  lockedTitle: {
    marginBottom: 10,
    color: BabyCityPalette.textPrimary,
  },
  lockedText: {
    lineHeight: 23,
  },
  lockedButton: {
    marginTop: 18,
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  headerIdentity: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  headerIdentityText: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 1,
  },
  headerIdentityName: {
    flexShrink: 1,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    fontSize: 15,
    lineHeight: 20,
  },
  headerStatusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  headerStatusText: {
    color: BabyCityPalette.textSecondary,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  headerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  headerAvatarWrap: {
    position: 'relative',
  },
  headerAvatarBadge: {
    position: 'absolute',
    left: -3,
    bottom: -3,
    padding: 2,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerAvatarBadgeGradient: {
    width: 16,
    height: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingHeaderWrap: {
    gap: 14,
  },
  pendingHeader: {
    alignItems: 'flex-end',
  },
  pendingBadge: {
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
    backgroundColor: `${BabyCityPalette.primary}10`,
  },
  pendingBadgeText: {
    textAlign: 'center',
  },
  pendingCard: {
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  dateBadgeWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBadge: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}10`,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  dateBadgeText: {
    color: BabyCityPalette.primary,
    letterSpacing: 0.8,
  },
  messageList: {
    flexGrow: 1,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 14,
  },
  emptyChatCard: {
    marginTop: 10,
    borderRadius: 30,
  },
  emptyChatTitle: {
    marginBottom: 6,
  },
  emptyChatText: {
    lineHeight: 21,
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '85%',
  },
  bubble: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bubbleOutgoing: {
    borderBottomRightRadius: 6,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  bubbleIncoming: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 23,
    writingDirection: 'rtl',
    fontWeight: '500',
  },
  bubbleTextAligned: {
    textAlign: 'right',
  },
  bubbleTime: {
    marginTop: 8,
    fontSize: 10,
  },
  bubbleTimeAligned: {
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}14`,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 108,
    paddingHorizontal: 8,
    paddingVertical: 13,
    fontSize: 15,
    color: BabyCityPalette.textPrimary,
    writingDirection: 'rtl',
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  sendButtonDisabled: {
    opacity: 0.48,
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    transform: [{ rotate: '180deg' }],
  },
});
