import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AppText from '@/components/ui/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import BabysitterCard from '@/components/parent/BabysitterCard';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import SearchField from '@/components/ui/SearchField';
import SectionHeader from '@/components/ui/SectionHeader';
import { Coordinates, distanceInKm, hasCoordinates } from '@/lib/location';
import { loadRatingAverages, RatingAverage } from '@/lib/ratings';
import { findPairChatThread } from '@/lib/requestLookup';
import { BabyCityGeometry, BabyCityPalette, ParentDesignTokens, getRoleTheme } from '@/constants/theme';

// ─── Filter state type ─────────────────────────────────────────────────────────

type Filters = {
  maxRate: number;
  minExperienceYears: number;
  hasCar: boolean;
  verifiedOnly: boolean;
};

const EMPTY_FILTERS: Filters = {
  maxRate: 0,
  minExperienceYears: 0,
  hasCar: false,
  verifiedOnly: false,
};

function getExperienceFloor(value: string) {
  if (!value) return 0;

  if (value.includes('5')) return 5;
  if (value.includes('3')) return 3;
  if (value.includes('2')) return 2;
  if (value.includes('1')) return 1;

  return 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParentScreen() {
  const {
    babysitters,
    babysittersLoading,
    refreshParentData,
    saveCurrentRoleCoordinates,
    favoriteBabysitterIds,
    currentUserId,
    chatThreads,
    toggleFavorite,
  } = useAppState();
  const { dbUser } = useAuth();
  const hasParentProfile = dbUser?.roles.includes('parent') ?? false;
  const theme = getRoleTheme('parent');
  const homeTitle = dbUser?.name?.trim()
    ? `${strings.helloGreeting} ${dbUser.name.trim()}`
    : strings.greetingParent;

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(0);
  const [radiusDraftKm, setRadiusDraftKm] = useState(0);
  const [viewerCoordinates, setViewerCoordinates] = useState<Coordinates | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, RatingAverage>>({});

  // Load rating averages once on mount
  useEffect(() => {
    loadRatingAverages().then(setRatingsMap);
  }, []);

  // Persist + restore filters
  useEffect(() => {
    AsyncStorage.getItem('parent_filters').then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as {
            filters?: Partial<Filters> & { experience?: string | null };
            searchQuery?: string;
            selectedRadiusKm?: number;
          };
          if (saved.filters) {
            setFilters({
              maxRate:
                typeof saved.filters.maxRate === 'number' && saved.filters.maxRate > 0
                  ? saved.filters.maxRate
                  : 0,
              minExperienceYears:
                typeof saved.filters.minExperienceYears === 'number'
                  ? saved.filters.minExperienceYears
                  : getExperienceFloor(saved.filters.experience ?? ''),
              hasCar: Boolean(saved.filters.hasCar),
              verifiedOnly: Boolean(saved.filters.verifiedOnly),
            });
          }
          if (typeof saved.searchQuery === 'string') setSearchQuery(saved.searchQuery);
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
    AsyncStorage.setItem('parent_filters', JSON.stringify({ filters, searchQuery, selectedRadiusKm }));
  }, [filtersHydrated, filters, searchQuery, selectedRadiusKm]);

  useEffect(() => {
    setRadiusDraftKm(selectedRadiusKm);
  }, [selectedRadiusKm]);

  // Count active filters for badge
  const activeFilterCount = [
    filters.maxRate > 0,
    filters.minExperienceYears > 0,
    filters.hasCar,
    filters.verifiedOnly,
    selectedRadiusKm > 0,
  ].filter(Boolean).length;

  // Filtered list
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return babysitters.filter(b => {
      if (q && !b.name.toLowerCase().includes(q) && !b.city.toLowerCase().includes(q)) {
        return false;
      }
      if (filters.maxRate > 0 && b.hourlyRate > filters.maxRate) return false;
      if (filters.hasCar && !b.hasCar) return false;
      if (filters.verifiedOnly && !b.isVerified) return false;
      if (filters.minExperienceYears > 0 && getExperienceFloor(b.yearsExperience) < filters.minExperienceYears) return false;
      if (selectedRadiusKm > 0) {
        if (!viewerCoordinates || !hasCoordinates(b)) return false;
        if (distanceInKm(viewerCoordinates, b) > selectedRadiusKm) return false;
      }
      return true;
    });
  }, [babysitters, searchQuery, filters, selectedRadiusKm, viewerCoordinates]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearchQuery('');
    setSelectedRadiusKm(0);
    setRadiusDraftKm(0);
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refreshParentData();
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

  const hasAnyFilter = activeFilterCount > 0 || searchQuery.trim() !== '';

  if (babysittersLoading) {
    return (
      <AppShell title={homeTitle} activeTab="home" backgroundColor={theme.screenBackground} enableRootTabSwipe>
        <View style={styles.loadingState}>
          <ScreenStateCard role="parent" loading />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={homeTitle} activeTab="home" backgroundColor={theme.screenBackground} enableRootTabSwipe>
      <View style={styles.container}>
        <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <AppCard
              role="parent"
              variant="hero"
              backgroundColor={theme.highlightedSurface}
              borderColor="transparent"
              style={styles.titleCard}
            >
              <View style={styles.titleCardGlow} />
              <AppText variant="h1" style={styles.titleCardText}>{strings.browseBabysitters}</AppText>
            </AppCard>

            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={strings.searchPlaceholder}
              filterLabel={strings.filterButton}
              onFilterPress={() => setShowFilters(v => !v)}
              filterActive={showFilters || activeFilterCount > 0}
              filterCount={activeFilterCount}
              roleAccentColor={theme.filterAccent}
            />

            {showFilters && (
              <AppCard style={styles.filterPanel}>
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
                    label={strings.filterRateLabel}
                    valueLabel={
                      filters.maxRate > 0
                        ? `${strings.filterRateUpTo}${filters.maxRate}`
                        : strings.filterRateAny
                    }
                    minimumValue={0}
                    maximumValue={100}
                    step={5}
                    value={filters.maxRate}
                    minimumTrackTintColor={theme.filterAccent}
                    thumbTintColor={theme.filterAccent}
                    onValueChange={value => updateFilter('maxRate', Math.round(value))}
                    startLabel={strings.filterRateAny}
                    endLabel="₪100"
                  />

                  <SliderFilterRow
                    label={strings.filterExperience}
                    valueLabel={
                      filters.minExperienceYears > 0
                        ? `${filters.minExperienceYears}+`
                        : strings.filterExperienceAny
                    }
                    minimumValue={0}
                    maximumValue={5}
                    step={1}
                    value={filters.minExperienceYears}
                    minimumTrackTintColor={theme.filterAccent}
                    thumbTintColor={theme.filterAccent}
                    onValueChange={value => updateFilter('minExperienceYears', Math.round(value))}
                    startLabel={strings.filterExperienceAny}
                    endLabel="5+"
                  />

                  <View style={styles.booleanFiltersRow}>
                    <AppChip
                      label={strings.filterHasCar}
                      tone="accent"
                      variant="filter"
                      selected={filters.hasCar}
                      onPress={() => updateFilter('hasCar', !filters.hasCar)}
                      size="sm"
                    />
                    <AppChip
                      label={strings.filterVerified}
                      tone="success"
                      variant="filter"
                      selected={filters.verifiedOnly}
                      onPress={() => updateFilter('verifiedOnly', !filters.verifiedOnly)}
                      size="sm"
                    />
                  </View>
                </View>
              </AppCard>
            )}

            {!hasParentProfile && (
              <AppCard style={styles.setupCard}>
                <View style={styles.setupCardBadge}>
                  <AppText variant="caption" weight="700" color={BabyCityPalette.primary} style={styles.setupCardBadgeText}>{strings.parentSetupBadge}</AppText>
                </View>
                <AppText variant="h3" style={styles.setupCardTitle}>{strings.parentSetupTitle}</AppText>
                <AppText variant="body" tone="muted" style={styles.setupCardSubtitle}>{strings.parentSetupSubtitle}</AppText>
                <AppPrimaryButton
                  label={strings.settingsEditProfile}
                  onPress={() => router.push('/parent-onboarding')}
                  style={styles.setupCardButton}
                />
              </AppCard>
            )}

            <View style={styles.postActionsRow}>
              <TouchableOpacity
                style={[styles.createPostBanner, styles.createPostBannerFlex]}
                onPress={() => router.push('/create-post')}
                activeOpacity={0.88}
              >
                <View style={styles.createPostBannerInner}>
                  <View style={styles.createPostBannerTextWrap}>
                    <AppText variant="bodyLarge" weight="800" color={BabyCityPalette.primary} style={styles.createPostBannerTitle}>{strings.createPost}</AppText>
                    <AppText variant="caption" tone="muted" style={styles.createPostBannerSubtitle}>{strings.createPostSubtitle}</AppText>
                  </View>
                  <View style={styles.createPostBannerIcon}>
                    <AppText variant="h2" weight="700" style={styles.createPostBannerIconText}>+</AppText>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.myPostsButton}
                onPress={() => router.push('/my-posts')}
                activeOpacity={0.88}
              >
                <AppText variant="caption" weight="700" color={BabyCityPalette.primary} align="center" style={styles.myPostsButtonText}>{strings.myPosts}</AppText>
              </TouchableOpacity>
            </View>

            <SectionHeader
              title={strings.babysittersCountLabel(filtered.length)}
              subtitle={
                searchQuery.trim()
                  ? `"${searchQuery.trim()}"`
                  : filtered.length === 0
                    ? strings.filterNoResults
                    : undefined
              }
              style={styles.resultsHeader}
            />
          </View>
        }
        ListEmptyComponent={
          <ScreenStateCard
            role="parent"
            icon="search-outline"
            title={strings.filterNoResults}
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          (() => {
            const existingThread =
              currentUserId
                ? findPairChatThread(chatThreads, currentUserId, item.id)
                : null;

            return (
              <BabysitterCard
                babysitter={item}
                onPress={() => router.push(`/babysitter-profile?id=${item.id}`)}
                onSendMessage={() => {
                  if (existingThread) {
                    router.push(
                      `/chat?requestId=${existingThread.requestId}&name=${encodeURIComponent(item.name)}`
                    );
                    return;
                  }

                  router.push(`/send-request?id=${item.id}&name=${encodeURIComponent(item.name)}`);
                }}
                messageButtonLabel={
                  existingThread
                    ? strings.alreadyChattingCta
                    : strings.sendMessage
                }
                isFavorite={favoriteBabysitterIds.has(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                averageStars={ratingsMap[item.id]?.averageStars ?? null}
                ratingCount={ratingsMap[item.id]?.ratingCount ?? 0}
              />
            );
          })()
        )}
      />
      </View>
    </AppShell>
  );
}

// ─── Filter UI helpers ────────────────────────────────────────────────────────

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
        <AppText variant="caption" tone="muted" style={filterStyles.notice}>
          {loading ? strings.nearbyLoading : notice}
        </AppText>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },

  // Filter panel
  filterPanel: {
    marginBottom: 14,
    padding: ParentDesignTokens.spacing.cardInset,
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
  filterSectionStack: {
    gap: 14,
  },
  booleanFiltersRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  // List
  listContent: {
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
    paddingBottom: 32,
  },
  titleCard: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 16,
  },
  titleCardGlow: {
    position: 'absolute',
    right: -16,
    top: -28,
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.primarySoft,
  },
  titleCardText: {
    lineHeight: 30,
  },
  setupCard: {
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  setupCardBadge: {
    alignSelf: 'flex-end',
    backgroundColor: BabyCityPalette.primarySoft,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  setupCardBadgeText: {
    // Handled by AppText
  },
  setupCardTitle: {
    marginBottom: 6,
  },
  setupCardSubtitle: {
    lineHeight: 20,
  },
  setupCardButton: {
    marginTop: BabyCityGeometry.spacing.md,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  createPostBanner: {
    backgroundColor: BabyCityPalette.primarySoft,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  createPostBannerInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  createPostBannerTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  createPostBannerTitle: {
    marginBottom: 3,
  },
  createPostBannerSubtitle: {
    lineHeight: 18,
  },
  createPostBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BabyCityPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPostBannerIconText: {
    color: BabyCityPalette.surface,
    lineHeight: 26,
  },
  postActionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 14,
  },
  createPostBannerFlex: {
    flex: 1,
    marginBottom: 0,
  },
  myPostsButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BabyCityPalette.primary,
    backgroundColor: BabyCityPalette.surface,
  },
  myPostsButtonText: {
    // Defaults given by AppText component configuration
  },
  resultsHeader: {
    marginBottom: 12,
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
