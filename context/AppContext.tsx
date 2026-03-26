import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Babysitter } from '@/types/babysitter';
import { UserRole } from '@/types/user';
import { Request, RequestDraft, RequestInitiator, RequestStatus, RequestType } from '@/types/request';
import { ChatThread, Conversation } from '@/types/chat';
import { FamilyPreview } from '@/types/family';
import { ParentPost, PostDraft } from '@/types/post';
import { calculateAgeFromBirthDate } from '@/lib/birthDate';
import { getBabysitterPhotoUrl } from '@/lib/babysitterPhotos';
import { formatAvailabilitySlotLabel } from '@/lib/babysitterAvailability';
import { rowToBabysitter } from '@/lib/babysitterProfile';
import { Coordinates } from '@/lib/location';
import {
  resolveParentPhotoUrl,
  rowToFamilyPreview,
  rowToParentPost,
  rowToParentProfileSummary,
} from '@/lib/parentProfile';
import { normalizeRequestDate, normalizeRequestTime } from '@/lib/requestFormat';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/pushNotifications';
import { strings } from '@/locales';

// ─── Row → domain mappers ─────────────────────────────────────────────────────

function joinedName(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;

  if ('name' in value && typeof value.name === 'string') {
    return value.name;
  }

  return undefined;
}

function requestErrorMatches(
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

function rowToRequest(
  row: Record<string, unknown>,
  viewerRole: UserRole,
  counterpartPhotoUrl?: string
): Request {
  const parentUserRow = joinedName(row.parent_user ?? row.users);
  const babysitterProfileRow =
    row.babysitter_profile as {
      profile_photo_path?: string | null;
      user?: { name?: string } | null;
    } | null;
  const babysitterName = joinedName(babysitterProfileRow?.user);
  const initiatedBy = row.initiated_by as RequestInitiator;
  const babysitterPhotoUrl = babysitterProfileRow?.profile_photo_path
    ? getBabysitterPhotoUrl(babysitterProfileRow.profile_photo_path)
    : undefined;

  return {
    id:            row.id as string,
    parentId:      row.parent_id as string,
    babysitterId:  row.babysitter_id as string,
    initiatedBy,
    requestType:   (row.request_type as RequestType) ?? 'full_childcare',
    status:        row.status as RequestStatus,
    date:          row.date as string,
    time:          row.time as string,
    numChildren:   row.num_children as number,
    childAgeRange: row.child_age_range as string[],
    area:          row.area as string,
    note:          row.note as string,
    createdAt:     row.created_at as string,
    counterpartName: viewerRole === 'parent' ? babysitterName : parentUserRow,
    counterpartPhotoUrl: viewerRole === 'parent' ? babysitterPhotoUrl : counterpartPhotoUrl,
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


async function attachLatestMessagesToRequests(
  requests: Request[],
  conversations: Conversation[]
): Promise<Request[]> {
  const acceptedRequests = requests.filter(request => request.status === 'accepted');

  if (acceptedRequests.length === 0 || conversations.length === 0) {
    return requests;
  }

  const conversationByRequestId = new Map(
    conversations.map(conversation => [conversation.requestId, conversation])
  );
  const acceptedConversationIds = Array.from(
    new Set(
      acceptedRequests
        .map(request => conversationByRequestId.get(request.id)?.id)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (acceptedConversationIds.length === 0) {
    return requests;
  }

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id, text, created_at')
    .in('conversation_id', acceptedConversationIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('attachLatestMessagesToRequests error:', error.message);
    return requests;
  }

  const latestMessageByConversationId = new Map<
    string,
    { text: string; createdAt: string }
  >();

  for (const row of data ?? []) {
    const conversationId = row.conversation_id as string;

    if (!latestMessageByConversationId.has(conversationId)) {
      latestMessageByConversationId.set(conversationId, {
        text: (row.text as string | null) ?? '',
        createdAt: row.created_at as string,
      });
    }
  }

  return requests.map(request => {
    const conversation = conversationByRequestId.get(request.id);

    if (!conversation) {
      return request;
    }

    const latestMessage = latestMessageByConversationId.get(conversation.id);

    if (!latestMessage) {
      return request;
    }

    return {
      ...request,
      lastMessageText: latestMessage.text,
      lastMessageCreatedAt: latestMessage.createdAt,
    };
  });
}

function buildChatThreads(
  requests: Request[],
  conversations: Conversation[],
  viewerRole?: UserRole
): ChatThread[] {
  if (!viewerRole) {
    return [];
  }

  const conversationByRequestId = new Map(
    conversations.map(conversation => [conversation.requestId, conversation])
  );
  const pairKeyForRequest = (request: Request) => `${request.parentId}:${request.babysitterId}`;
  const activeByPair = new Map<string, ChatThread>();
  const pendingByPair = new Map<string, ChatThread>();

  const buildThread = (request: Request): ChatThread => {
    const conversation = conversationByRequestId.get(request.id);
    const isPending = request.status === 'pending' && request.initiatedBy === viewerRole;
    const fallbackPreview =
      request.note.trim() !== ''
        ? request.note.trim()
        : isPending
          ? strings.chatPendingPreview
          : request.requestType === 'quick_message'
            ? strings.requestTypeQuick
            : strings.requestTypeFull;

    return {
      requestId: request.id,
      conversationId: conversation?.id,
      parentId: request.parentId,
      babysitterId: request.babysitterId,
      counterpartName: request.counterpartName ?? strings.notFilled,
      counterpartPhotoUrl: request.counterpartPhotoUrl,
      previewText: request.lastMessageText?.trim() || fallbackPreview,
      previewCreatedAt:
        request.lastMessageCreatedAt ??
        conversation?.createdAt ??
        request.createdAt,
      counterpartRole: viewerRole === 'parent' ? ('babysitter' as const) : ('parent' as const),
      state: isPending ? ('pending' as const) : ('active' as const),
      requestStatus: request.status,
      isAwaitingApproval: isPending,
    };
  };

  for (const request of requests) {
    const conversation = conversationByRequestId.get(request.id);
    const pairKey = pairKeyForRequest(request);
    const isOutgoingPending =
      request.status === 'pending' && request.initiatedBy === viewerRole;
    const isActiveAccepted =
      request.status === 'accepted' &&
      !!conversation &&
      !conversation.closedAt;

    if (isActiveAccepted) {
      const nextThread = buildThread(request);
      const currentThread = activeByPair.get(pairKey);

      if (
        !currentThread ||
        new Date(nextThread.previewCreatedAt).getTime() >
          new Date(currentThread.previewCreatedAt).getTime()
      ) {
        activeByPair.set(pairKey, nextThread);
      }

      continue;
    }

    if (!isOutgoingPending || activeByPair.has(pairKey)) {
      continue;
    }

    const nextThread = buildThread(request);
    const currentThread = pendingByPair.get(pairKey);

    if (
      !currentThread ||
      new Date(nextThread.previewCreatedAt).getTime() >
        new Date(currentThread.previewCreatedAt).getTime()
    ) {
      pendingByPair.set(pairKey, nextThread);
    }
  }

  return [...activeByPair.values(), ...pendingByPair.values()].sort(
    (a, b) =>
      new Date(b.previewCreatedAt).getTime() - new Date(a.previewCreatedAt).getTime()
  );
}

function sortRequestsByCreatedAtDesc(a: Request, b: Request) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function normalizeVisibleRequests(requests: Request[]) {
  const uniqueById = new Map<string, Request>();

  for (const request of requests) {
    uniqueById.set(request.id, request);
  }

  const latestPendingBySenderPair = new Map<string, Request>();
  const normalized: Request[] = [];

  for (const request of Array.from(uniqueById.values()).sort(sortRequestsByCreatedAtDesc)) {
    if (request.status !== 'pending') {
      normalized.push(request);
      continue;
    }

    const pendingKey = `${request.parentId}:${request.babysitterId}:${request.initiatedBy}`;
    if (!latestPendingBySenderPair.has(pendingKey)) {
      latestPendingBySenderPair.set(pendingKey, request);
    }
  }

  return [...normalized, ...latestPendingBySenderPair.values()].sort(sortRequestsByCreatedAtDesc);
}

function upsertRequests(previous: Request[], incoming: Request[]) {
  return normalizeVisibleRequests([...previous, ...incoming]);
}

function upsertConversations(previous: Conversation[], incoming: Conversation[]) {
  const byId = new Map<string, Conversation>(
    previous.map(conversation => [conversation.id, conversation])
  );

  for (const conversation of incoming) {
    byId.set(conversation.id, conversation);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function clearLocallyHiddenRequestIds(visibleRequestIds: string[], hiddenIds: Set<string>) {
  if (visibleRequestIds.length === 0 || hiddenIds.size === 0) {
    return hiddenIds;
  }

  const next = new Set(hiddenIds);

  for (const requestId of visibleRequestIds) {
    next.delete(requestId);
  }

  return next;
}

async function mergeParentProfileDetailsIntoPosts(rows: Record<string, unknown>[]) {
  const parentIds = [...new Set(rows.map(row => row.parent_id as string).filter(Boolean))];

  if (parentIds.length === 0) {
    return rows.map(row => rowToParentPost(row));
  }

  const { data: profileRows, error } = await supabase
    .from('parent_profiles')
    .select('id, user_id, city, latitude, longitude, profile_photo_path')
    .in('user_id', parentIds);

  if (error) {
    console.error('mergeParentProfileDetailsIntoPosts error:', error.message);
    return rows.map(row => rowToParentPost(row));
  }

  const profilesByUserId = new Map(
    (profileRows ?? []).map(profileRow => [
      profileRow.user_id as string,
      rowToParentProfileSummary(profileRow as Record<string, unknown>),
    ])
  );

  return rows.map(row => rowToParentPost(row, profilesByUserId.get(row.parent_id as string)));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AppState = {
  babysitters: Babysitter[];
  babysittersLoading: boolean;
  families: FamilyPreview[];
  familiesLoading: boolean;
  posts: ParentPost[];
  postsLoading: boolean;
  myPosts: ParentPost[];
  incomingRequests: Request[];
  sentRequests: Request[];
  chatThreads: ChatThread[];
  conversations: Conversation[];

  // The logged-in user's ID (empty string when not authenticated)
  currentUserId: string;
  currentBabysitterProfileId: string | null;

  // Favorites (parent only — set of babysitter_profile IDs)
  favoriteBabysitterIds: Set<string>;
  toggleFavorite: (babysitterId: string) => Promise<void>;

  // Saved posts (babysitter only — set of post IDs)
  savedPostIds: Set<string>;
  toggleSavedPost: (postId: string) => Promise<void>;

  // Actions
  updateRequestStatus: (
    id: string,
    status: RequestStatus
  ) => Promise<{ success: boolean; redirectRequestId?: string }>;
  hideRequest: (id: string) => Promise<void>;
  addRequest: (
    draft: RequestDraft,
    targetId: string,
    targetRole: UserRole
  ) => Promise<{ success: boolean; errorMessage?: string }>;
  addPost: (draft: PostDraft) => Promise<{ success: boolean; errorMessage?: string }>;
  updatePost: (
    id: string,
    draft: PostDraft
  ) => Promise<{ success: boolean; errorMessage?: string }>;
  togglePostActive: (id: string, isActive: boolean) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  saveCurrentRoleCoordinates: (coordinates: Coordinates) => Promise<boolean>;
  refreshParentData: () => Promise<void>;
  refreshBabysitterData: () => Promise<void>;
  refreshBabysitters: () => Promise<void>;

  // ── Unread / in-app notification ──────────────────────────────────────────
  // Set of conversationIds that have unread messages (from other user, not yet opened)
  unreadConversationIds: Set<string>;
  // Call when entering a chat screen so no banner fires for that conversation
  setActiveConversationId: (id: string | null) => void;
  // Call when leaving a chat screen to clear its unread count
  markConversationRead: (conversationId: string) => void;
  // Non-null when a new message arrived while the user is on a different screen
  inAppNotification: { conversationId: string; requestId: string; previewText: string } | null;
  clearInAppNotification: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppState | null>(null);

function requestSelectForRole(viewerRole: UserRole) {
  if (viewerRole === 'parent') {
    return `
      *,
      babysitter_profile:babysitter_profiles!babysitter_id (
        profile_photo_path,
        user:users!user_id ( name )
      )
    `;
  }

  return '*, parent_user:users!parent_id ( name )';
}

async function mergeParentProfileDetailsIntoRequests(
  rows: Record<string, unknown>[],
  viewerRole: UserRole
) {
  if (viewerRole === 'parent') {
    return rows.map(row => rowToRequest(row, viewerRole));
  }

  const parentIds = [...new Set(rows.map(row => row.parent_id as string).filter(Boolean))];

  if (parentIds.length === 0) {
    return rows.map(row => rowToRequest(row, viewerRole));
  }

  const { data: profileRows, error } = await supabase
    .from('parent_profiles')
    .select('user_id, profile_photo_path')
    .in('user_id', parentIds);

  if (error) {
    console.error('mergeParentProfileDetailsIntoRequests error:', error.message);
    return rows.map(row => rowToRequest(row, viewerRole));
  }

  const photoByUserId = new Map(
    (profileRows ?? []).map(profileRow => [
      profileRow.user_id as string,
      resolveParentPhotoUrl((profileRow.profile_photo_path as string | null) ?? null),
    ])
  );

  return rows.map(row => {
    const parentPhotoUrl = photoByUserId.get(row.parent_id as string);
    return rowToRequest(row, viewerRole, parentPhotoUrl);
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

type AppProviderProps = {
  children: React.ReactNode;
  userId?: string;
  userRole?: UserRole;
};

export function AppProvider({ children, userId, userRole }: AppProviderProps) {
  const [babysitters,        setBabysitters]       = useState<Babysitter[]>([]);
  const [babysittersLoading, setBabysittersLoading] = useState(false);
  const [families, setFamilies] = useState<FamilyPreview[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [posts,        setPosts]        = useState<ParentPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [myPosts,      setMyPosts]      = useState<ParentPost[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [favoriteBabysitterIds, setFavoriteBabysitterIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const pendingHiddenRequestIdsRef = useRef<Set<string>>(new Set());

  // ── Unread chat tracking ───────────────────────────────────────────────────
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(new Set());
  const activeConversationIdRef = useRef<string | null>(null);
  const [inAppNotification, setInAppNotification] = useState<{
    conversationId: string;
    requestId: string;
    previewText: string;
  } | null>(null);
  // Track the last-seen lastMessageAt per conversation so we never re-trigger
  // the banner/badge for a message that was already processed.
  const lastSeenMessageAtRef = useRef<Map<string, string>>(new Map());

  // Babysitter profile UUID — different from user UUID; needed to query and
  // insert conversations for babysitters (conversations.babysitter_id = profile id).
  const babysitterProfileId = useRef<string | null>(null);

  // ── Load from Supabase when user identity is known ─────────────────────────

  useEffect(() => {
    if (!userId || !userRole) {
      babysitterProfileId.current = null;
      setBabysitterProfileIdState(null);
      setFamilies([]);
      setRequests([]);
      setConversations([]);
      pendingHiddenRequestIdsRef.current = new Set();
      return;
    }

    const currentUserId = userId;
    const currentUserRole = userRole;
    let isMounted = true;

    async function loadInitialRoleData() {
      if (!isMounted) return;
      if (currentUserRole === 'parent') {
        babysitterProfileId.current = null;
        setBabysitterProfileIdState(null);
        await loadParentData(currentUserId);
      } else {
        await loadBabysitterData(currentUserId);
      }
    }

    void loadInitialRoleData();

    return () => {
      isMounted = false;
    };
  }, [userId, userRole]);

  // ── Persist / restore unread conversation IDs ─────────────────────────────

  useEffect(() => {
    if (!userId) {
      setUnreadConversationIds(new Set());
      return;
    }
    AsyncStorage.getItem(`unread_${userId}`)
      .then(json => {
        if (!json) return;
        try {
          const ids = JSON.parse(json) as string[];
          setUnreadConversationIds(new Set(ids));
        } catch {}
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.setItem(
      `unread_${userId}`,
      JSON.stringify(Array.from(unreadConversationIds))
    ).catch(() => {});
  }, [unreadConversationIds, userId]);

  // ── Unread helpers ─────────────────────────────────────────────────────────

  const setActiveConversationId = useCallback((id: string | null) => {
    activeConversationIdRef.current = id;
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    setUnreadConversationIds(prev => {
      if (!prev.has(conversationId)) return prev;
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  const clearInAppNotification = useCallback(() => {
    setInAppNotification(null);
  }, []);

  // Reactive copy of babysitterProfileId so Realtime subscriptions can re-subscribe when it loads
  const [babysitterProfileIdState, setBabysitterProfileIdState] = useState<string | null>(null);

  // ── Realtime: keep requests + conversations live ───────────────────────────

  useEffect(() => {
    // For parents: subscribe by userId. For babysitters: subscribe by profile UUID.
    const realtimeId =
      userRole === 'parent' ? userId : babysitterProfileIdState;

    if (!realtimeId || !userRole) return;

    const requestFilter =
      userRole === 'parent'
        ? `parent_id=eq.${realtimeId}`
        : `babysitter_id=eq.${realtimeId}`;

    const conversationFilter =
      userRole === 'parent'
        ? `parent_id=eq.${realtimeId}`
        : `babysitter_id=eq.${realtimeId}`;

    const channel = supabase
      .channel(`requests_realtime:${userRole}:${realtimeId}`)

      // ── New incoming request ──────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests', filter: requestFilter },
        async () => {
          if (userRole === 'parent' && userId) {
            await loadParentData(userId);
            return;
          }

          if (userRole === 'babysitter' && userId) {
            await loadBabysitterData(userId);
          }
        }
      )

      // ── Request status updated (accept / decline) ─────────────────────────
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: requestFilter },
        async () => {
          if (userRole === 'parent' && userId) {
            await loadParentData(userId);
            return;
          }

          if (userRole === 'babysitter' && userId) {
            await loadBabysitterData(userId);
          }
        }
      )

      // ── New conversation opened ───────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: conversationFilter },
        payload => {
          const newConv = payload.new as Record<string, unknown>;
          setConversations(prev => upsertConversations(prev, [rowToConversation(newConv)]));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: conversationFilter },
        payload => {
          const updatedConversation = rowToConversation(payload.new as Record<string, unknown>);

          setConversations(prev => upsertConversations(prev, [updatedConversation]));

          if (updatedConversation.closedAt) {
            if (userRole === 'parent' && userId) {
              void loadParentData(userId);
            } else if (userRole === 'babysitter' && userId) {
              void loadBabysitterData(userId);
            }
          }

          // ── New message from the other user ─────────────────────────────
          const isNewMessageFromOther =
            updatedConversation.lastMessageAt &&
            updatedConversation.lastMessageSenderId &&
            updatedConversation.lastMessageSenderId !== userId;

          if (isNewMessageFromOther) {
            // Guard: only fire if this lastMessageAt is strictly newer than the
            // last event we processed — prevents duplicate realtime firings and
            // spurious re-triggers when other columns change on the same row.
            const prevTs = lastSeenMessageAtRef.current.get(updatedConversation.id);
            const isActuallyNew =
              !prevTs ||
              new Date(updatedConversation.lastMessageAt!).getTime() >
                new Date(prevTs).getTime();

            lastSeenMessageAtRef.current.set(
              updatedConversation.id,
              updatedConversation.lastMessageAt!
            );

            // If user is currently inside this exact chat, do NOT mark unread or show banner
            if (isActuallyNew && activeConversationIdRef.current !== updatedConversation.id) {
              setUnreadConversationIds(prev => {
                const next = new Set(prev);
                next.add(updatedConversation.id);
                return next;
              });
              setInAppNotification({
                conversationId: updatedConversation.id,
                requestId:      updatedConversation.requestId,
                previewText:    updatedConversation.lastMessageText ?? '...',
              });
            }
          }
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole, babysitterProfileIdState]);

  async function loadBabysitters() {
    setBabysittersLoading(true);
    try {
      let query = supabase
        .from('babysitter_profiles')
        .select(`
          id, user_id, city, latitude, longitude, bio, hourly_rate, years_experience, age, birth_date,
          has_car, has_first_aid, special_needs, is_verified, has_references,
          profile_photo_path, extras, preferred_location,
          users!user_id ( name ),
          babysitter_languages ( language ),
          babysitter_age_groups ( age_group ),
          babysitter_certifications ( certification ),
          babysitter_superpowers ( superpower ),
          babysitter_personality_tags ( tag ),
          babysitter_availability ( slot )
        `)
        .eq('is_accepting_requests', true)
        .eq('profile_visible', true)
        .order('created_at', { ascending: false });

      // Don't show the current user's own babysitter profile when browsing as parent
      if (userId) query = query.neq('user_id', userId);

      const { data, error } = await query;
      if (data) setBabysitters(data.map(row => rowToBabysitter(row as Record<string, unknown>)));
      if (error) console.error('loadBabysitters error:', error.message);
    } finally {
      setBabysittersLoading(false);
    }
  }

  async function loadFavorites(uid: string) {
    const { data } = await supabase
      .from('parent_favorites')
      .select('babysitter_id')
      .eq('parent_id', uid);
    if (data) setFavoriteBabysitterIds(new Set(data.map((r: any) => r.babysitter_id as string)));
  }

  async function toggleFavorite(babysitterId: string) {
    if (!userId) return;
    if (favoriteBabysitterIds.has(babysitterId)) {
      setFavoriteBabysitterIds(prev => { const n = new Set(prev); n.delete(babysitterId); return n; });
      await supabase.from('parent_favorites').delete().eq('parent_id', userId).eq('babysitter_id', babysitterId);
    } else {
      setFavoriteBabysitterIds(prev => new Set(prev).add(babysitterId));
      await supabase.from('parent_favorites').insert({ parent_id: userId, babysitter_id: babysitterId });
    }
  }

  async function loadParentData(uid: string) {
    await loadBabysitters();
    void loadMyPosts(uid);
    void loadFavorites(uid);

    // Check if this user also has a babysitter profile so we can exclude self-requests
    const [requestsRes, conversationsRes, ownBabysitterRes] = await Promise.all([
      supabase
        .from('requests')
        .select(requestSelectForRole('parent'))
        .eq('parent_id', uid)
        .eq('hidden_for_parent', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('conversations')
        .select('*')
        .eq('parent_id', uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('babysitter_profiles')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle(),
    ]);

    const ownBabysitterProfileId = ownBabysitterRes.data?.id as string | null | undefined;
    const loadedConversations = (conversationsRes.data ?? []).map(rowToConversation);

    if (requestsRes.data) {
      pendingHiddenRequestIdsRef.current = clearLocallyHiddenRequestIds(
        (requestsRes.data as Record<string, unknown>[]).map(row => row.id as string),
        pendingHiddenRequestIdsRef.current
      );

      // Exclude self-requests (dual-role user contacted their own babysitter profile)
      const filteredRows = ownBabysitterProfileId
        ? (requestsRes.data as Record<string, unknown>[]).filter(
            row => row.babysitter_id !== ownBabysitterProfileId
          )
        : (requestsRes.data as Record<string, unknown>[]);

      const mergedRequests = await mergeParentProfileDetailsIntoRequests(filteredRows, 'parent');
      const withLatestMessages = await attachLatestMessagesToRequests(
        mergedRequests,
        loadedConversations
      );
      setRequests(
        normalizeVisibleRequests(withLatestMessages).filter(
          request => !pendingHiddenRequestIdsRef.current.has(request.id)
        )
      );
    }
    setConversations(loadedConversations);
  }

  async function loadFamilies() {
    setFamiliesLoading(true);

    try {
      let query = supabase
        .from('parent_profiles')
        .select(`
          id,
          user_id,
          city,
          latitude,
          longitude,
          children_count,
          hourly_budget,
          child_age_groups,
          family_note,
          users!user_id ( name )
        `)
        .order('created_at', { ascending: false });

      // Don't show the current user's own family profile when browsing as babysitter
      if (userId) query = query.neq('user_id', userId);

      const { data, error } = await query;

      if (error) {
        console.error('loadFamilies error:', error.message);
        return;
      }

      setFamilies((data ?? []).map(row => rowToFamilyPreview(row as Record<string, unknown>)));
    } finally {
      setFamiliesLoading(false);
    }
  }

  // Posts visible to babysitters — all active posts from all parents
  async function loadPosts() {
    setPostsLoading(true);
    try {
      let query = supabase
        .from('parent_posts')
        .select('*, users!parent_id(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Don't show the current user's own posts when browsing as babysitter
      if (userId) query = query.neq('parent_id', userId);

      const { data, error } = await query;
      if (error) console.error('loadPosts error:', error.message);
      if (data) setPosts(await mergeParentProfileDetailsIntoPosts(data as Record<string, unknown>[]));
    } finally {
      setPostsLoading(false);
    }
  }

  // Posts belonging to the current parent (all statuses)
  async function loadMyPosts(uid: string) {
    const { data, error } = await supabase
      .from('parent_posts')
      .select('*, users!parent_id(name)')
      .eq('parent_id', uid)
      .order('created_at', { ascending: false });

    if (error) console.error('loadMyPosts error:', error.message);
    if (data) setMyPosts(await mergeParentProfileDetailsIntoPosts(data as Record<string, unknown>[]));
  }

  async function loadSavedPosts(uid: string) {
    const { data } = await supabase
      .from('babysitter_saved_posts')
      .select('post_id')
      .eq('user_id', uid);
    if (data) setSavedPostIds(new Set(data.map((r: any) => r.post_id as string)));
  }

  async function toggleSavedPost(postId: string) {
    if (!userId) return;
    if (savedPostIds.has(postId)) {
      setSavedPostIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
      await supabase.from('babysitter_saved_posts').delete().eq('user_id', userId).eq('post_id', postId);
    } else {
      setSavedPostIds(prev => new Set(prev).add(postId));
      await supabase.from('babysitter_saved_posts').insert({ user_id: userId, post_id: postId });
    }
  }

  async function loadBabysitterData(uid: string) {
    await Promise.all([loadFamilies(), loadPosts(), loadSavedPosts(uid)]);

    const { data: profile } = await supabase
      .from('babysitter_profiles')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle();

    if (!profile) {
      setRequests([]);
      setConversations([]);
      return;
    } // Profile not yet created (mid-onboarding)

    babysitterProfileId.current = profile.id as string;
    setBabysitterProfileIdState(profile.id as string);

    const [requestsRes, conversationsRes] = await Promise.all([
      supabase
        .from('requests')
        .select(requestSelectForRole('babysitter'))
        .eq('babysitter_id', profile.id)
        .neq('parent_id', uid)  // exclude self-requests (dual-role user)
        .eq('hidden_for_babysitter', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('conversations')
        .select('*')
        .eq('babysitter_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);

    const loadedConversations = (conversationsRes.data ?? []).map(rowToConversation);

    if (requestsRes.data) {
      pendingHiddenRequestIdsRef.current = clearLocallyHiddenRequestIds(
        (requestsRes.data as Record<string, unknown>[]).map(row => row.id as string),
        pendingHiddenRequestIdsRef.current
      );

      const mergedRequests = await mergeParentProfileDetailsIntoRequests(
        requestsRes.data as Record<string, unknown>[],
        'babysitter'
      );
      const withLatestMessages = await attachLatestMessagesToRequests(
        mergedRequests,
        loadedConversations
      );
      setRequests(
        normalizeVisibleRequests(withLatestMessages).filter(
          request => !pendingHiddenRequestIdsRef.current.has(request.id)
        )
      );
    }
    setConversations(loadedConversations);
  }

  async function refreshParentData() {
    if (!userId) return;
    await loadParentData(userId);
  }

  async function refreshBabysitterData() {
    if (!userId) return;
    await loadBabysitterData(userId);
  }

  async function saveCurrentRoleCoordinates(coordinates: Coordinates) {
    if (!userId || !userRole) return false;

    const table = userRole === 'parent' ? 'parent_profiles' : 'babysitter_profiles';
    const { error } = await supabase
      .from(table)
      .update({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('saveCurrentRoleCoordinates error:', error.message);
      return false;
    }

    return true;
  }

  // ── Requests ───────────────────────────────────────────────────────────────

  async function addRequest(
    draft: RequestDraft,
    targetId: string,
    targetRole: UserRole
  ): Promise<{ success: boolean; errorMessage?: string }> {
    if (!userId || !userRole) {
      return { success: false, errorMessage: 'missing-user' };
    }

    const isIntroContact = draft.requestType === 'quick_message';

    let normalizedDate: string;
    let normalizedTime: string;

    if (isIntroContact) {
      normalizedDate = '2100-01-01';
      normalizedTime = '00:00';
    } else {
      const parsedDate = normalizeRequestDate(draft.date);
      const parsedTime = normalizeRequestTime(draft.time);
      if (!parsedDate) return { success: false, errorMessage: 'invalid-date' };
      if (!parsedTime) return { success: false, errorMessage: 'invalid-time' };
      normalizedDate = parsedDate;
      normalizedTime = parsedTime;
    }

    if (userRole === targetRole) {
      return { success: false, errorMessage: 'invalid-target' };
    }

    // Prevent sending a request to yourself (dual-role user)
    const isSelfTarget =
      userRole === 'parent'
        ? targetId === babysitterProfileId.current
        : targetId === userId;
    if (isSelfTarget) {
      return { success: false, errorMessage: 'invalid-target' };
    }

    let parentId = userRole === 'parent' ? userId : targetId;
    let babysitterId = targetRole === 'babysitter' ? targetId : babysitterProfileId.current;

    if (userRole === 'babysitter' && !babysitterId) {
      const { data: profile, error: profileError } = await supabase
        .from('babysitter_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError || !profile?.id) {
        return { success: false, errorMessage: 'missing-user' };
      }

      babysitterProfileId.current = profile.id as string;
      babysitterId = profile.id as string;
    }

    if (!babysitterId) {
      return { success: false, errorMessage: 'missing-user' };
    }

    let createdRequestId: string | undefined;

    const { data: createdRequest, error } = await supabase
      .rpc('create_request_with_limit', {
        p_parent_id: parentId,
        p_babysitter_id: babysitterId,
        p_initiated_by: userRole,
        p_request_type: draft.requestType,
        p_date: normalizedDate,
        p_time: normalizedTime,
        p_num_children: isIntroContact ? 0 : parseInt(draft.numChildren, 10),
        p_child_age_range: isIntroContact ? [] : draft.childAgeRange,
        p_area: isIntroContact ? '' : draft.area,
        p_note: draft.note ?? '',
      })
      .single();

    if (error) {
      if (requestErrorMatches(error, 'declined-block')) {
        const { data: fallbackRequest, error: fallbackError } = await supabase
          .from('requests')
          .insert({
            parent_id: parentId,
            babysitter_id: babysitterId,
            initiated_by: userRole,
            request_type: draft.requestType,
            status: 'pending',
            date: normalizedDate,
            time: normalizedTime,
            num_children: isIntroContact ? 0 : parseInt(draft.numChildren, 10),
            child_age_range: isIntroContact ? [] : draft.childAgeRange,
            area: isIntroContact ? '' : draft.area,
            note: draft.note ?? '',
            hidden_for_parent: false,
            hidden_for_babysitter: false,
          })
          .select(requestSelectForRole(userRole))
          .single();

        if (fallbackError) {
          console.error('addRequest declined-block fallback error:', fallbackError.message);
          return {
            success: false,
            errorMessage: fallbackError.message,
          };
        }

        if (fallbackRequest) {
          createdRequestId = (fallbackRequest as Record<string, unknown>).id as string;
          const merged = await mergeParentProfileDetailsIntoRequests(
            [fallbackRequest as Record<string, unknown>],
            userRole
          );

          pendingHiddenRequestIdsRef.current = clearLocallyHiddenRequestIds(
            merged.map(request => request.id),
            pendingHiddenRequestIdsRef.current
          );

          setRequests(prev => upsertRequests(prev, merged));

          if (userRole === 'parent') {
            await loadParentData(userId);
          } else {
            await loadBabysitterData(userId);
          }

          void notifyRequestRecipient(targetId, targetRole);
          return { success: true };
        }
      }

      console.error('addRequest error:', error.message);
      const knownErrorCode =
        requestErrorMatches(error, 'daily-limit')
          ? 'daily-limit'
          : requestErrorMatches(error, 'conversation-exists')
            ? 'conversation-exists'
            : requestErrorMatches(error, 'declined-block')
              ? 'declined-block'
              : error.message;
      return {
        success: false,
        errorMessage: knownErrorCode,
      };
    }

    if (createdRequest) {
      createdRequestId = (createdRequest as Record<string, unknown>).id as string;
      const { data: requestRow, error: requestRowError } = await supabase
        .from('requests')
        .select(requestSelectForRole(userRole))
        .eq('id', createdRequestId)
        .single();

      if (requestRowError) {
        console.error('addRequest fetch inserted row error:', requestRowError.message);
      } else if (requestRow) {
        const merged = await mergeParentProfileDetailsIntoRequests(
          [requestRow as Record<string, unknown>],
          userRole
        );
        pendingHiddenRequestIdsRef.current = clearLocallyHiddenRequestIds(
          merged.map(request => request.id),
          pendingHiddenRequestIdsRef.current
        );
        setRequests(prev =>
          upsertRequests(
            prev,
            merged
          )
        );
      }

      if (userRole === 'parent') {
        await loadParentData(userId);
      } else {
        await loadBabysitterData(userId);
      }
    }
    void notifyRequestRecipient(targetId, targetRole);
    return { success: true };
  }

  async function notifyRequestRecipient(targetId: string, targetRole: UserRole) {
    let recipientUserId: string | null = null;

    if (targetRole === 'parent') {
      recipientUserId = targetId; // parent targetId IS the user_id
    } else {
      // targetId is a babysitter profile_id — look up user_id
      const { data } = await supabase
        .from('babysitter_profiles')
        .select('user_id')
        .eq('id', targetId)
        .maybeSingle();
      recipientUserId = (data?.user_id as string | null) ?? null;
    }

    if (!recipientUserId) return;

    void sendPushToUser(
      recipientUserId,
      strings.inAppNewRequest,
      strings.inAppTapToOpen,
      { screen: 'inbox' }
    );
  }

  async function hideRequest(id: string) {
    if (!userId || !userRole) return;

    const requestToHide = requests.find(request => request.id === id);
    if (!requestToHide) return;

    if (requestToHide.status === 'accepted') {
      const previousRequests = requests;
      const previousConversations = conversations;

      setRequests(prev =>
        prev.filter(
          request =>
            !(
              request.status === 'accepted' &&
              request.parentId === requestToHide.parentId &&
              request.babysitterId === requestToHide.babysitterId
            )
        )
      );
      setConversations(prev =>
        prev.map(conversation =>
          conversation.parentId === requestToHide.parentId &&
          conversation.babysitterId === requestToHide.babysitterId &&
          !conversation.closedAt
            ? {
                ...conversation,
                closedAt: new Date().toISOString(),
                closedByUserId: userId,
              }
            : conversation
        )
      );

      const { error } = await supabase.rpc('close_chat_for_current_user', {
        p_parent_id: requestToHide.parentId,
        p_babysitter_id: requestToHide.babysitterId,
      });

      if (error) {
        console.error('closeChat error:', error.message);
        setRequests(previousRequests);
        setConversations(previousConversations);
        return;
      }

      if (userRole === 'parent') {
        await loadParentData(userId);
      } else {
        await loadBabysitterData(userId);
      }

      return;
    }

    const previousRequests = requests;

    pendingHiddenRequestIdsRef.current = new Set([
      ...pendingHiddenRequestIdsRef.current,
      id,
    ]);

    setRequests(prev => prev.filter(request => request.id !== id));

    const { error } = await supabase.rpc('hide_request_for_current_user', {
      p_request_id: id,
    });

    if (error) {
      console.error('hideRequest error:', error.message);

      pendingHiddenRequestIdsRef.current = new Set(
        [...pendingHiddenRequestIdsRef.current].filter(requestId => requestId !== id)
      );

      setRequests(previousRequests);
      return;
    }

    if (userRole === 'parent') {
      await loadParentData(userId);
    } else {
      await loadBabysitterData(userId);
    }

    pendingHiddenRequestIdsRef.current = new Set(
      [...pendingHiddenRequestIdsRef.current].filter(requestId => requestId !== id)
    );
  }

  // ── Posts ───────────────────────────────────────────────────────────────────

  async function addPost(
    draft: PostDraft
  ): Promise<{ success: boolean; errorMessage?: string }> {
    if (!userId) return { success: false, errorMessage: 'missing-user' };

    const { data, error } = await supabase
      .from('parent_posts')
      .insert({
        parent_id:       userId,
        note:            draft.note,
        area:            draft.area,
        date:            draft.date ?? null,
        time:            draft.time ?? null,
        num_children:    draft.numChildren ?? null,
        child_age_range: draft.childAgeRange,
        is_active:       true,
      })
      .select('*, users!parent_id(name)')
      .single();

    if (error) {
      console.error('addPost error:', error.message);
      return { success: false, errorMessage: error.message };
    }

    if (data) {
      const merged = await mergeParentProfileDetailsIntoPosts([data as Record<string, unknown>]);
      setMyPosts(prev => [...merged, ...prev]);
    }

    return { success: true };
  }

  async function updatePost(
    id: string,
    draft: PostDraft
  ): Promise<{ success: boolean; errorMessage?: string }> {
    if (!userId) return { success: false, errorMessage: 'missing-user' };

    const { data, error } = await supabase
      .from('parent_posts')
      .update({
        note: draft.note,
        area: draft.area,
        date: draft.date ?? null,
        time: draft.time ?? null,
        num_children: draft.numChildren ?? null,
        child_age_range: draft.childAgeRange,
      })
      .eq('id', id)
      .eq('parent_id', userId)
      .select('*, users!parent_id(name)')
      .single();

    if (error) {
      console.error('updatePost error:', error.message);
      return { success: false, errorMessage: error.message };
    }

    if (data) {
      const merged = await mergeParentProfileDetailsIntoPosts([data as Record<string, unknown>]);
      const updatedPost = merged[0];

      if (updatedPost) {
        setMyPosts(prev => prev.map(post => (post.id === id ? updatedPost : post)));
        setPosts(prev => prev.map(post => (post.id === id ? updatedPost : post)));
      }
    }

    return { success: true };
  }

  async function togglePostActive(id: string, isActive: boolean): Promise<void> {
    // Optimistic update
    setMyPosts(prev => prev.map(p => (p.id === id ? { ...p, isActive } : p)));

    const { error } = await supabase
      .from('parent_posts')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('togglePostActive error:', error.message);
      // Revert
      setMyPosts(prev => prev.map(p => (p.id === id ? { ...p, isActive: !isActive } : p)));
    }
  }

  async function deletePost(id: string): Promise<void> {
    const removed = myPosts.find(p => p.id === id);
    // Optimistic remove
    setMyPosts(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase
      .from('parent_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deletePost error:', error.message);
      // Revert
      if (removed) setMyPosts(prev => [removed, ...prev]);
    }
  }

  async function findActivePairConversation(parentId: string, babysitterId: string) {
    const localConversation = conversations.find(
      conversation =>
        conversation.parentId === parentId &&
        conversation.babysitterId === babysitterId &&
        !conversation.closedAt
    );

    if (localConversation) {
      return localConversation;
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('parent_id', parentId)
      .eq('babysitter_id', babysitterId)
      .is('closed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('findActivePairConversation error:', error.message);
      return null;
    }

    return data ? rowToConversation(data as Record<string, unknown>) : null;
  }

  async function updateRequestStatus(id: string, status: RequestStatus) {
    const original = requests.find(r => r.id === id);
    if (!original) return { success: false };
    const previousRequests = requests;

    if (status === 'declined') {
      setRequests(prev => prev.filter(request => request.id !== id));
    } else {
      // Optimistic update
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
    }

    const { error } = await supabase
      .from('requests')
      .update(
        status === 'declined'
          ? {
              status,
              hidden_for_parent: true,
              hidden_for_babysitter: true,
            }
          : { status }
      )
      .eq('id', id);

    if (error) {
      setRequests(previousRequests);
      return { success: false };
    }

    let redirectRequestId: string | undefined = status === 'accepted' ? id : undefined;

    // On accept: create the conversation row in Supabase (only if one doesn't exist).
    // The RLS policy verifies the request is accepted before allowing the insert.
    if (status === 'accepted') {
      const requestConversation = conversations.find(
        conversation => conversation.requestId === id && !conversation.closedAt
      );

      if (requestConversation) {
        redirectRequestId = requestConversation.requestId;
      } else {
        const activePairConversation = await findActivePairConversation(
          original.parentId,
          original.babysitterId
        );

        if (activePairConversation) {
          setConversations(prev => upsertConversations(prev, [activePairConversation]));
          redirectRequestId = activePairConversation.requestId;
        } else {
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({
            request_id:   id,
            parent_id:    original.parentId,
            babysitter_id: original.babysitterId,
          })
          .select()
          .single();

          if (!convError && conv) {
            const mappedConversation = rowToConversation(conv as Record<string, unknown>);
            setConversations(prev => upsertConversations(prev, [mappedConversation]));
            redirectRequestId = mappedConversation.requestId;
          } else if (convError) {
            const recoveredConversation = await findActivePairConversation(
              original.parentId,
              original.babysitterId
            );

            if (recoveredConversation) {
              setConversations(prev => upsertConversations(prev, [recoveredConversation]));
              redirectRequestId = recoveredConversation.requestId;
            } else {
              console.error('updateRequestStatus conversation insert error:', convError.message);
            }
          }
        }
      }
    }

    if (userRole === 'parent' && userId) {
      await loadParentData(userId);
    } else if (userRole === 'babysitter' && userId) {
      await loadBabysitterData(userId);
    }

    return { success: true, redirectRequestId };
  }

  const incomingRequests =
    userRole
      ? requests.filter(request => request.initiatedBy !== userRole)
      : [];

  const sentRequests =
    userRole
      ? requests.filter(request => request.initiatedBy === userRole)
      : [];

  const chatThreads = useMemo(
    () => buildChatThreads(requests, conversations, userRole),
    [conversations, requests, userRole]
  );

  // ── Value ──────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider
      value={{
        babysitters,
        babysittersLoading,
        families,
        familiesLoading,
        posts,
        postsLoading,
        myPosts,
        incomingRequests,
        sentRequests,
        chatThreads,
        conversations,
        currentUserId: userId ?? '',
        currentBabysitterProfileId: babysitterProfileIdState,
        favoriteBabysitterIds,
        toggleFavorite,
        savedPostIds,
        toggleSavedPost,
        updateRequestStatus,
        hideRequest,
        addRequest,
        addPost,
        updatePost,
        togglePostActive,
        deletePost,
        saveCurrentRoleCoordinates,
        refreshParentData,
        refreshBabysitterData,
        refreshBabysitters: loadBabysitters,
        unreadConversationIds,
        setActiveConversationId,
        markConversationRead,
        inAppNotification,
        clearInAppNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppState(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used inside AppProvider');
  return ctx;
}
