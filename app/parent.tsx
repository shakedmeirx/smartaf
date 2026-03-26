import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '@/components/ui/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
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
  const searchInputRef = useRef<TextInput>(null);

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
  const discoverySubtitle =
    filtered.length > 0
      ? strings.babysittersCountLabel(filtered.length)
      : strings.filterNoResults;

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
    <AppShell
      title={strings.findBabysitter}
      activeTab="home"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
      floatingActionButton={
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.9}
          onPress={() => router.push('/create-post')}
          style={styles.fab}
        >
          <LinearGradient
            colors={[BabyCityPalette.primary, '#6411d5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <MaterialIcons name="add" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      }
    >
      <View style={styles.screen}>
        <View style={styles.backdropOrbTop} />
        <View style={styles.backdropOrbBottom} />

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={styles.heroSection}>
                <AppText variant="h1" weight="800" style={[styles.heroTitle, { color: theme.title }]}>
                  {strings.browseBabysitters}
                </AppText>
                <AppText variant="body" style={styles.heroSubtitle}>
                  {discoverySubtitle}
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
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={strings.searchPlaceholder}
                  placeholderTextColor={BabyCityPalette.textTertiary}
                  style={styles.searchInput}
                  textAlign="right"
                  returnKeyType="search"
                  autoCorrect={false}
                />
                <MaterialIcons name="search" size={22} color={BabyCityPalette.textSecondary} />
              </View>

              {!hasParentProfile ? (
                <AppCard style={styles.setupCard}>
                  <View style={styles.setupCardBadge}>
                    <AppText variant="caption" weight="700" color={BabyCityPalette.primary}>
                      {strings.parentSetupBadge}
                    </AppText>
                  </View>
                  <AppText variant="h3" style={styles.setupCardTitle}>
                    {strings.parentSetupTitle}
                  </AppText>
                  <AppText variant="body" tone="muted" style={styles.setupCardSubtitle}>
                    {strings.parentSetupSubtitle}
                  </AppText>
                  <AppPrimaryButton
                    label={strings.settingsEditProfile}
                    onPress={() => router.push('/parent-onboarding')}
                    style={styles.setupCardButton}
                  />
                </AppCard>
              ) : null}

              <View style={styles.actionStrip}>
                <TouchableOpacity
                  style={styles.inlineActionButton}
                  onPress={() => router.push('/my-posts')}
                  activeOpacity={0.88}
                >
                  <MaterialIcons name="description" size={18} color={BabyCityPalette.primary} />
                  <AppText variant="caption" weight="700" color={BabyCityPalette.primary} align="center">
                    {strings.myPosts}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inlineActionButton}
                  onPress={() => router.push('/create-post')}
                  activeOpacity={0.88}
                >
                  <MaterialIcons name="add-circle-outline" size={18} color={BabyCityPalette.primary} />
                  <AppText variant="caption" weight="700" color={BabyCityPalette.primary} align="center">
                    {strings.createPost}
                  </AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.resultsHeader}>
                <View style={[styles.resultsSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="people" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">
                  {strings.babysittersCountLabel(filtered.length)}
                </AppText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIllustrationWrap}>
                  <View style={styles.emptyStateIllustrationOrb}>
                    <MaterialIcons name="search-off" size={72} color="rgba(112,42,225,0.45)" />

                    <View style={styles.emptyStateIconRow}>
                      <View style={styles.emptyStateSmallChip}>
                        <MaterialIcons name="location-off" size={18} color={BabyCityPalette.primary} />
                      </View>
                      <View style={[styles.emptyStateSmallChip, styles.emptyStateSmallChipMuted]}>
                        <MaterialIcons name="person-search" size={18} color={BabyCityPalette.textSecondary} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.emptyStateBadge}>
                    <MaterialIcons name="explore" size={16} color={BabyCityPalette.tertiary} />
                    <AppText variant="caption" weight="700" style={styles.emptyStateBadgeText}>
                      {hasAnyFilter ? strings.parentEmptyDiscoveryNarrowBadge : strings.parentEmptyDiscoveryWideBadge}
                    </AppText>
                  </View>
                </View>

                <AppText variant="h2" weight="800" align="center" style={styles.emptyStateTitle}>
                  {strings.parentEmptyDiscoveryTitle}
                </AppText>
                <AppText variant="bodyLarge" tone="muted" align="center" style={styles.emptyStateBody}>
                  {strings.parentEmptyDiscoveryBody}
                </AppText>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.emptyStatePrimaryAction}
                  onPress={() => setShowFilters(true)}
                >
                  <LinearGradient
                    colors={[BabyCityPalette.primary, BabyCityPalette.primaryPressed]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyStatePrimaryGradient}
                  >
                    <MaterialIcons name="tune" size={18} color={BabyCityPalette.onPrimary} />
                    <AppText variant="bodyLarge" weight="800" style={styles.emptyStatePrimaryText}>
                      {strings.parentEmptyDiscoveryPrimaryAction}
                    </AppText>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.84}
                  style={styles.emptyStateSecondaryAction}
                  onPress={() => {
                    if (hasAnyFilter) {
                      clearFilters();
                      return;
                    }

                    router.push('/create-post');
                  }}
                >
                  <AppText variant="body" weight="700" style={styles.emptyStateSecondaryText}>
                    {hasAnyFilter ? strings.filterClearAll : strings.createPost}
                  </AppText>
                </TouchableOpacity>

                <View style={styles.emptyTipCard}>
                  <View style={styles.emptyTipAccent} />
                  <View style={styles.emptyTipIconWrap}>
                    <MaterialIcons name="lightbulb" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.emptyTipBody}>
                    <AppText variant="bodyLarge" weight="700" style={styles.emptyTipTitle}>
                      {strings.parentEmptyDiscoveryTipTitle}
                    </AppText>
                    <AppText variant="body" tone="muted" style={styles.emptyTipText}>
                      {strings.parentEmptyDiscoveryTipBody}
                    </AppText>
                  </View>
                </View>
              </View>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => {
            const existingThread =
              currentUserId
                ? findPairChatThread(chatThreads, currentUserId, item.id)
                : null;

            return (
              <BabysitterCard
                babysitter={item}
                variant="editorial"
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
          }}
        />

        <Modal
          visible={showFilters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.filterModalRoot}>
            <Pressable style={styles.filterModalBackdrop} onPress={() => setShowFilters(false)} />
            <View style={styles.filterModalSheet}>
              {/* Drag handle */}
              <View style={styles.filterSheetHandle} />

              {/* Sticky header */}
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

              {/* Scrollable content */}
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
                    placeholder={strings.searchPlaceholder}
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
              </ScrollView>

              {/* Sticky footer */}
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
  screen: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: 92,
    right: -96,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(112,42,225,0.06)',
  },
  backdropOrbBottom: {
    position: 'absolute',
    bottom: 120,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(112,42,225,0.05)',
  },
  listContent: {
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
    paddingBottom: 112,
  },
  heroSection: {
    paddingHorizontal: 4,
    marginBottom: 20,
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'right',
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 24,
    color: BabyCityPalette.textSecondary,
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
  setupCard: {
    marginBottom: 16,
    alignItems: 'flex-end',
    borderRadius: 28,
  },
  setupCardBadge: {
    alignSelf: 'flex-end',
    backgroundColor: BabyCityPalette.primarySoft,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
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
  actionStrip: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 16,
  },
  inlineActionButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(112,42,225,0.12)',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  resultsHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  resultsSectionIconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateWrap: {
    paddingTop: 28,
    paddingBottom: 18,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  emptyStateIllustrationWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 34,
    position: 'relative',
  },
  emptyStateIllustrationOrb: {
    width: 246,
    height: 246,
    borderRadius: 123,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconRow: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  emptyStateSmallChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#ede9f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateSmallChipMuted: {
    backgroundColor: '#f8fafc',
    marginRight: -8,
  },
  emptyStateBadge: {
    position: 'absolute',
    bottom: -10,
    right: 30,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 3,
  },
  emptyStateBadgeText: {
    color: BabyCityPalette.textSecondary,
  },
  emptyStateTitle: {
    color: BabyCityPalette.textPrimary,
    marginBottom: 12,
    maxWidth: 290,
  },
  emptyStateBody: {
    lineHeight: 28,
    maxWidth: 300,
    marginBottom: 28,
  },
  emptyStatePrimaryAction: {
    width: '100%',
    marginBottom: 14,
  },
  emptyStatePrimaryGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 18,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 4,
  },
  emptyStatePrimaryText: {
    color: BabyCityPalette.onPrimary,
  },
  emptyStateSecondaryAction: {
    marginBottom: 34,
    paddingVertical: 8,
  },
  emptyStateSecondaryText: {
    color: BabyCityPalette.primary,
  },
  emptyTipCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: BabyCityPalette.surfaceLow,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyTipAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 4,
    backgroundColor: BabyCityPalette.primary,
  },
  emptyTipIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BabyCityPalette.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTipBody: {
    flex: 1,
    alignItems: 'flex-end',
  },
  emptyTipTitle: {
    color: BabyCityPalette.textPrimary,
    marginBottom: 4,
  },
  emptyTipText: {
    textAlign: 'right',
    lineHeight: 22,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 6,
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: ParentDesignTokens.spacing.cardInset,
    backgroundColor: '#ffffff',
  },
  filterSectionStack: {
    gap: 16,
  },
  booleanFiltersRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
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
