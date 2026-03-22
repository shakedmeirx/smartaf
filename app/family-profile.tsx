import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import AppShell from '@/components/navigation/AppShell';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import {
  rowToParentPost,
  rowToParentProfileDetails,
  rowToParentProfileSummary,
} from '@/lib/parentProfile';
import { findPairChatThread } from '@/lib/requestLookup';
import { supabase } from '@/lib/supabase';
import { BabyCityGeometry, BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { ParentPost } from '@/types/post';
import type { ParentProfileDetails, ParentProfileSummary } from '@/types/parent';

// Stitch placeholder pet photo (golden retriever from parent-profile design)
const STITCH_PET_PHOTO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDbFElj7KL9ShwrwkKuj8-1IeUa5yZIS6zsKxSq0O4b5_lZDMTCEVtaCrc3rreUsqIcZkyx9xHmjjRV07Yy2ykwv4EwwOXUFZ4mhRv-p2hU_HqrubX0cAXNJGp6zaLLWDyuudgZ2Q4uEBsLHqR96OlxAZ76QkepJ9Az9ZVki2YQ8aqoGSt6-lubeffgbUhSQsbWh0YDK9D_rNCnwITQ-nYkSkGcIHUKcGflY75eM7LBXDhieHd2xumc8wrwRSrdH2OHMyKRvgiPDRiQ';

const CARD_SHADOW = {
  shadowColor: '#242f41',
  shadowOpacity: 0.04,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
};

export default function FamilyProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = getRoleTheme('babysitter');
  const { currentBabysitterProfileId, chatThreads } = useAppState();
  const [family, setFamily] = useState<ParentProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFamily = useCallback(async () => {
    if (!id || Array.isArray(id)) {
      setFamily(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('parent_profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        city,
        profile_photo_path,
        children_count,
        child_birth_dates,
        child_age_groups,
        pets,
        family_note,
        users!user_id ( name )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      setFamily(null);
      setLoading(false);
      return;
    }

    const familySummary: ParentProfileSummary = rowToParentProfileSummary(
      data as Record<string, unknown>
    );

    const { data: postsData, error: postsError } = await supabase
      .from('parent_posts')
      .select(`
        id,
        parent_id,
        area,
        date,
        time,
        num_children,
        child_age_range,
        note,
        is_active,
        created_at
      `)
      .eq('parent_id', data.user_id as string)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('family-profile posts error:', postsError.message);
    }

    const posts: ParentPost[] = (postsData ?? []).map(row =>
      rowToParentPost(row as Record<string, unknown>, familySummary)
    );

    setFamily(rowToParentProfileDetails(data as Record<string, unknown>, posts));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadFamily();
  }, [loadFamily]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadFamily();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppShell
      title={strings.familyProfileTitle}
      activeTab="home"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        scrollProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
        }}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BabyCityPalette.primary} />
          </View>
        ) : family ? (
          <>
            {/* ── Banner with gradient overlay ── */}
            <View style={styles.bannerWrap}>
              <Image
                source={{
                  uri: family.profilePhotoUrl ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBT3NZv2Ptj1APxDCMZH2wv89IFmsUhiBHQu84bvclwSvSVpFfUVaqHGCOW7t0-R4jvfK4EtlZIuaeKDhXmihMbTGyoIMH0-xhwYbIo2vxd0gj4ouaSOF_kqeCq7qPW2hmHBb-M1PYksU6ssB_qTdppvclZH6t_WJPhg7fPKoJzdqREfDxIqG35dWzZZmxPIo2XXG7CsNZfMktndr9WHTTpdMFClBhdFQcOqBwaX6HssMk7dFJeKKza4EmFKB8lbJUOhQlYDfJ7E6mA',
                }}
                style={styles.bannerImg}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.35)']}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {/* ── Avatar overlapping banner ── */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarBorderWrap}>
                <AvatarCircle
                  name={family.fullName || strings.familyFeedAnonymous}
                  photoUrl={family.profilePhotoUrl}
                  size={96}
                />
              </View>
              <View style={styles.identitySection}>
                <AppText variant="h1" weight="800" style={styles.familyName}>
                  {`משפחת ${family.lastName || family.firstName || strings.familyFeedAnonymous}`}
                </AppText>
                {family.city ? (
                  <View style={styles.cityRow}>
                    <MaterialIcons name="location-on" size={16} color={BabyCityPalette.textSecondary} />
                    <AppText variant="body" tone="muted">{family.city}</AppText>
                  </View>
                ) : null}
              </View>
            </View>

            {/* About / family note */}
            <Animated.View entering={FadeInDown.duration(240).delay(60)} style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <MaterialIcons name="favorite" size={20} color={BabyCityPalette.primary} />
                <AppText variant="h2" weight="700" style={styles.infoCardTitle}>קצת עלינו</AppText>
              </View>
              <AppText variant="body" style={styles.noteText}>
                {family.familyNote || strings.parentProfileNoteEmpty}
              </AppText>
            </Animated.View>

            {/* Children section */}
            <Animated.View entering={FadeInDown.duration(240).delay(110)} style={styles.infoCardAlt}>
              <View style={styles.infoCardHeader}>
                <MaterialIcons name="child-care" size={20} color={BabyCityPalette.primary} />
                <AppText variant="h2" weight="700" style={styles.infoCardTitle}>{strings.parentChildrenAges}</AppText>
              </View>
              {family.childAges.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.childrenScroll}
                >
                  {family.childAges.map((age, i) => (
                    <View key={`child-${i}`} style={[styles.childCard, CARD_SHADOW]}>
                      <View style={styles.childIconWrap}>
                        <MaterialIcons
                          name={i % 2 === 0 ? 'face' : 'face-3'}
                          size={22}
                          color={i % 2 === 0 ? BabyCityPalette.primary : '#9e3657'}
                        />
                      </View>
                      <View>
                        <AppText variant="body" weight="700" style={styles.childName}>
                          {`ילד ${i + 1}`}
                        </AppText>
                        <AppText variant="caption" tone="muted">{strings.parentAgeYears(age)}</AppText>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : family.childAgeGroups.length > 0 ? (
                <View style={styles.pillRow}>
                  {family.childAgeGroups.map(group => (
                    <AppChip key={group} label={group} tone="accent" size="sm" />
                  ))}
                </View>
              ) : (
                <AppText variant="body" tone="muted">{strings.notFilled}</AppText>
              )}
            </Animated.View>

            {/* Pets section */}
            {family.pets.length > 0 ? (
              <Animated.View entering={FadeInDown.duration(240).delay(160)} style={[styles.infoCard, CARD_SHADOW]}>
                <View style={styles.infoCardHeader}>
                  <MaterialIcons name="pets" size={20} color={BabyCityPalette.primary} />
                  <AppText variant="h2" weight="700" style={styles.infoCardTitle}>{strings.parentPets}</AppText>
                </View>
                <View style={styles.petsRow}>
                  {family.pets.map((pet, i) => (
                    <View key={`pet-${i}`} style={styles.petItem}>
                      <View style={styles.petImageWrap}>
                        <Image source={{ uri: STITCH_PET_PHOTO }} style={styles.petImage} resizeMode="cover" />
                      </View>
                      <AppText variant="caption" weight="600" align="center" style={styles.petLabel}>{pet}</AppText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {/* Posts section */}
            <Animated.View entering={FadeInDown.duration(240).delay(210)}>
              <View style={styles.postsSectionHeader}>
                <AppText variant="h2" weight="700" style={styles.infoCardTitle}>{strings.parentPostsSection}</AppText>
              </View>
              {family.posts.length > 0 ? (
                <View style={styles.postsWrap}>
                  {family.posts.map(post => (
                    <View key={post.id} style={styles.postCard}>
                      <View style={styles.postCardInner}>
                        <View style={styles.postTopRow}>
                          <View style={styles.postBadge}>
                            <AppText variant="caption" weight="700" style={styles.postBadgeText}>{'דרוש/ה בייביסיטר'}</AppText>
                          </View>
                          <AppText variant="caption" tone="muted" style={styles.postDate}>
                            {post.date ? `פורסם ${post.date}` : ''}
                          </AppText>
                        </View>
                        <AppText variant="body" weight="700" style={styles.postTitle}>
                          {post.note || strings.familyFeedNoteEmpty}
                        </AppText>
                        <View style={styles.postMetaRow}>
                          {post.area ? <AppChip label={post.area} tone="accent" size="sm" /> : null}
                          {post.time ? <AppChip label={post.time} tone="muted" size="sm" /> : null}
                          {post.numChildren !== null ? (
                            <AppChip
                              label={`${post.numChildren} ${strings.familyFeedChildrenSuffix}`}
                              tone="primary"
                              size="sm"
                            />
                          ) : null}
                          {post.childAgeRange.map(group => (
                            <AppChip key={group} label={group} tone="warning" size="sm" />
                          ))}
                        </View>
                        <View style={styles.postStats}>
                          <View style={styles.postStat}>
                            <MaterialIcons name="visibility" size={14} color={BabyCityPalette.textSecondary} />
                            <AppText variant="caption" tone="muted">{'42 צפיות'}</AppText>
                          </View>
                          <View style={styles.postStat}>
                            <MaterialIcons name="chat" size={14} color={BabyCityPalette.textSecondary} />
                            <AppText variant="caption" tone="muted">{'5 פניות'}</AppText>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <AppText variant="body" style={styles.noteText}>{strings.parentProfilePostsEmpty}</AppText>
              )}
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInDown.duration(240).delay(260)} style={styles.ctaWrap}>
              <AppPrimaryButton
                label={
                  family?.userId &&
                  currentBabysitterProfileId &&
                  findPairChatThread(
                    chatThreads,
                    family.userId,
                    currentBabysitterProfileId
                  )
                    ? strings.alreadyChattingCta
                    : strings.sendMessage
                }
                onPress={() => {
                  if (family?.userId && currentBabysitterProfileId) {
                    const existingThread = findPairChatThread(
                      chatThreads,
                      family.userId,
                      currentBabysitterProfileId
                    );

                    if (existingThread) {
                      router.push(
                        `/chat?requestId=${existingThread.requestId}&name=${encodeURIComponent(
                          family.fullName || strings.familyFeedAnonymous
                        )}`
                      );
                      return;
                    }
                  }

                  router.push(
                    `/send-request?id=${family.userId}&name=${encodeURIComponent(
                      family.fullName || strings.familyFeedAnonymous
                    )}&targetRole=parent`
                  );
                }}
              />
              <TouchableOpacity
                style={styles.reportLink}
                onPress={() => {
                  const subject = encodeURIComponent(strings.reportEmailSubject);
                  const body = encodeURIComponent(
                    `Parent user ID: ${family.userId}\nParent profile ID: ${family.id}`
                  );
                  Linking.openURL(
                    `mailto:support@babysitconnect.app?subject=${subject}&body=${body}`
                  );
                }}
                activeOpacity={0.8}
              >
                <AppText variant="body" weight="700" align="center" tone="error" style={styles.reportLinkText}>{strings.reportUser}</AppText>
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <View style={styles.notFoundWrap}>
            <AppText variant="h1" align="center" style={styles.notFoundTitle}>{strings.profileNotFound}</AppText>
            <AppText variant="bodyLarge" tone="muted" align="center">{strings.familyFeedEmptyHint}</AppText>
          </View>
        )}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  notFoundWrap: {
    paddingVertical: 38,
    alignItems: 'center',
  },
  notFoundTitle: {
    lineHeight: 40,
  },
  // Banner
  bannerWrap: {
    marginHorizontal: -20,
    marginTop: -16,
    height: 192,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImg: {
    width: '100%',
    height: 192,
  },
  // Avatar + identity row (avatar overlaps banner)
  avatarRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: -40,
    marginBottom: 24,
    paddingRight: 0,
  },
  avatarBorderWrap: {
    borderRadius: 999,
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#242f41',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: 'hidden',
  },
  identitySection: {
    flex: 1,
    paddingBottom: 4,
  },
  familyName: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  cityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  // About card (white)
  infoCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#242f41',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  // Alternate card (surface-low bg)
  infoCardAlt: {
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  infoCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoCardTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  noteText: {
    color: BabyCityPalette.textSecondary,
    lineHeight: 26,
    textAlign: 'right',
  },
  // Children horizontal scroll
  childrenScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  childCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 160,
  },
  childIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BabyCityPalette.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  // Pets
  petsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 16,
  },
  petItem: {
    alignItems: 'center',
    gap: 6,
  },
  petImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  petLabel: {
    color: BabyCityPalette.textPrimary,
    maxWidth: 72,
  },
  pillRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  // Posts section
  postsSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postsWrap: {
    gap: 12,
    marginBottom: 16,
  },
  postCard: {
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 12,
    borderRightWidth: 4,
    borderRightColor: BabyCityPalette.primary,
    overflow: 'hidden',
  },
  postCardInner: {
    padding: 20,
  },
  postTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postBadge: {
    backgroundColor: 'rgba(112, 42, 225, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  postBadgeText: {
    color: BabyCityPalette.primary,
  },
  postDate: {
    fontStyle: 'italic',
  },
  postTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    marginBottom: 8,
  },
  postMetaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  postStats: {
    flexDirection: 'row-reverse',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  // CTA
  ctaWrap: {
    marginTop: 8,
    marginBottom: 32,
  },
  reportLink: {
    alignSelf: 'flex-end',
    marginTop: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  reportLinkText: {
    // Handled by AppText
  },
});
