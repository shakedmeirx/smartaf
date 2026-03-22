import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { strings } from '@/locales';
import AppShell from '@/components/navigation/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppContext';
import NearbyRadiusCard from '@/components/discovery/NearbyRadiusCard';
import ParentPostCard from '@/components/babysitter/ParentPostCard';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import SearchField from '@/components/ui/SearchField';
import SectionHeader from '@/components/ui/SectionHeader';
import { Coordinates } from '@/lib/location';
import { findPairChatThread } from '@/lib/requestLookup';
import { BabysitterDesignTokens, BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const FEED_PARENT_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDrbdUAIjTjSz450qMXEav2OMpERhvInkUd0KkEFTV2MyTRsaxwwtpfzScVgiWYaX328_3LCr9jCFj6Hzi51WoPeUqYFiryt35a_fpQuWO59rso5bbLEQ2PGMvT4JNBphChmhSTNYnCAfTuAhz-rGWNYVpsDPLissI9j1b9G6lD_cHYmDKqoj7w-GEdW3iyF8xNM7lfMW8Izf5COkGrt3JFyHvfybVjK-9mtBTcRceV7E3B6bHmEJ2HyRa_14mAPdQhJDv-2tfGuNFm',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAranGxhOrHk3S5OSTp9T2ox_AzoygCwUhbemhefioPahEDRWRDapcrswdL5F5SWfM59eWXennnMz0yR7NN4aqbACo2dvsDM0Ck1GGkqOUTZKfUjWQynyWmjow51quqD4Jupc9X6axK64RmNyDvBtZqHSeLMTPHPA3psPWlGE24-elXbgFbQXsqpXekjDMMxFSR8zNWU-mQj5y0QYbVz7qIVKpgyvaqLLl2kThU6JLTqTUsnT_jnvsBbBSiXqcHrPqWz2eTYQnO_SqM',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCDq2TnWNXKt0RQRTeqzS16ixeRillm83aHIOkXfHV0XOWAsITZt4pXSyOcRvi4Im9MKUBusZLCtuLZuinsUFl0IXCkSuL405UnxVhnmtRR7LWnH1AQOH3K3pac8y3ZfwVZFVl5XDoKsCROY45cVcKswYv-74NEiGVg4bJcfpeg3gmvHiIn6atZCo9pu9W8qaPxMID2qCfoNZdP9P5udvkLJNV_clpjDQIZ53JI41HK0vIr8nCnyvJvRaFNfJhrsH9eY52gr6eWE0z_',
];

export default function BabysitterScreen() {
  const { dbUser } = useAuth();
  const {
    posts,
    postsLoading,
    incomingRequests,
    currentBabysitterProfileId,
    refreshBabysitterData,
    saveCurrentRoleCoordinates,
    savedPostIds,
    chatThreads,
    toggleSavedPost,
  } = useAppState();
  const pendingRequests = useMemo(
    () => incomingRequests.filter(request => request.status === 'pending'),
    [incomingRequests]
  );
  const theme = getRoleTheme('babysitter');
  const pendingBannerStorageKey = dbUser?.id
    ? `babysitter_seen_pending_requests_at:${dbUser.id}`
    : null;

  // Deep link: highlight + scroll to a specific post when opened via shared link
  const { postId: targetPostId } = useLocalSearchParams<{ postId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const feedTopRef = useRef<number>(0);
  const cardOffsetsRef = useRef<Record<string, number>>({});
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(targetPostId ?? null);

  useEffect(() => {
    if (!targetPostId) return;
    // Auto-clear the highlight after 3 s
    const clear = setTimeout(() => setHighlightedPostId(null), 3000);
    return () => clearTimeout(clear);
  }, [targetPostId]);

  useEffect(() => {
    if (!targetPostId) return;
    // Scroll to the highlighted card once layouts are known (500 ms covers initial render)
    const scroll = setTimeout(() => {
      const y = feedTopRef.current + (cardOffsetsRef.current[targetPostId] ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }, 500);
    return () => clearTimeout(scroll);
  }, [targetPostId]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(0);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [pendingBannerReady, setPendingBannerReady] = useState(false);
  const [seenPendingRequestsAt, setSeenPendingRequestsAt] = useState<number | null>(null);
  const [newPendingRequestIds, setNewPendingRequestIds] = useState<string[]>([]);
  const [viewerCoordinates, setViewerCoordinates] = useState<Coordinates | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('babysitter_filters').then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as { searchQuery?: string; selectedRadiusKm?: number };
          if (typeof saved.searchQuery === 'string') setSearchQuery(saved.searchQuery);
          if (typeof saved.selectedRadiusKm === 'number') setSelectedRadiusKm(saved.selectedRadiusKm);
        } catch {}
      }
      setFiltersHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    AsyncStorage.setItem('babysitter_filters', JSON.stringify({ searchQuery, selectedRadiusKm }));
  }, [filtersHydrated, searchQuery, selectedRadiusKm]);

  useEffect(() => {
    let cancelled = false;

    if (!pendingBannerStorageKey) {
      setPendingBannerReady(false);
      setSeenPendingRequestsAt(null);
      setNewPendingRequestIds([]);
      return;
    }

    void AsyncStorage.getItem(pendingBannerStorageKey).then(raw => {
      if (cancelled) {
        return;
      }

      const parsed = raw ? Number(raw) : Number.NaN;

      if (Number.isFinite(parsed)) {
        setSeenPendingRequestsAt(parsed);
      } else {
        setSeenPendingRequestsAt(null);
      }

      setNewPendingRequestIds([]);
      setPendingBannerReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [pendingBannerStorageKey]);

  useEffect(() => {
    if (!pendingBannerReady || !pendingBannerStorageKey) {
      return;
    }

    const newestPendingRequestAt = pendingRequests.reduce<number>(
      (latest, request) => Math.max(latest, new Date(request.createdAt).getTime() || 0),
      0
    );

    if (seenPendingRequestsAt === null) {
      const bootstrapSeenAt = newestPendingRequestAt || Date.now();
      setSeenPendingRequestsAt(bootstrapSeenAt);
      void AsyncStorage.setItem(pendingBannerStorageKey, String(bootstrapSeenAt));
      return;
    }

    const unseenPendingRequests = pendingRequests.filter(
      request => new Date(request.createdAt).getTime() > seenPendingRequestsAt
    );

    if (unseenPendingRequests.length > 0) {
      const newestUnseenAt = unseenPendingRequests.reduce<number>(
        (latest, request) => Math.max(latest, new Date(request.createdAt).getTime() || 0),
        seenPendingRequestsAt
      );

      setNewPendingRequestIds(previousIds =>
        Array.from(new Set([...previousIds, ...unseenPendingRequests.map(request => request.id)]))
      );
      setSeenPendingRequestsAt(newestUnseenAt);
      void AsyncStorage.setItem(pendingBannerStorageKey, String(newestUnseenAt));
      return;
    }

    setNewPendingRequestIds(previousIds =>
      previousIds.filter(requestId => pendingRequests.some(request => request.id === requestId))
    );
  }, [pendingBannerReady, pendingBannerStorageKey, pendingRequests, seenPendingRequestsAt]);

  const newPendingCount = newPendingRequestIds.length;

  const homeTitle = dbUser?.name?.trim()
    ? `${strings.helloGreeting} ${dbUser.name.trim()}`
    : strings.greetingBabysitter;

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = posts.filter(post => {
      if (
        q &&
        ![post.parentName, post.area, post.note, post.parentCity]
          .filter(Boolean)
          .some(v => v.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (selectedRadiusKm > 0) {
        // Posts don't carry coordinates; filter by parentCity text match only when radius is set
        // (location filter is kept for UX parity but no coordinate filtering on posts)
        if (!viewerCoordinates) return false;
      }
      return true;
    });

    // Sort: upcoming dates first (nearest → furthest), then posts with no date
    return filtered.slice().sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : null;
      const db = b.date ? new Date(b.date).getTime() : null;
      const todayMs = today.getTime();
      // Treat past dates as if they have no date (push to bottom)
      const aMs = da !== null && da >= todayMs ? da : null;
      const bMs = db !== null && db >= todayMs ? db : null;
      if (aMs !== null && bMs !== null) return aMs - bMs;
      if (aMs !== null) return -1;
      if (bMs !== null) return 1;
      return 0;
    });
  }, [posts, searchQuery, selectedRadiusKm, viewerCoordinates]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refreshBabysitterData();
    } finally {
      setRefreshing(false);
    }
  }

  async function ensureViewerCoordinates() {
    try {
      setLocatingNearby(true);
      setNearbyNotice(strings.nearbyLoading);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setNearbyNotice(strings.nearbyPermissionDenied);
        return null;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setViewerCoordinates(coordinates);
      setNearbyNotice(strings.nearbyUsingLocation);
      void saveCurrentRoleCoordinates(coordinates);

      return coordinates;
    } catch {
      setNearbyNotice(strings.nearbyPermissionError);
      return null;
    } finally {
      setLocatingNearby(false);
    }
  }

  async function handleRadiusChange(radiusKm: number) {
    if (radiusKm <= 0) {
      setSelectedRadiusKm(0);
      return;
    }
    const coordinates = viewerCoordinates ?? await ensureViewerCoordinates();
    if (!coordinates) return;
    setSelectedRadiusKm(radiusKm);
  }

  function clearFilters() {
    setSearchQuery('');
    setSelectedRadiusKm(0);
    setShowLocationFilter(false);
  }

  const activeFilterCount = [selectedRadiusKm > 0].filter(Boolean).length;
  const hasAnyFilter = activeFilterCount > 0 || searchQuery.trim() !== '';

  const feedSubtitle = postsLoading
    ? null
    : filteredPosts.length > 0
    ? `${filteredPosts.length} ${strings.babysitterStatsOpenPosts}`
    : null;

  return (
    <AppShell
      title={homeTitle}
      subtitle={feedSubtitle}
      activeTab="home"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {newPendingCount > 0 ? (
          <TouchableOpacity
            style={[styles.pendingBanner, { backgroundColor: theme.filterAccent }]}
            onPress={() => {
              setNewPendingRequestIds([]);
              router.replace('/babysitter-inbox');
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="notifications" size={18} color={BabyCityPalette.surface} />
            <AppText variant="bodyLarge" weight="700" style={styles.pendingBannerText}>
              {newPendingCount === 1
                ? strings.pendingRequestsBannerOne
                : `${newPendingCount} ${strings.pendingRequestsBannerMany}`}
            </AppText>
            <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : null}

        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={strings.postSearchPlaceholder}
          filterLabel={strings.filterButton}
          onFilterPress={() => setShowFilters(v => !v)}
          filterActive={showFilters || activeFilterCount > 0}
          filterCount={activeFilterCount}
          roleAccentColor={theme.filterAccent}
        />

        {showFilters ? (
          <AppCard role="babysitter" style={styles.filterPanel}>
            <View style={styles.filterPanelHeader}>
              {hasAnyFilter ? (
                <TouchableOpacity
                  style={styles.filterResetButton}
                  onPress={clearFilters}
                  activeOpacity={0.85}
                >
                  <AppText variant="caption" weight="700" tone="accent">
                    {strings.filterClearAll}
                  </AppText>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <AppText variant="bodyLarge" weight="800">
                {strings.filterButton}
              </AppText>
            </View>
            <TouchableOpacity
              style={[styles.locationTrigger, showLocationFilter && styles.locationTriggerActive]}
              activeOpacity={0.85}
              onPress={() => setShowLocationFilter(v => !v)}
            >
              <View style={styles.locationTriggerChevron}>
                <MaterialIcons
                  name={showLocationFilter ? 'expand-less' : 'expand-more'}
                  size={18}
                  color={theme.filterAccent}
                />
              </View>
              <View style={styles.locationTriggerTextWrap}>
                <AppText variant="body" weight="800" style={styles.locationTriggerTitle}>
                  {strings.nearbyTitle}
                </AppText>
                <AppText variant="caption" tone="muted" style={styles.locationTriggerValue}>
                  {selectedRadiusKm > 0
                    ? `${selectedRadiusKm} ${strings.kilometersSuffix}`
                    : strings.nearbyAll}
                </AppText>
              </View>
            </TouchableOpacity>

            {showLocationFilter ? (
              <View style={styles.locationSliderWrap}>
                <NearbyRadiusCard
                  variant="babysitter"
                  selectedRadiusKm={selectedRadiusKm}
                  locating={locatingNearby}
                  notice={nearbyNotice}
                  onSelectRadius={handleRadiusChange}
                  showHeader={false}
                />
              </View>
            ) : null}

          </AppCard>
        ) : null}

        {!postsLoading && (
          <SectionHeader
            title={'עבודות מחכות לך'}
            subtitle={filteredPosts.length > 0 ? `${filteredPosts.length} ${strings.babysitterStatsOpenPosts}` : undefined}
            style={styles.feedHeader}
          />
        )}

        {postsLoading ? (
          <View style={styles.loadingWrap}>
            <ScreenStateCard role="babysitter" loading />
          </View>
        ) : filteredPosts.length > 0 ? (
          <View
            style={styles.feed}
            onLayout={e => { feedTopRef.current = e.nativeEvent.layout.y; }}
          >
            {filteredPosts.map((post, index) => (
              <View
                key={post.id}
                onLayout={e => { cardOffsetsRef.current[post.id] = e.nativeEvent.layout.y; }}
              >
                <ParentPostCard
                  post={post}
                  index={index}
                  photoUrl={FEED_PARENT_IMAGES[index % FEED_PARENT_IMAGES.length]}
                  highlighted={highlightedPostId === post.id}
                  onViewProfile={async () => {
                    if (post.parentProfileId) {
                      router.push({ pathname: '/family-profile', params: { id: post.parentProfileId } });
                      return;
                    }

                    const { data } = await supabase
                      .from('parent_profiles')
                      .select('id')
                      .eq('user_id', post.parentId)
                      .maybeSingle();
                    if (data?.id) {
                      router.push({ pathname: '/family-profile', params: { id: data.id as string } });
                    }
                  }}
                  onSendMessage={() => {
                    const existingThread =
                      currentBabysitterProfileId
                        ? findPairChatThread(chatThreads, post.parentId, currentBabysitterProfileId)
                        : null;

                    if (existingThread) {
                      router.push(
                        `/chat?requestId=${existingThread.requestId}&name=${encodeURIComponent(post.parentName ?? '')}`
                      );
                      return;
                    }

                    router.push(
                      `/send-request?id=${post.parentId}&name=${encodeURIComponent(post.parentName ?? '')}&targetRole=parent`
                    );
                  }}
                  messageButtonLabel={
                    currentBabysitterProfileId &&
                    findPairChatThread(chatThreads, post.parentId, currentBabysitterProfileId)
                      ? strings.alreadyChattingCta
                      : strings.postSendMessage
                  }
                  isSaved={savedPostIds.has(post.id)}
                  onToggleSave={() => toggleSavedPost(post.id)}
                />
              </View>
            ))}
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(240).delay(120)}>
            <ScreenStateCard
              role="babysitter"
              icon="document-text-outline"
              title={strings.postFeedEmpty}
              body={strings.postFeedEmptyHint}
            />
          </Animated.View>
        )}
      </ScrollView>
    </AppShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    backgroundColor: BabysitterDesignTokens.surfaces.screen,
  },
  pendingBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  pendingBannerText: {
    flex: 1,
    color: BabyCityPalette.surface,
  },
  filterPanel: {
    padding: 14,
    marginBottom: 16,
  },
  filterPanelHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterResetButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: BabyCityPalette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTrigger: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: BabyCityPalette.surfaceMuted,
  },
  locationTriggerActive: {
    backgroundColor: BabyCityPalette.primarySoft,
  },
  locationTriggerChevron: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.accentSoft,
  },
  locationTriggerTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  locationTriggerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  locationTriggerValue: {
    marginTop: 4,
    fontSize: 13,
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  locationSliderWrap: {
    marginTop: 10,
  },
  feed: {
    gap: 14,
  },
  feedHeader: {
    marginBottom: 8,
  },
  loadingWrap: {
    paddingVertical: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
});
