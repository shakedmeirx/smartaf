import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { BabyCityPalette, ParentDesignTokens, getRoleTheme } from '@/constants/theme';
import { useAppState } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { strings } from '@/locales';
import type { BabysitterRating } from '@/types/rating';

type RatingFilter = 'all' | 'newest' | 'highest';

function formatReviewDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function buildStars(stars: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const position = index + 1;

    if (stars >= position) {
      return 'star';
    }

    if (stars >= position - 0.5) {
      return 'star-half';
    }

    return 'star-border';
  });
}

export default function MyRatingsScreen() {
  const { currentUserId } = useAppState();
  const theme = getRoleTheme('parent');

  const [ratings, setRatings] = useState<(BabysitterRating & { babysitterName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<RatingFilter>('all');

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }
    loadMyRatings(currentUserId);
  }, [currentUserId]);

  async function loadMyRatings(parentId: string) {
    const { data } = await supabase
      .from('babysitter_ratings')
      .select(`
        id, parent_id, babysitter_id, stars, review_text, created_at,
        babysitter_profiles!babysitter_id ( users!user_id ( name ) )
      `)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    if (data) {
      setRatings(
        data.map((row: any) => ({
          id: row.id,
          parentId: row.parent_id,
          babysitterId: row.babysitter_id,
          stars: row.stars,
          reviewText: row.review_text ?? null,
          createdAt: row.created_at,
          babysitterName: row.babysitter_profiles?.users?.name ?? undefined,
        }))
      );
    }
    setLoading(false);
  }

  const ratingAverage = useMemo(() => {
    if (ratings.length === 0) {
      return 0;
    }

    const total = ratings.reduce((sum, item) => sum + item.stars, 0);
    return total / ratings.length;
  }, [ratings]);

  const ratingDistribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: ratings.filter(item => item.stars === stars).length,
      })),
    [ratings]
  );

  const visibleRatings = useMemo(() => {
    const items = [...ratings];

    if (activeFilter === 'highest') {
      return items.sort((a, b) => {
        if (b.stars !== a.stars) {
          return b.stars - a.stars;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    if (activeFilter === 'newest') {
      return items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return items;
  }, [activeFilter, ratings]);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/settings');
  }

  return (
    <AppShell
      title={strings.ratingsGivenTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={handleBack}
      hideHeaderMenuButton
      backButtonVariant="icon"
      titleContent={
        <View style={styles.headerTitleWrap}>
          <AppText variant="h2" weight="800" style={styles.headerTitle}>
            {strings.ratingsGivenTitle}
          </AppText>
        </View>
      }
      renderHeaderActions={({ openMenu, drawerPhotoUrl, drawerInitials }) => (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.84}
          onPress={openMenu}
          style={styles.headerAvatarButton}
        >
          <AvatarCircle
            name={drawerInitials || strings.appName}
            photoUrl={drawerPhotoUrl ?? undefined}
            size={36}
            tone="accent"
          />
        </TouchableOpacity>
      )}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BabyCityPalette.primary} />
        </View>
      ) : (
        <View style={styles.screen}>
          <View style={styles.backdropOrbTop} />
          <View style={styles.backdropOrbBottom} />

          <AppScreen
            scrollable
            backgroundColor={theme.screenBackground}
            contentContainerStyle={[
              styles.content,
              ratings.length === 0 && styles.contentEmpty,
            ]}
            scrollProps={{ showsVerticalScrollIndicator: false }}
          >
            {ratings.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <View style={styles.emptyIllustrationWrap}>
                  <View style={styles.emptyGlow} />
                  <View style={styles.emptyMainCircle}>
                    <View style={styles.emptyInnerCircle}>
                      <MaterialIcons name="star-outline" size={58} color={BabyCityPalette.primary} />
                    </View>

                    <View style={styles.emptyFloatingChip}>
                      <MaterialIcons name="search" size={26} color={BabyCityPalette.tertiary} />
                    </View>
                  </View>
                </View>

                <View style={styles.emptyCopyWrap}>
                  <AppText variant="h1" weight="800" style={styles.emptyTitle}>
                    {strings.ratingsGivenEmpty}
                  </AppText>
                  <AppText variant="bodyLarge" tone="muted" style={styles.emptyBody}>
                    {strings.ratingsGivenEmptyHint}
                  </AppText>
                </View>

                <AppButton
                  label={strings.ratingsGivenPrimaryAction}
                  size="lg"
                  onPress={() => router.push('/parent-requests')}
                  style={styles.emptyPrimaryButton}
                />

                <AppCard backgroundColor={BabyCityPalette.surfaceLow} style={styles.emptyInfoCard}>
                  <View style={styles.emptyInfoIconWrap}>
                    <MaterialIcons name="verified-user" size={22} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.emptyInfoTextWrap}>
                    <AppText variant="body" weight="700" style={styles.emptyInfoTitle}>
                      {strings.ratingsGivenHowItWorksTitle}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={styles.emptyInfoBody}>
                      {strings.ratingsGivenHowItWorksBody}
                    </AppText>
                  </View>
                </AppCard>
              </View>
            ) : (
              <>
                <AppCard style={styles.summaryCard}>
                  <View style={styles.summaryGlow} />

                  <View style={styles.summaryContent}>
                    <AppText variant="h1" weight="800" style={styles.summaryScore}>
                      {ratingAverage.toFixed(1)}
                    </AppText>

                    <View style={styles.summaryStarsRow}>
                      {buildStars(ratingAverage).map((iconName, index) => (
                        <MaterialIcons
                          key={`${iconName}-${index}`}
                          name={iconName}
                          size={22}
                          color={BabyCityPalette.primary}
                        />
                      ))}
                    </View>

                    <AppText variant="body" weight="600" style={styles.summaryCaption}>
                      {strings.ratingsGivenSummaryBasedOn(ratings.length)}
                    </AppText>

                    <View style={styles.distributionList}>
                      {ratingDistribution.map(item => {
                        const widthPercent =
                          ratings.length === 0 ? 0 : (item.count / ratings.length) * 100;

                        return (
                          <View key={item.stars} style={styles.distributionRow}>
                            <AppText variant="caption" weight="800" style={styles.distributionLabel}>
                              {item.stars}
                            </AppText>
                            <View style={styles.distributionTrack}>
                              <View
                                style={[
                                  styles.distributionFill,
                                  { width: `${Math.max(widthPercent, item.count > 0 ? 6 : 0)}%` },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </AppCard>

                <View style={styles.filtersRow}>
                  {([
                    ['all', strings.ratingsGivenFilterAll],
                    ['newest', strings.ratingsGivenFilterNewest],
                    ['highest', strings.ratingsGivenFilterHighest],
                  ] as const).map(([filterKey, label]) => {
                    const selected = activeFilter === filterKey;

                    return (
                      <TouchableOpacity
                        key={filterKey}
                        accessibilityRole="button"
                        activeOpacity={0.88}
                        onPress={() => setActiveFilter(filterKey)}
                        style={[styles.filterPill, selected && styles.filterPillActive]}
                      >
                        <AppText
                          variant="body"
                          weight={selected ? '700' : '600'}
                          style={[styles.filterPillText, selected && styles.filterPillTextActive]}
                        >
                          {label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.listSection}>
                  {visibleRatings.map(rating => (
                    <AppCard key={rating.id} style={styles.ratingCard}>
                      <View style={styles.ratingCardHeader}>
                        <AvatarCircle
                          name={rating.babysitterName || strings.ratingsGivenAnonymousBabysitter}
                          size={54}
                          tone="muted"
                        />

                        <View style={styles.ratingMeta}>
                          <AppText variant="bodyLarge" weight="800" style={styles.ratingName}>
                            {rating.babysitterName || strings.ratingsGivenAnonymousBabysitter}
                          </AppText>
                          <AppText variant="caption" weight="600" style={styles.ratingDate}>
                            {formatReviewDate(rating.createdAt)}
                          </AppText>
                          <View style={styles.ratingStarsRow}>
                            {buildStars(rating.stars).map((iconName, index) => (
                              <MaterialIcons
                                key={`${rating.id}-${iconName}-${index}`}
                                name={iconName}
                                size={19}
                                color={BabyCityPalette.primary}
                              />
                            ))}
                          </View>
                        </View>
                      </View>

                      {rating.reviewText ? (
                        <AppText variant="body" style={styles.ratingReview}>
                          {rating.reviewText}
                        </AppText>
                      ) : null}
                    </AppCard>
                  ))}
                </View>
              </>
            )}
          </AppScreen>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: -54,
    right: -44,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#ebe4ff',
    opacity: 0.72,
  },
  backdropOrbBottom: {
    position: 'absolute',
    bottom: 80,
    left: -52,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#eef0ff',
    opacity: 0.9,
  },
  content: {
    paddingTop: 20,
    gap: 20,
  },
  contentEmpty: {
    justifyContent: 'center',
    paddingBottom: 110,
  },
  headerTitleWrap: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: BabyCityPalette.primary,
    textAlign: 'right',
  },
  headerAvatarButton: {
    borderRadius: 22,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  summaryCard: {
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 32,
    overflow: 'hidden',
  },
  summaryGlow: {
    position: 'absolute',
    top: -28,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(112, 42, 225, 0.07)',
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryScore: {
    fontSize: 50,
    lineHeight: 54,
    color: BabyCityPalette.textPrimary,
    marginBottom: 8,
  },
  summaryStarsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  summaryCaption: {
    color: BabyCityPalette.textSecondary,
    marginBottom: 18,
  },
  distributionList: {
    width: '100%',
    gap: 10,
  },
  distributionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  distributionLabel: {
    width: 16,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  distributionTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#dfe6f8',
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BabyCityPalette.primary,
  },
  filtersRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.surfaceLowest,
  },
  filterPillActive: {
    backgroundColor: BabyCityPalette.primary,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  filterPillText: {
    color: BabyCityPalette.textSecondary,
  },
  filterPillTextActive: {
    color: BabyCityPalette.onPrimary,
  },
  listSection: {
    gap: ParentDesignTokens.spacing.cardGap,
  },
  ratingCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 28,
  },
  ratingCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 12,
  },
  ratingMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ratingName: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    marginBottom: 2,
  },
  ratingDate: {
    color: BabyCityPalette.outline,
    marginBottom: 6,
  },
  ratingStarsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 1,
  },
  ratingReview: {
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: BabyCityPalette.textSecondary,
  },
  emptyStateWrap: {
    alignItems: 'center',
  },
  emptyIllustrationWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(233, 222, 245, 0.5)',
    transform: [{ scaleX: 1.14 }, { scaleY: 0.94 }, { rotate: '-12deg' }],
  },
  emptyMainCircle: {
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 4,
  },
  emptyInnerCircle: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(178, 140, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFloatingChip: {
    position: 'absolute',
    top: 10,
    right: -10,
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: BabyCityPalette.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    transform: [{ rotate: '10deg' }],
  },
  emptyCopyWrap: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 26,
  },
  emptyTitle: {
    textAlign: 'center',
    color: BabyCityPalette.textPrimary,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  emptyPrimaryButton: {
    width: '100%',
    marginBottom: 28,
  },
  emptyInfoCard: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  emptyInfoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BabyCityPalette.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInfoTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  emptyInfoTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  emptyInfoBody: {
    textAlign: 'right',
    lineHeight: 20,
  },
});
