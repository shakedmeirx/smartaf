import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import SmartafWordmark from '@/components/ui/SmartafWordmark';
import AppText from '@/components/ui/AppText';
import AppShell from '@/components/navigation/AppShell';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import {
  attachParentProfilePhotoUrls,
  rowToParentPost,
  rowToParentProfileDetails,
  rowToParentProfileSummary,
} from '@/lib/parentProfile';
import { findPairChatThread } from '@/lib/requestLookup';
import { supabase } from '@/lib/supabase';
import { BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { ParentPost } from '@/types/post';
import type { ParentProfileDetails, ParentProfileSummary } from '@/types/parent';

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
  const { currentBabysitterProfileId, chatThreads, blockUser, isUserExcluded } = useAppState();
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
        child_names,
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

    const [familySummary] = await attachParentProfilePhotoUrls([
      rowToParentProfileSummary(data as Record<string, unknown>),
    ]);

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

    setFamily(
      rowToParentProfileDetails(
        data as Record<string, unknown>,
        posts,
        familySummary?.profilePhotoUrl
      )
    );
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

  const existingThread =
    family?.userId && currentBabysitterProfileId
      ? findPairChatThread(chatThreads, family.userId, currentBabysitterProfileId)
      : null;
  const isBlockedFamily = !!family?.userId && isUserExcluded(family.userId);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/babysitter');
  }

  async function confirmBlockFamily() {
    if (!family?.userId) return;

    const result = await blockUser(family.userId);
    if (!result.success) {
      Alert.alert(strings.blockUserError);
      return;
    }

    Alert.alert(strings.blockUserSuccess);
    router.replace('/babysitter');
  }

  function handleBlockFamily() {
    if (!family?.userId) return;

    Alert.alert(
      strings.blockUserConfirmTitle,
      strings.blockUserConfirmBody,
      [
        {
          text: strings.myPostsDeleteConfirmCancel,
          style: 'cancel',
        },
        {
          text: strings.blockUserConfirmAction,
          style: 'destructive',
          onPress: () => {
            void confirmBlockFamily();
          },
        },
      ]
    );
  }

  return (
    <AppShell
      title=""
      activeTab="home"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={handleBack}
      hideHeaderMenuButton
      backButtonVariant="icon"
      renderHeaderActions={() => (
        <SmartafWordmark size="sm" textColor={BabyCityPalette.primary} />
      )}
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
            <Animated.View entering={FadeInDown.duration(240)} style={styles.heroSection}>
              <View style={styles.bannerWrap}>
                {family.profilePhotoUrl ? (
                  <Image
                    source={{ uri: family.profilePhotoUrl }}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[BabyCityPalette.surfaceContainer, BabyCityPalette.surfaceLow]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bannerImage}
                  />
                )}
              </View>

              <View style={styles.heroIdentityRow}>
                <View style={styles.avatarBorderWrap}>
                  <AvatarCircle
                    name={family.fullName || strings.familyFeedAnonymous}
                    photoUrl={family.profilePhotoUrl}
                    size={120}
                    tone="muted"
                  />
                </View>
                <View style={styles.identitySection}>
                  <AppText variant="h1" weight="800" style={styles.familyName}>
                    {strings.familyProfileNamePrefix(
                      family.lastName || family.firstName || strings.familyFeedAnonymous
                    )}
                  </AppText>
                  {family.city ? (
                    <View style={styles.cityRow}>
                      <MaterialIcons
                        name="location-on"
                        size={16}
                        color={BabyCityPalette.textSecondary}
                      />
                      <AppText variant="body" tone="muted">
                        {family.city}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(60)} style={[styles.infoCard, CARD_SHADOW]}>
              <View style={styles.infoCardHeader}>
                <MaterialIcons name="favorite" size={20} color={BabyCityPalette.primary} />
                <AppText variant="h2" weight="700" style={styles.infoCardTitle}>
                  {strings.familyProfileAboutUs}
                </AppText>
              </View>
              <AppText variant="body" style={styles.noteText}>
                {family.familyNote || strings.parentProfileNoteEmpty}
              </AppText>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(110)} style={styles.infoCardAlt}>
              <View style={styles.infoCardHeader}>
                <MaterialIcons name="child-care" size={20} color={BabyCityPalette.primary} />
                <AppText variant="h2" weight="700" style={styles.infoCardTitle}>
                  {strings.parentChildrenAges}
                </AppText>
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
                          {family.childNames[i]?.trim() || strings.familyProfileChildN(i + 1)}
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
                  <AppText variant="h2" weight="700" style={styles.infoCardTitle}>
                    {strings.parentPets}
                  </AppText>
                </View>
                <View style={styles.petsColumn}>
                  {family.pets.map((pet, i) => (
                    <View key={`pet-${i}`} style={styles.petItem}>
                      <View style={styles.petIconWrap}>
                        <MaterialIcons name="pets" size={22} color={BabyCityPalette.primary} />
                      </View>
                      <View style={styles.petCopy}>
                        <AppText variant="body" weight="700" style={styles.petLabel}>
                          {pet}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={styles.petHint}>
                          חיית מחמד בבית
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.duration(240).delay(210)}>
              <View style={styles.postsSectionHeader}>
                <View style={[styles.postsSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="article" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700" style={styles.infoCardTitle}>
                  {strings.parentPostsSection}
                </AppText>
              </View>
              {family.posts.length > 0 ? (
                <View style={styles.postsWrap}>
                  {family.posts.map(post => (
                    <View key={post.id} style={styles.postCard}>
                      <View style={styles.postCardInner}>
                        <View style={styles.postTopRow}>
                          <View style={styles.postBadge}>
                            <AppText variant="caption" weight="700" style={styles.postBadgeText}>{strings.familyProfileBabysitterNeeded}</AppText>
                          </View>
                          <AppText variant="caption" tone="muted" style={styles.postDate}>
                            {post.date ? strings.familyProfilePostedOn(post.date) : ''}
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
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.infoCard, CARD_SHADOW]}>
                  <AppText variant="body" style={styles.noteText}>
                    {strings.parentProfilePostsEmpty}
                  </AppText>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(260)} style={styles.ctaWrap}>
              {isBlockedFamily ? (
                <AppCard role="babysitter" variant="panel" style={styles.blockedCard}>
                  <AppText variant="h3" weight="800" align="center" style={styles.blockedTitle}>
                    {strings.userBlockedTitle}
                  </AppText>
                  <AppText variant="body" tone="muted" align="center" style={styles.blockedBody}>
                    {strings.userBlockedBody}
                  </AppText>
                </AppCard>
              ) : (
                <>
                  <AppPrimaryButton
                    label={existingThread ? strings.alreadyChattingCta : strings.sendMessage}
                    onPress={() => {
                      if (existingThread) {
                        router.push(
                          `/chat?requestId=${existingThread.requestId}&name=${encodeURIComponent(
                            family.fullName || strings.familyFeedAnonymous
                          )}`
                        );
                        return;
                      }

                      router.push(
                        `/send-request?id=${family.userId}&name=${encodeURIComponent(
                          family.fullName || strings.familyFeedAnonymous
                        )}&targetRole=parent`
                      );
                    }}
                  />
                  <View style={styles.actionLinksRow}>
                    <TouchableOpacity
                      style={styles.reportLink}
                      onPress={() => {
                        router.push(
                          `/contact?origin=family-profile&action=safety&targetRole=parent&targetUserId=${encodeURIComponent(
                            family.userId
                          )}&targetProfileId=${encodeURIComponent(family.id)}`
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <AppText variant="body" weight="700" align="center" tone="error" style={styles.reportLinkText}>{strings.reportUser}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reportLink}
                      onPress={handleBlockFamily}
                      activeOpacity={0.8}
                    >
                      <AppText variant="body" weight="700" align="center" style={styles.blockLinkText}>{strings.blockUser}</AppText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  heroSection: {
    marginBottom: 20,
  },
  bannerWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 192,
    backgroundColor: BabyCityPalette.surfaceContainer,
  },
  bannerImage: {
    width: '100%',
    height: 192,
  },
  heroIdentityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: -40,
    paddingHorizontal: 16,
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
    backgroundColor: '#ffffff',
  },
  identitySection: {
    flex: 1,
    paddingBottom: 6,
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
  infoCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  infoCardAlt: {
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 24,
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
    borderRadius: 20,
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
  petsColumn: {
    gap: 14,
  },
  petItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  petIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceLow,
  },
  petCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  petLabel: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  petHint: {
    textAlign: 'right',
    marginTop: 2,
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
    gap: 10,
    marginBottom: 12,
  },
  postsSectionIconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postsWrap: {
    gap: 12,
    marginBottom: 16,
  },
  postCard: {
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 20,
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
  // CTA
  ctaWrap: {
    marginTop: 8,
    marginBottom: 32,
  },
  blockedCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  blockedTitle: {
    color: BabyCityPalette.textPrimary,
  },
  blockedBody: {
    marginTop: 8,
    lineHeight: 24,
  },
  actionLinksRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    gap: 16,
    marginTop: 14,
  },
  reportLink: {
    marginTop: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  reportLinkText: {
    // Handled by AppText
  },
  blockLinkText: {
    color: BabyCityPalette.error,
  },
});
