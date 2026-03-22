import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AppShell from '@/components/navigation/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppContext';
import { loadBabysitterProfileByUserId } from '@/lib/babysitterProfile';
import { getParentProfilePhotoPath } from '@/lib/parentPhotos';
import { getBabysitterProfilePhotoPath } from '@/lib/babysitterPhotos';
import {
  rowToParentPost,
  rowToParentProfileDetails,
  rowToParentProfileSummary,
} from '@/lib/parentProfile';
import { loadBabysitterRatings } from '@/lib/ratings';
import type { BabysitterRating } from '@/types/rating';
import { strings } from '@/locales';
import { supabase } from '@/lib/supabase';
import { Babysitter } from '@/types/babysitter';
import { ParentPost } from '@/types/post';
import type { ParentProfileDetails, ParentProfileSummary } from '@/types/parent';
import AppScreen from '@/components/ui/AppScreen';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import BabysitterProfileHeroCard from '@/components/babysitter/BabysitterProfileHeroCard';
import BabysitterStatCard from '@/components/babysitter/BabysitterStatCard';
import ParentOwnedPostCard from '@/components/parent/ParentOwnedPostCard';
import ProfileHeroCard from '@/components/parent/ProfileHeroCard';
import ProfileDetailsCard, { ProfileDetailsRow } from '@/components/parent/ProfileDetailsCard';
import SectionHeader from '@/components/ui/SectionHeader';
import {
  isProfilePhotoPermissionError,
  removeBabysitterProfilePhoto,
  removeParentProfilePhoto,
  selectAndUploadBabysitterProfilePhoto,
  selectAndUploadParentProfilePhoto,
} from '@/lib/profilePhoto';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabysitterDesignTokens,
  BabyCityPalette,
  ParentDesignTokens,
  getRoleTheme,
} from '@/constants/theme';

function softWrapLongTokens(value: string) {
  return value.replace(/\S{18,}/g, token => token.replace(/(.{12})/g, '$1\u200B'));
}

export default function MyProfileScreen() {
  const { activeRole, session } = useAuth();
  const { refreshParentData, refreshBabysitterData } = useAppState();
  const roleName = activeRole === 'babysitter' ? 'babysitter' : 'parent';
  const theme = getRoleTheme(roleName);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [parentProfile, setParentProfile] = useState<ParentProfileDetails | null>(null);
  const [babysitterProfile, setBabysitterProfile] = useState<Babysitter | null>(null);
  const [galleryPhotoUrls, setGalleryPhotoUrls] = useState<string[]>([]);
  const [receivedRatings, setReceivedRatings] = useState<BabysitterRating[]>([]);
  const [avgStars, setAvgStars] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    if (!session?.user.id || !activeRole) {
      setParentProfile(null);
      setBabysitterProfile(null);
      setGalleryPhotoUrls([]);
      setLoading(false);
      return;
    }

    if (activeRole === 'parent') {
      const [{ data: userRow }, { data: profileRow }] = await Promise.all([
        supabase
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('parent_profiles')
          .select(`
            id,
            user_id,
            first_name,
            last_name,
            address_full,
            city,
            profile_photo_path,
            children_count,
            child_birth_dates,
            child_age_groups,
            pets,
            family_note
          `)
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ]);

      const { data: postsRows } = await supabase
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
        .eq('parent_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const baseProfileRow = profileRow
        ? ({
            ...profileRow,
            users: { name: (userRow?.name as string | null) ?? '' },
          } as Record<string, unknown>)
        : null;
      const parentProfileSummary: ParentProfileSummary | null = baseProfileRow
        ? rowToParentProfileSummary(baseProfileRow)
        : null;
      const posts: ParentPost[] = (postsRows ?? []).map(row =>
        rowToParentPost(row as Record<string, unknown>, parentProfileSummary ?? undefined)
      );

      setParentProfile(
        baseProfileRow
          ? rowToParentProfileDetails(baseProfileRow, posts)
          : null
      );
      setBabysitterProfile(null);
      setGalleryPhotoUrls([]);
      setLoading(false);
      return;
    }

    const result = await loadBabysitterProfileByUserId(session.user.id);
    setBabysitterProfile(result.babysitter);
    setGalleryPhotoUrls(result.galleryPhotoUrls);
    setParentProfile(null);
    setLoading(false);

    if (result.babysitter?.id) {
      const { ratings, averageStars } = await loadBabysitterRatings(result.babysitter.id);
      setReceivedRatings(ratings);
      setAvgStars(averageStars);
    }
  }, [activeRole, session?.user.id]);

  useEffect(() => {
    setLoading(true);
    setPhotoError('');
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }

  async function reloadRoleProfile(role: 'parent' | 'babysitter') {
    if (role === 'parent') {
      await refreshParentData();
    } else {
      await refreshBabysitterData();
    }

    await loadProfile();
  }

  async function handleParentPhotoChange() {
    const userId = session?.user.id;

    if (!userId || !parentProfile || photoBusy) {
      return;
    }

    try {
      setPhotoBusy(true);
      setPhotoError('');

      const uploadedPhoto = await selectAndUploadParentProfilePhoto(userId);

      if (!uploadedPhoto) {
        return;
      }

      const { error } = await supabase
        .from('parent_profiles')
        .update({ profile_photo_path: uploadedPhoto.path })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      await reloadRoleProfile('parent');
    } catch (error) {
      setPhotoError(
        isProfilePhotoPermissionError(error)
          ? strings.parentProfilePhotoPermissionError
          : strings.parentProfilePhotoUploadError
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleParentPhotoRemove() {
    const userId = session?.user.id;

    if (!userId || !parentProfile || photoBusy || !parentProfile.profilePhotoUrl) {
      return;
    }

    try {
      setPhotoBusy(true);
      setPhotoError('');

      await removeParentProfilePhoto(getParentProfilePhotoPath(userId));

      const { error } = await supabase
        .from('parent_profiles')
        .update({ profile_photo_path: null })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      await reloadRoleProfile('parent');
    } catch {
      setPhotoError(strings.parentProfilePhotoRemoveError);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleBabysitterPhotoChange() {
    const userId = session?.user.id;

    if (!userId || !babysitterProfile || photoBusy) {
      return;
    }

    try {
      setPhotoBusy(true);
      setPhotoError('');

      const uploadedPhoto = await selectAndUploadBabysitterProfilePhoto(userId);

      if (!uploadedPhoto) {
        return;
      }

      const { error } = await supabase
        .from('babysitter_profiles')
        .update({ profile_photo_path: uploadedPhoto.path })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      await reloadRoleProfile('babysitter');
    } catch (error) {
      setPhotoError(
        isProfilePhotoPermissionError(error)
          ? strings.profilePhotoPermissionError
          : strings.profilePhotoUploadError
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleBabysitterPhotoRemove() {
    const userId = session?.user.id;

    if (!userId || !babysitterProfile || photoBusy || !babysitterProfile.profilePhotoUrl) {
      return;
    }

    try {
      setPhotoBusy(true);
      setPhotoError('');

      await removeBabysitterProfilePhoto(getBabysitterProfilePhotoPath(userId));

      const { error } = await supabase
        .from('babysitter_profiles')
        .update({ profile_photo_path: null })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      await reloadRoleProfile('babysitter');
    } catch {
      setPhotoError(strings.profilePhotoRemoveError);
    } finally {
      setPhotoBusy(false);
    }
  }

  function openParentPhotoMenu() {
    Alert.alert(strings.parentProfilePhoto, undefined, [
      {
        text: parentProfile?.profilePhotoUrl
          ? strings.parentProfilePhotoChange
          : strings.parentProfilePhotoAdd,
        onPress: () => {
          void handleParentPhotoChange();
        },
      },
      ...(parentProfile?.profilePhotoUrl
        ? [
            {
              text: strings.parentProfilePhotoRemove,
              style: 'destructive' as const,
              onPress: () => {
                void handleParentPhotoRemove();
              },
            },
          ]
        : []),
      {
        text: strings.cancel,
        style: 'cancel',
      },
    ]);
  }

  function openBabysitterPhotoMenu() {
    Alert.alert(strings.profilePhotoPlaceholder, undefined, [
      {
        text: babysitterProfile?.profilePhotoUrl
          ? strings.profilePhotoChangeAction
          : strings.profilePhotoAddAction,
        onPress: () => {
          void handleBabysitterPhotoChange();
        },
      },
      ...(babysitterProfile?.profilePhotoUrl
        ? [
            {
              text: strings.profilePhotoRemoveAction,
              style: 'destructive' as const,
              onPress: () => {
                void handleBabysitterPhotoRemove();
              },
            },
          ]
        : []),
      {
        text: strings.cancel,
        style: 'cancel',
      },
    ]);
  }

  const parentDetailsRows: ProfileDetailsRow[] = parentProfile
    ? [
        {
          key: 'first-name',
          label: strings.firstName,
          value: parentProfile.firstName || strings.notFilled,
        },
        {
          key: 'last-name',
          label: strings.lastName,
          value: parentProfile.lastName || strings.notFilled,
        },
        {
          key: 'address',
          label: strings.parentFullAddress,
          value: parentProfile.addressFull || strings.notFilled,
        },
        {
          key: 'city',
          label: strings.cityLabel,
          value: parentProfile.city || strings.notFilled,
        },
        {
          key: 'children-count',
          label: strings.parentChildrenCount,
          value:
            parentProfile.childrenCount !== null
              ? String(parentProfile.childrenCount)
              : strings.notFilled,
        },
      ]
    : [];

  if (loading) {
    return (
      <AppShell title={strings.myProfile} activeTab="profile" backgroundColor={theme.screenBackground} enableRootTabSwipe>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BabyCityPalette.primary} />
        </View>
      </AppShell>
    );
  }

  if (activeRole === 'babysitter' && babysitterProfile) {
    const babysitterHeroBadges = [
      babysitterProfile.isVerified
        ? { label: strings.verifiedBadge, tone: 'success' as const }
        : null,
      babysitterProfile.hasFirstAid
        ? { label: strings.firstAidBadge, tone: 'accent' as const }
        : null,
      babysitterProfile.hasReferences
        ? { label: strings.referencesBadge, tone: 'primary' as const }
        : null,
      babysitterProfile.hasCar
        ? { label: strings.hasCarBadge, tone: 'muted' as const }
        : null,
    ].filter(Boolean) as { label: string; tone: 'primary' | 'accent' | 'success' | 'muted' }[];

    return (
      <AppShell title={strings.myProfile} activeTab="profile" backgroundColor={theme.screenBackground} enableRootTabSwipe>
        <AppScreen
          scrollable
          backgroundColor={theme.screenBackground}
          scrollProps={{
            refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
          }}
        >
          <Animated.View entering={FadeInDown.duration(220)}>
            <BabysitterProfileHeroCard
              name={
                babysitterProfile.age
                  ? `${babysitterProfile.name}, ${babysitterProfile.age}`
                  : babysitterProfile.name
              }
              subtitle={babysitterProfile.city || strings.notFilled}
              photoUrl={babysitterProfile.profilePhotoUrl}
              rateLabel={String(babysitterProfile.hourlyRate)}
              ratingLabel={
                avgStars !== null
                  ? receivedRatings.length === 1
                    ? strings.ratingsSummaryOne(avgStars)
                    : strings.ratingsSummary(avgStars, receivedRatings.length)
                  : strings.ratingsEmpty
              }
              badges={babysitterHeroBadges}
              photoAccessorySlot={
                <Pressable
                  onPress={openBabysitterPhotoMenu}
                  disabled={photoBusy}
                  style={styles.photoAccessoryButton}
                  hitSlop={8}
                >
                  {photoBusy ? (
                    <ActivityIndicator size="small" color={BabyCityPalette.primary} />
                  ) : (
                    <Ionicons name="pencil-outline" size={16} color={BabyCityPalette.primary} />
                  )}
                </Pressable>
              }
              actionSlot={
                <AppPrimaryButton
                  label={strings.settingsEditProfile}
                  onPress={() => router.push('/babysitter-onboarding')}
                />
              }
            />
            {photoError ? (
              <AppText variant="caption" tone="error" style={styles.heroErrorText}>
                {photoError}
              </AppText>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(60)} style={styles.statsRow}>
            <BabysitterStatCard
              label={strings.yearsExpLabel}
              value={babysitterProfile.yearsExperience || strings.notFilled}
              icon="briefcase-outline"
              tone="accent"
              emphasis="label"
            />
            <BabysitterStatCard
              label={strings.ageGroupsProfile}
              value={
                babysitterProfile.ageGroups.length > 0
                  ? `${babysitterProfile.ageGroups.length}`
                  : strings.notFilled
              }
              icon="people-outline"
              tone="primary"
              emphasis="label"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(110)}>
            <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
              <SectionHeader title={strings.bioLabel} titleVariant="h2" />
              <AppText variant="body" style={styles.noteText}>
                {softWrapLongTokens(babysitterProfile.bio || strings.babysitterProfileEmptyHint)}
              </AppText>
            </AppCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(150)}>
            <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
              <SectionHeader title={strings.spokenLanguages} titleVariant="h2" />
              {babysitterProfile.languages.length > 0 ? (
                <View style={styles.ageGroupRow}>
                  {babysitterProfile.languages.map(language => (
                    <AppChip key={language} label={language} tone="accent" size="sm" />
                  ))}
                </View>
              ) : (
                <AppText variant="body" tone="muted">
                  {strings.notFilled}
                </AppText>
              )}
            </AppCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(190)}>
            <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
              <SectionHeader title={strings.availabilityProfile} titleVariant="h2" />
              {babysitterProfile.availability.length > 0 ? (
                <View style={styles.ageGroupRow}>
                  {babysitterProfile.availability.map(slot => (
                    <AppChip key={slot} label={slot} tone="muted" size="sm" />
                  ))}
                </View>
              ) : (
                <AppText variant="body" tone="muted">
                  {strings.notFilled}
                </AppText>
              )}
            </AppCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(230)}>
            <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
              <SectionHeader title={strings.trustLabel} titleVariant="h2" />
              {babysitterProfile.isVerified ||
              babysitterProfile.hasFirstAid ||
              babysitterProfile.hasReferences ||
              babysitterProfile.hasCar ? (
                <View style={styles.ageGroupRow}>
                  {babysitterProfile.isVerified ? (
                    <AppChip label={strings.verifiedBadge} tone="success" size="sm" />
                  ) : null}
                  {babysitterProfile.hasFirstAid ? (
                    <AppChip label={strings.firstAidBadge} tone="accent" size="sm" />
                  ) : null}
                  {babysitterProfile.hasReferences ? (
                    <AppChip label={strings.referencesBadge} tone="primary" size="sm" />
                  ) : null}
                  {babysitterProfile.hasCar ? (
                    <AppChip label={strings.hasCarBadge} tone="muted" size="sm" />
                  ) : null}
                </View>
              ) : (
                <AppText variant="body" tone="muted">
                  {strings.notFilled}
                </AppText>
              )}
            </AppCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(270)}>
            <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
              <SectionHeader
                title={strings.ratingsTitle}
                titleVariant="h2"
                subtitle={
                  avgStars !== null
                    ? receivedRatings.length === 1
                      ? strings.ratingsSummaryOne(avgStars)
                      : strings.ratingsSummary(avgStars, receivedRatings.length)
                    : undefined
                }
              />
              {receivedRatings.length === 0 ? (
                <AppText variant="body" tone="muted">
                  {strings.ratingsEmpty}
                </AppText>
              ) : (
                receivedRatings.map(r => (
                  <View key={r.id} style={styles.ratingRow}>
                    <View style={styles.ratingRowTop}>
                      <AppText variant="body" weight="700" style={styles.ratingStars}>
                        {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                      </AppText>
                      {r.parentName ? (
                        <AppText variant="caption" tone="muted">
                          {r.parentName}
                        </AppText>
                      ) : null}
                    </View>
                    {r.reviewText ? (
                      <AppText variant="body" style={styles.ratingReviewText}>
                        {r.reviewText}
                      </AppText>
                    ) : null}
                  </View>
                ))
              )}
            </AppCard>
          </Animated.View>
        </AppScreen>
      </AppShell>
    );
  }

  if (activeRole === 'babysitter') {
    return (
      <AppShell title={strings.myProfile} activeTab="profile" backgroundColor={theme.screenBackground} enableRootTabSwipe>
        <AppScreen
          scrollable
          backgroundColor={theme.screenBackground}
          scrollProps={{
            refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
          }}
        >
          <AppCard role="babysitter" variant="hero" style={styles.emptyProfileCard}>
            <SectionHeader
              title={strings.babysitterProfileEmpty}
              subtitle={strings.babysitterProfileEmptyHint}
            />
            <AppPrimaryButton
              label={strings.startOnboarding}
              onPress={() => router.push('/babysitter-onboarding')}
              style={styles.emptyButton}
            />
          </AppCard>
        </AppScreen>
      </AppShell>
    );
  }

  return (
    <AppShell title={strings.myProfile} activeTab="profile" backgroundColor={theme.screenBackground} enableRootTabSwipe>
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        scrollProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
        }}
      >
        {parentProfile ? (
          <>
            <ProfileHeroCard
              name={parentProfile.fullName || strings.notFilled}
              subtitle={parentProfile.city || strings.notFilled}
              photoUrl={parentProfile.profilePhotoUrl}
              badgeLabel={strings.iAmParent}
              badgeTone="primary"
              photoAccessorySlot={
                <Pressable
                  onPress={openParentPhotoMenu}
                  disabled={photoBusy}
                  style={styles.photoAccessoryButton}
                  hitSlop={8}
                >
                  {photoBusy ? (
                    <ActivityIndicator size="small" color={BabyCityPalette.primary} />
                  ) : (
                    <Ionicons name="pencil-outline" size={16} color={BabyCityPalette.primary} />
                  )}
                </Pressable>
              }
              actionSlot={
                <AppPrimaryButton
                  label={strings.settingsEditProfile}
                  onPress={() => router.push('/parent-onboarding')}
                />
              }
            />
            {photoError ? (
              <AppText variant="caption" tone="error" style={styles.heroErrorText}>
                {photoError}
              </AppText>
            ) : null}

            <ProfileDetailsCard
              title={strings.parentProfileTitle}
              rows={parentDetailsRows}
            />

            <ProfileDetailsCard
              title={
                parentProfile.childAges.length > 0
                  ? strings.parentChildrenAges
                  : strings.parentChildAgeGroups
              }
            >
              <View style={styles.chipsWrap}>
                {(parentProfile.childAges.length > 0
                  ? parentProfile.childAges.map(age => strings.parentAgeYears(age))
                  : parentProfile.childAgeGroups
                ).length > 0 ? (
                  (parentProfile.childAges.length > 0
                    ? parentProfile.childAges.map(age => strings.parentAgeYears(age))
                    : parentProfile.childAgeGroups
                  ).map(value => (
                    <AppChip key={value} label={value} tone="accent" size="sm" />
                  ))
                ) : (
                  <AppText variant="body" tone="muted">
                    {strings.notFilled}
                  </AppText>
                )}
              </View>
            </ProfileDetailsCard>

            <ProfileDetailsCard title={strings.parentPets}>
              <View style={styles.chipsWrap}>
                {parentProfile.pets.length > 0 ? (
                  parentProfile.pets.map(pet => (
                    <AppChip key={pet} label={pet} tone="success" size="sm" />
                  ))
                ) : (
                  <AppText variant="body" tone="muted">
                    {strings.notFilled}
                  </AppText>
                )}
              </View>
            </ProfileDetailsCard>

            <ProfileDetailsCard title={strings.parentFamilyNote}>
              <AppText variant="bodyLarge" style={styles.parentNoteText}>
                {parentProfile.familyNote || strings.parentProfileNoteEmpty}
              </AppText>
            </ProfileDetailsCard>

            <ProfileDetailsCard title={strings.parentPostsSection}>
              {parentProfile.posts.length > 0 ? (
                <View style={styles.parentPostsWrap}>
                  {parentProfile.posts.map(post => (
                    <ParentOwnedPostCard
                      key={post.id}
                      post={post}
                      mode="profile"
                      onPress={() => router.push('/my-posts')}
                      onEdit={() => router.push({ pathname: '/create-post', params: { postId: post.id } })}
                    />
                  ))}
                </View>
              ) : (
                <AppText variant="body" tone="muted">
                  {strings.parentProfilePostsEmpty}
                </AppText>
              )}
            </ProfileDetailsCard>
          </>
        ) : (
          <AppCard role="parent" variant="hero" style={styles.emptyProfileCard}>
            <SectionHeader
              title={strings.parentProfileEmpty}
              subtitle={strings.parentProfileEmptyHint}
            />
            <AppPrimaryButton
              label={strings.settingsEditProfile}
              onPress={() => router.push('/parent-onboarding')}
              style={styles.emptyButton}
            />
          </AppCard>
        )}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  infoCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  ratingRow: {
    paddingTop: 10,
    marginTop: 10,
  },
  ratingRowTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingStars: {
    color: BabyCityChipTones.warning.text,
  },
  ratingReviewText: {
    color: BabyCityPalette.textPrimary,
    lineHeight: 22,
  },
  ageGroupRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoAccessoryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BabyCityPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroErrorText: {
    marginTop: 10,
  },
  noteText: {
    width: '100%',
    lineHeight: 23,
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  parentNoteText: {
    width: '100%',
    textAlign: 'right',
    color: ParentDesignTokens.text.primary,
    lineHeight: 24,
  },
  parentPostsWrap: {
    width: '100%',
    gap: 12,
  },
  emptyButton: {
    marginTop: 20,
  },
  emptyProfileCard: {
    marginTop: 8,
  },
});
