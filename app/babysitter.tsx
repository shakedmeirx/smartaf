import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { strings } from '@/locales';
import AppShell from '@/components/navigation/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppContext';
import ParentPostCard from '@/components/babysitter/ParentPostCard';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import { Coordinates, distanceInKm, hasCoordinates } from '@/lib/location';
import { registerPushToken } from '@/lib/pushNotifications';
import { findPairChatThread } from '@/lib/requestLookup';
import { BabysitterDesignTokens, BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type TimeOfDayFilter = 'morning' | 'afternoon' | 'evening';

type Filters = {
  minChildren: number;
  timeOfDay: TimeOfDayFilter[];
  childAgeGroups: string[];
};

const EMPTY_FILTERS: Filters = {
  minChildren: 0,
  timeOfDay: [],
  childAgeGroups: [],
};

function getTimeOfDayBucket(time: string | null): TimeOfDayFilter | null {
  if (!time) return null;

  const hour = Number.parseInt(time.split(':')[0] ?? '', 10);
  if (!Number.isFinite(hour)) return null;
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function toggleStringValue<T extends string>(values: T[], nextValue: T) {
  return values.includes(nextValue)
    ? values.filter(value => value !== nextValue)
    : [...values, nextValue];
}

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

  const { postId: targetPostId } = useLocalSearchParams<{ postId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const feedTopRef = useRef<number>(0);
  const cardOffsetsRef = useRef<Record<string, number>>({});
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(targetPostId ?? null);

  useEffect(() => {
    if (!targetPostId) return;
    const clear = setTimeout(() => setHighlightedPostId(null), 3000);
    return () => clearTimeout(clear);
  }, [targetPostId]);

  useEffect(() => {
    if (!targetPostId) return;
    const scroll = setTimeout(() => {
      const y = feedTopRef.current + (cardOffsetsRef.current[targetPostId] ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }, 500);
    return () => clearTimeout(scroll);
  }, [targetPostId]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(0);
  const [radiusDraftKm, setRadiusDraftKm] = useState(0);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [pendingBannerReady, setPendingBannerReady] = useState(false);
  const [seenPendingRequestsAt, setSeenPendingRequestsAt] = useState<number | null>(null);
  const [newPendingRequestIds, setNewPendingRequestIds] = useState<string[]>([]);
  const [viewerCoordinates, setViewerCoordinates] = useState<Coordinates | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);
  const [enablingNotifications, setEnablingNotifications] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('babysitter_filters').then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as {
            filters?: Partial<Filters>;
            searchQuery?: string;
            selectedRadiusKm?: number;
          };

          if (saved.filters) {
            setFilters({
              minChildren:
                typeof saved.filters.minChildren === 'number' && saved.filters.minChildren > 0
                  ? Math.round(saved.filters.minChildren)
                  : 0,
              timeOfDay: Array.isArray(saved.filters.timeOfDay)
                ? saved.filters.timeOfDay.filter(
                    (value): value is TimeOfDayFilter =>
                      value === 'morning' || value === 'afternoon' || value === 'evening'
                  )
                : [],
              childAgeGroups: Array.isArray(saved.filters.childAgeGroups)
                ? saved.filters.childAgeGroups.filter(
                    (value): value is string => typeof value === 'string' && value.trim() !== ''
                  )
                : [],
            });
          }

          if (typeof saved.searchQuery === 'string') {
            setSearchQuery(saved.searchQuery);
          }

          if (typeof saved.selectedRadiusKm === 'number') {
            setSelectedRadiusKm(saved.selectedRadiusKm);
            setRadiusDraftKm(saved.selectedRadiusKm);
          }
        } catch {}
      }

      setFiltersHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    AsyncStorage.setItem(
      'babysitter_filters',
      JSON.stringify({ filters, searchQuery, selectedRadiusKm })
    );
  }, [filtersHydrated, filters, searchQuery, selectedRadiusKm]);

  useEffect(() => {
    setRadiusDraftKm(selectedRadiusKm);
  }, [selectedRadiusKm]);

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

  const maxChildrenCount = useMemo(
    () => Math.max(5, filters.minChildren, posts.reduce((max, post) => Math.max(max, post.numChildren ?? 0), 0)),
    [filters.minChildren, posts]
  );

  const availableAgeGroups = useMemo(() => {
    const discovered = new Set<string>();
    posts.forEach(post => {
      post.childAgeRange.forEach(group => {
        if (group.trim()) {
          discovered.add(group);
        }
      });
    });

    const preferredOrder = [
      strings.ageRangeOptionInfants,
      strings.ageRangeOptionToddlers,
      strings.ageRangeOptionPreschool,
      strings.ageRangeOptionSchool,
    ];

    const ordered = preferredOrder.filter(group => discovered.has(group));
    ordered.forEach(group => discovered.delete(group));

    return [...ordered, ...Array.from(discovered)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = posts.filter(post => {
      if (
        q &&
        ![post.parentName, post.area, post.note, post.parentCity]
          .filter((value): value is string => Boolean(value))
          .some(value => value.toLowerCase().includes(q))
      ) {
        return false;
      }

      if (filters.minChildren > 0 && (post.numChildren ?? 0) < filters.minChildren) {
        return false;
      }

      if (filters.timeOfDay.length > 0) {
        const bucket = getTimeOfDayBucket(post.time);
        if (!bucket || !filters.timeOfDay.includes(bucket)) {
          return false;
        }
      }

      if (
        filters.childAgeGroups.length > 0 &&
        !post.childAgeRange.some(group => filters.childAgeGroups.includes(group))
      ) {
        return false;
      }

      if (selectedRadiusKm > 0) {
        if (!viewerCoordinates || !hasCoordinates(post)) {
          return false;
        }

        if (distanceInKm(viewerCoordinates, post) > selectedRadiusKm) {
          return false;
        }
      }

      return true;
    });

    return filtered.slice().sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : null;
      const db = b.date ? new Date(b.date).getTime() : null;
      const todayMs = today.getTime();
      const aMs = da !== null && da >= todayMs ? da : null;
      const bMs = db !== null && db >= todayMs ? db : null;

      if (aMs !== null && bMs !== null) return aMs - bMs;
      if (aMs !== null) return -1;
      if (bMs !== null) return 1;
      return 0;
    });
  }, [filters, posts, searchQuery, selectedRadiusKm, viewerCoordinates]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(previous => ({ ...previous, [key]: value }));
  }

  function toggleTimeOfDay(bucket: TimeOfDayFilter) {
    updateFilter('timeOfDay', toggleStringValue(filters.timeOfDay, bucket));
  }

  function toggleAgeGroup(ageGroup: string) {
    updateFilter('childAgeGroups', toggleStringValue(filters.childAgeGroups, ageGroup));
  }

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
    setFilters(EMPTY_FILTERS);
    setSearchQuery('');
    setSelectedRadiusKm(0);
    setRadiusDraftKm(0);
  }

  async function handleEnableNotifications() {
    if (enablingNotifications) {
      return;
    }

    setEnablingNotifications(true);

    try {
      const permissionState = await registerPushToken();

      if (permissionState === 'granted') {
        if (currentBabysitterProfileId) {
          const { error } = await supabase
            .from('babysitter_profiles')
            .update({ notifications_enabled: true })
            .eq('id', currentBabysitterProfileId);

          if (error) {
            console.warn('Could not update babysitter notification preference:', error.message);
          }
        }

        Alert.alert(
          strings.babysitterFeedAlertSuccessTitle,
          strings.babysitterFeedAlertSuccessBody
        );
        return;
      }

      if (permissionState === 'blocked') {
        Alert.alert(
          strings.babysitterFeedAlertBlockedTitle,
          strings.babysitterFeedAlertBlockedBody,
          [
            { text: strings.cancel, style: 'cancel' },
            {
              text: strings.navSettings,
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ]
        );
        return;
      }

      Alert.alert(
        strings.babysitterFeedAlertDeniedTitle,
        strings.babysitterFeedAlertDeniedBody
      );
    } catch (error) {
      console.error('handleEnableNotifications failed:', error);
      Alert.alert(
        strings.babysitterFeedAlertErrorTitle,
        strings.babysitterFeedAlertErrorBody
      );
    } finally {
      setEnablingNotifications(false);
    }
  }

  const activeFilterCount = [
    filters.minChildren > 0,
    filters.timeOfDay.length > 0,
    filters.childAgeGroups.length > 0,
    selectedRadiusKm > 0,
  ].filter(Boolean).length;

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
      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="handled"
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

          <View style={styles.heroCopy}>
            <AppText variant="h1" weight="800" style={styles.heroTitle}>
              {strings.babysitterFeedHeroTitle}
            </AppText>
            <AppText variant="body" tone="muted" style={styles.heroSubtitle}>
              {postsLoading
                ? strings.babysitterFeedRefreshing
                : filteredPosts.length > 0
                ? strings.babysitterFeedFoundFamilies(filteredPosts.length)
                : strings.postFeedEmptyHint}
            </AppText>
          </View>

          <View style={styles.searchSurface}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.86}
              onPress={() => setShowFilters(true)}
              style={[
                styles.searchFilterButton,
                hasAnyFilter && styles.searchFilterButtonActive,
              ]}
            >
              {activeFilterCount > 0 ? (
                <View style={styles.searchFilterBadge}>
                  <AppText variant="caption" weight="800" style={styles.searchFilterBadgeText}>
                    {activeFilterCount > 9 ? '9+' : String(activeFilterCount)}
                  </AppText>
                </View>
              ) : null}
              <MaterialIcons
                name="tune"
                size={18}
                color={hasAnyFilter ? BabyCityPalette.primary : BabyCityPalette.textSecondary}
              />
            </TouchableOpacity>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={strings.postSearchPlaceholder}
              placeholderTextColor={BabyCityPalette.textTertiary}
              style={styles.searchInput}
              textAlign="right"
              returnKeyType="search"
              autoCorrect={false}
            />
            <MaterialIcons name="search" size={22} color={BabyCityPalette.textSecondary} />
          </View>

          {postsLoading ? (
            <View style={styles.loadingWrap}>
              <ScreenStateCard role="babysitter" loading />
            </View>
          ) : filteredPosts.length > 0 ? (
            <View
              style={styles.feed}
              onLayout={event => {
                feedTopRef.current = event.nativeEvent.layout.y;
              }}
            >
              {filteredPosts.map((post, index) => (
                <View
                  key={post.id}
                  onLayout={event => {
                    cardOffsetsRef.current[post.id] = event.nativeEvent.layout.y;
                  }}
                >
                  <ParentPostCard
                    post={post}
                    index={index}
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

          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <MaterialIcons
                name="notifications-active"
                size={26}
                color={BabyCityPalette.textSecondary}
              />
            </View>
            <AppText variant="bodyLarge" weight="800" style={styles.alertTitle}>
              {strings.babysitterFeedAlertTitle}
            </AppText>
            <AppText variant="body" tone="muted" style={styles.alertBody}>
              {strings.babysitterFeedAlertBody}
            </AppText>
            <TouchableOpacity
              style={[styles.alertButton, enablingNotifications ? styles.alertButtonDisabled : null]}
              activeOpacity={0.86}
              disabled={enablingNotifications}
              onPress={() => {
                void handleEnableNotifications();
              }}
            >
              <AppText variant="body" weight="700" style={styles.alertButtonText}>
                {strings.babysitterFeedAlertButton}
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showFilters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.filterModalRoot}>
            <Pressable style={styles.filterModalBackdrop} onPress={() => setShowFilters(false)} />
            <View style={styles.filterModalSheet}>
              <View style={styles.filterSheetHandle} />

              <View style={styles.filterModalHeader}>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.86}
                  onPress={() => setShowFilters(false)}
                  style={styles.filterCloseButton}
                >
                  <MaterialIcons name="close" size={18} color={BabyCityPalette.textSecondary} />
                </TouchableOpacity>
                <AppText variant="bodyLarge" weight="800" style={styles.filterModalTitle}>
                  {strings.filterButton}
                </AppText>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.86}
                  onPress={clearFilters}
                >
                  <AppText variant="caption" weight="700" style={styles.filterResetText}>
                    {strings.filterClearAll}
                  </AppText>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.filterSheetScroll}
                contentContainerStyle={styles.filterSheetScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.filterModalSearchSurface}>
                  <MaterialIcons name="search" size={20} color={BabyCityPalette.textSecondary} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={strings.postSearchPlaceholder}
                    placeholderTextColor={BabyCityPalette.textTertiary}
                    style={styles.filterModalSearchInput}
                    textAlign="right"
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                </View>

                <AppCard style={styles.filterPanel}>
                  <View style={styles.filterSectionStack}>
                    <SliderFilterRow
                      label={strings.nearbyTitle}
                      valueLabel={
                        radiusDraftKm > 0
                          ? `${radiusDraftKm} ${strings.kilometersSuffix}`
                          : strings.nearbyAll
                      }
                      minimumValue={0}
                      maximumValue={50}
                      step={5}
                      value={radiusDraftKm}
                      minimumTrackTintColor={theme.filterAccent}
                      thumbTintColor={theme.filterAccent}
                      onValueChange={value => setRadiusDraftKm(Math.round(value))}
                      onSlidingComplete={value => {
                        const nextRadius = Math.round(value);
                        setRadiusDraftKm(nextRadius);
                        void handleRadiusChange(nextRadius);
                      }}
                      startLabel={`0 ${strings.kilometersSuffix}`}
                      endLabel={`50 ${strings.kilometersSuffix}`}
                      notice={nearbyNotice}
                      loading={locatingNearby}
                    />

                    <SliderFilterRow
                      label={strings.filterChildrenCount}
                      valueLabel={
                        filters.minChildren > 0
                          ? `${filters.minChildren}+ ${strings.familyFeedChildrenSuffix}`
                          : strings.filterChildrenAny
                      }
                      minimumValue={0}
                      maximumValue={maxChildrenCount}
                      step={1}
                      value={filters.minChildren}
                      minimumTrackTintColor={theme.filterAccent}
                      thumbTintColor={theme.filterAccent}
                      onValueChange={value => updateFilter('minChildren', Math.round(value))}
                      startLabel={strings.filterChildrenAny}
                      endLabel={`${maxChildrenCount}+`}
                    />

                    <View style={styles.filterSection}>
                      <AppText variant="body" weight="800">
                        {strings.filterTimeOfDay}
                      </AppText>
                      <View style={styles.chipFiltersRow}>
                        <AppChip
                          label={strings.filterTimeMorning}
                          tone="accent"
                          variant="filter"
                          selected={filters.timeOfDay.includes('morning')}
                          onPress={() => toggleTimeOfDay('morning')}
                          size="sm"
                        />
                        <AppChip
                          label={strings.filterTimeAfternoon}
                          tone="accent"
                          variant="filter"
                          selected={filters.timeOfDay.includes('afternoon')}
                          onPress={() => toggleTimeOfDay('afternoon')}
                          size="sm"
                        />
                        <AppChip
                          label={strings.filterTimeEvening}
                          tone="accent"
                          variant="filter"
                          selected={filters.timeOfDay.includes('evening')}
                          onPress={() => toggleTimeOfDay('evening')}
                          size="sm"
                        />
                      </View>
                    </View>

                    {availableAgeGroups.length > 0 ? (
                      <View style={styles.filterSection}>
                        <AppText variant="body" weight="800">
                          {strings.ageGroupsLabel}
                        </AppText>
                        <View style={styles.chipFiltersRow}>
                          {availableAgeGroups.map(group => (
                            <AppChip
                              key={group}
                              label={group}
                              tone="primary"
                              variant="filter"
                              selected={filters.childAgeGroups.includes(group)}
                              onPress={() => toggleAgeGroup(group)}
                              size="sm"
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                </AppCard>
              </ScrollView>

              <View style={styles.filterSheetFooter}>
                <AppPrimaryButton
                  label={strings.pickerConfirm}
                  onPress={() => setShowFilters(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppShell>
  );
}

type SliderFilterRowProps = {
  label: string;
  valueLabel: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  minimumTrackTintColor: string;
  thumbTintColor: string;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  startLabel: string;
  endLabel: string;
  notice?: string | null;
  loading?: boolean;
};

function SliderFilterRow({
  label,
  valueLabel,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  minimumTrackTintColor,
  thumbTintColor,
  onValueChange,
  onSlidingComplete,
  startLabel,
  endLabel,
  notice,
  loading = false,
}: SliderFilterRowProps) {
  return (
    <View style={filterStyles.sliderSection}>
      <View style={filterStyles.sliderHeader}>
        <AppText variant="body" weight="800">
          {label}
        </AppText>
        <AppChip label={valueLabel} tone="primary" size="sm" />
      </View>

      <Slider
        style={filterStyles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        minimumTrackTintColor={minimumTrackTintColor}
        maximumTrackTintColor={BabyCityPalette.border}
        thumbTintColor={thumbTintColor}
        onValueChange={onValueChange}
        onSlidingComplete={onSlidingComplete}
      />

      <View style={filterStyles.scaleRow}>
        <AppText variant="caption" tone="muted">
          {startLabel}
        </AppText>
        <AppText variant="caption" tone="muted">
          {endLabel}
        </AppText>
      </View>

      {notice ? (
        <AppText variant="caption" tone={loading ? 'accent' : 'muted'} style={filterStyles.notice}>
          {notice}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 96,
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
  heroCopy: {
    marginBottom: 18,
    alignItems: 'flex-end',
  },
  heroTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    marginBottom: 6,
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 24,
  },
  searchSurface: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    borderRadius: 28,
    backgroundColor: '#d5e3ff',
    paddingHorizontal: 18,
  },
  searchFilterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  searchFilterButtonActive: {
    backgroundColor: '#ffffff',
  },
  searchFilterBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primary,
  },
  searchFilterBadgeText: {
    color: '#ffffff',
    lineHeight: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 50,
    fontSize: 16,
    color: BabyCityPalette.textPrimary,
    writingDirection: 'rtl',
  },
  feed: {
    gap: 14,
  },
  loadingWrap: {
    paddingVertical: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  filterModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.4)',
  },
  filterModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  filterModalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  filterSheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  filterSheetScroll: {
    flexGrow: 0,
  },
  filterSheetScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  filterSheetFooter: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  filterModalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceMuted,
  },
  filterModalTitle: {
    color: BabyCityPalette.textPrimary,
  },
  filterResetText: {
    color: BabyCityPalette.primary,
  },
  filterModalSearchSurface: {
    minHeight: 58,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    backgroundColor: '#f4f6ff',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterModalSearchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 15,
    color: BabyCityPalette.textPrimary,
    writingDirection: 'rtl',
  },
  filterPanel: {
    marginBottom: 14,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#ffffff',
  },
  filterSectionStack: {
    gap: 16,
  },
  filterSection: {
    gap: 12,
  },
  chipFiltersRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 28,
    backgroundColor: '#f0f4ff',
  },
  alertIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbe6ff',
    marginBottom: 14,
  },
  alertTitle: {
    textAlign: 'center',
    color: BabyCityPalette.textPrimary,
    marginBottom: 6,
  },
  alertBody: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  alertButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BabyCityPalette.primary,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  alertButtonDisabled: {
    opacity: 0.66,
  },
  alertButtonText: {
    color: BabyCityPalette.primary,
  },
});

const filterStyles = StyleSheet.create({
  sliderSection: {
    paddingVertical: 2,
  },
  sliderHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  slider: {
    marginTop: 10,
    marginHorizontal: -4,
    height: 34,
  },
  scaleRow: {
    marginTop: 2,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notice: {
    marginTop: 8,
    lineHeight: 18,
  },
});
