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
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import AppShell from '@/components/navigation/AppShell';
import AvatarCircle from '@/components/ui/AvatarCircle';
import SectionHeader from '@/components/ui/SectionHeader';
import BabysitterStatCard from '@/components/babysitter/BabysitterStatCard';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import {
  rowToParentPost,
  rowToParentProfileDetails,
  rowToParentProfileSummary,
} from '@/lib/parentProfile';
import { findPairChatThread } from '@/lib/requestLookup';
import { supabase } from '@/lib/supabase';
import { BabysitterDesignTokens, BabyCityGeometry, BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { ParentPost } from '@/types/post';
import type { ParentProfileDetails, ParentProfileSummary } from '@/types/parent';

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
            {/* ── Full-width banner ── */}
            <View style={styles.bannerWrap}>
              {family.profilePhotoUrl ? (
                <Image source={{ uri: family.profilePhotoUrl }} style={styles.bannerImg} resizeMode="cover" />
              ) : (
                <View style={[styles.bannerImg, styles.bannerPlaceholder]} />
              )}
            </View>

            {/* ── Avatar overlapping banner ── */}
            <View style={styles.avatarWrap}>
              <AvatarCircle
                name={family.fullName || strings.familyFeedAnonymous}
                photoUrl={family.profilePhotoUrl}
                size={88}
              />
            </View>

            {/* ── Identity ── */}
            <View style={styles.identitySection}>
              <AppText variant="h1" weight="800" align="center">
                {`משפחת ${family.lastName || family.firstName || strings.familyFeedAnonymous}`}
              </AppText>
              {family.city ? (
                <View style={styles.cityRow}>
                  <Ionicons name="location-outline" size={14} color={BabyCityPalette.textSecondary} />
                  <AppText variant="body" tone="muted">{family.city}</AppText>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.notFoundWrap}>
            <AppText variant="h1" align="center" style={styles.name}>{strings.profileNotFound}</AppText>
            <AppText variant="bodyLarge" tone="muted" align="center">{strings.familyFeedEmptyHint}</AppText>
          </View>
        )}

        {!loading && family ? (
          <>
            <Animated.View entering={FadeInDown.duration(240).delay(60)} style={styles.statsRow}>
              <BabysitterStatCard
                label={strings.parentChildrenCount}
                value={
                  family.childrenCount !== null ? String(family.childrenCount) : strings.notFilled
                }
                icon="people-outline"
                tone="primary"
                emphasis="label"
              />
              <BabysitterStatCard
                label={strings.parentActivePosts}
                value={String(family.posts.length)}
                icon="document-text-outline"
                tone="accent"
                emphasis="label"
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(110)}>
              <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
                <SectionHeader title={strings.parentFamilyNote} />
                <AppText variant="bodyLarge" style={styles.noteText}>
                  {family.familyNote || strings.parentProfileNoteEmpty}
                </AppText>
              </AppCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(160)}>
              <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
                <SectionHeader title={strings.parentChildrenAges} />
                {family.childAges.length > 0 ? (
                  <View style={styles.childrenRow}>
                    {family.childAges.map((age, i) => (
                      <View key={`${age}-${i}`} style={styles.childChip}>
                        <AvatarCircle name={String(i + 1)} size={40} tone="accent" />
                        <AppText variant="caption" tone="muted" align="center">
                          {strings.parentAgeYears(age)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : family.childAgeGroups.length > 0 ? (
                  <View style={styles.pillRow}>
                    {family.childAgeGroups.map(group => (
                      <AppChip key={group} label={group} tone="accent" size="sm" />
                    ))}
                  </View>
                ) : (
                  <AppText variant="body" tone="muted">{strings.notFilled}</AppText>
                )}
              </AppCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(210)}>
              <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
                <SectionHeader title={strings.parentPets} />
                {family.pets.length > 0 ? (
                  <View style={styles.pillRow}>
                    {family.pets.map(pet => (
                      <AppChip key={pet} label={pet} tone="primary" size="sm" />
                    ))}
                  </View>
                ) : (
                  <AppText variant="body" tone="muted">{strings.notFilled}</AppText>
                )}
              </AppCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(260)}>
              <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
                <SectionHeader title={strings.parentPostsSection} />
                {family.posts.length > 0 ? (
                  <View style={styles.postsWrap}>
                    {family.posts.map(post => (
                      <AppCard key={post.id} role="babysitter" variant="list" style={styles.postCard}>
                        <AppText variant="body" style={styles.postNote}>{post.note || strings.familyFeedNoteEmpty}</AppText>
                        <View style={styles.postMetaRow}>
                          {post.area ? <AppChip label={post.area} tone="accent" size="sm" /> : null}
                          {post.date ? (
                            <AppChip
                              label={post.time ? `${post.date} · ${post.time}` : post.date}
                              tone="muted"
                              size="sm"
                            />
                          ) : null}
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
                      </AppCard>
                    ))}
                  </View>
                ) : (
                  <AppText variant="bodyLarge" style={styles.noteText}>{strings.parentProfilePostsEmpty}</AppText>
                )}
              </AppCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(240).delay(310)}>
              <AppCard role="babysitter" variant="panel" style={styles.ctaCard}>
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
              </AppCard>
            </Animated.View>
          </>
        ) : null}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  // Banner + avatar hero
  bannerWrap: {
    marginHorizontal: -20,
    marginTop: -16,
    height: 200,
  },
  bannerImg: {
    width: '100%',
    height: 200,
  },
  bannerPlaceholder: {
    backgroundColor: BabyCityPalette.surfaceLow,
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -44,
    marginBottom: 12,
  },
  identitySection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notFoundWrap: {
    paddingVertical: 38,
    alignItems: 'center',
  },
  loadingWrap: {
    paddingVertical: 38,
    alignItems: 'center',
  },
  name: {
    lineHeight: 40,
  },
  // Children avatar chips
  childrenRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  childChip: {
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  infoCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  pillRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  noteText: {
    width: '100%',
    textAlign: 'right',
    lineHeight: 26,
  },
  postsWrap: {
    gap: 12,
  },
  postCard: {
    marginBottom: 0,
  },
  postNote: {
    width: '100%',
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 12,
  },
  postMetaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  ctaCard: {
    marginTop: 2,
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
