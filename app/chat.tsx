import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const headerTitleContent = useMemo(
    () => (
      <View style={styles.headerIdentity}>
        <AppText numberOfLines={1} variant="h2" style={styles.headerIdentityName}>
          {otherName || strings.navChats}
        </AppText>
        <AvatarCircle
          name={otherName || strings.navChats}
          photoUrl={counterpartPhotoUrl}
          size={40}
          tone={role === 'parent' ? 'accent' : 'primary'}
        />
      </View>
    ),
    [counterpartPhotoUrl, otherName, role]
  );
  const theme = {
    outgoingBubble: role === 'parent' ? BabyCityPalette.primary : BabyCityPalette.accent,
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
    sendButton: role === 'parent' ? BabyCityPalette.primary : BabyCityPalette.accent,
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
    requestGate?.status === 'declined'
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

  return (
    <AppShell
      title={otherName || strings.navChats}
      titleContent={headerTitleContent}
      subtitle={null}
      activeTab={activeTab}
      backgroundColor={shellBackground}
      showBackButton
      onBack={handleBack}
    >
      <View style={styles.flex}>
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
              <AppCard
                role={role}
                variant="default"
                backgroundColor={theme.chatSurface}
                borderColor="transparent"
                style={styles.lockedCard}
              >
                <View style={styles.pendingHeader}>
                  <View style={[styles.pendingBadge, { borderColor: theme.sendButton }]}>
                    <AppText variant="caption" weight="800" style={[styles.pendingBadgeText, { color: theme.sendButton }]}>
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
                otherName={otherName}
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
        ) : conversation === null ? (
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
                  otherName={otherName}
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
                  backgroundColor: theme.chatSurface,
                  borderTopColor: theme.chatBorder,
                  marginBottom: composerOffset,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: theme.sendButton }]}
                onPress={send}
              >
                <AppText variant="bodyLarge" weight="800" style={styles.sendButtonText}>
                  {strings.chatSend}
                </AppText>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputSurface }]}
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
          </>
        )}
      </View>
    </AppShell>
  );
}

function Bubble({
  message,
  currentUserId,
  otherName,
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
  otherName: string;
  outgoingBubble: string;
  outgoingText: string;
  outgoingTime: string;
  incomingBubble: string;
  incomingBorder: string;
  incomingText: string;
  incomingTime: string;
}) {
  const isMe = message.senderId === currentUserId;
  const displayName = !isMe ? (message.senderName ?? otherName) : null;

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={styles.bubbleWrapper}>
        {displayName ? (
          <AppText variant="caption" weight="600" style={styles.senderName}>
            {displayName}
          </AppText>
        ) : null}
        <View
          style={[
            styles.bubble,
            isMe
              ? [styles.bubbleOutgoing, { backgroundColor: outgoingBubble }]
              : [styles.bubbleIncoming, { backgroundColor: incomingBubble, borderColor: incomingBorder }],
          ]}
        >
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
        </View>
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

const styles = StyleSheet.create({
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
  },
  lockedTitle: {
    marginBottom: 10,
  },
  lockedText: {
    lineHeight: 23,
  },
  lockedButton: {
    marginTop: 18,
  },
  headerIdentity: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  headerIdentityName: {
    flexShrink: 1,
    textAlign: 'right',
  },
  pendingHeader: {
    alignItems: 'flex-end',
  },
  pendingBadge: {
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  pendingBadgeText: {
    textAlign: 'center',
  },
  messageList: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
  },
  emptyChatCard: {
    marginTop: 6,
  },
  emptyChatTitle: {
    marginBottom: 6,
  },
  emptyChatText: {
    lineHeight: 21,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '80%',
  },
  senderName: {
    color: BabyCityPalette.textTertiary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 3,
    marginRight: 6,
  },
  bubble: {
    borderRadius: BabyCityGeometry.radius.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleOutgoing: {
    borderBottomRightRadius: 8,
  },
  bubbleIncoming: {
    borderBottomLeftRadius: 8,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
  },
  bubbleTextAligned: {
    textAlign: 'right',
  },
  bubbleTime: {
    marginTop: 6,
  },
  bubbleTimeAligned: {
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 108,
    borderRadius: BabyCityGeometry.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: BabyCityPalette.textPrimary,
    writingDirection: 'rtl',
  },
  sendButton: {
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BabyCityGeometry.radius.control,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  sendButtonText: {
    color: BabyCityPalette.surface,
  },
});
