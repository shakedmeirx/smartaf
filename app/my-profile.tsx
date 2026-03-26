import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
import AvatarCircle from '@/components/ui/AvatarCircle';
import BabysitterProfileHeroCard from '@/components/babysitter/BabysitterProfileHeroCard';
import BabysitterStatCard from '@/components/babysitter/BabysitterStatCard';
import ParentOwnedPostCard from '@/components/parent/ParentOwnedPostCard';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
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
  const [receivedRatings, setReceivedRatings] = useState<BabysitterRating[]>([]);
  const [avgStars, setAvgStars] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    if (!session?.user.id || !activeRole) {
      setParentProfile(null);
      setBabysitterProfile(null);
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
            child_names,
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
      setLoading(false);
      return;
    }

    const result = await loadBabysitterProfileByUserId(session.user.id);
    setBabysitterProfile(result.babysitter);
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

  const parentIdentityFields = parentProfile
    ? [
        {
          key: 'name',
          label: strings.fullNameLabel,
          value: parentProfile.fullName || strings.notFilled,
          icon: 'person-outline' as const,
        },
        {
          key: 'address',
          label: strings.parentFullAddress,
          value: parentProfile.addressFull || strings.notFilled,
          icon: 'home-outline' as const,
        },
        {
          key: 'city',
          label: strings.cityLabel,
          value: parentProfile.city || strings.notFilled,
          icon: 'location-outline' as const,
        },
      ]
    : [];

  const parentChildrenItems = parentProfile
    ? (
        parentProfile.childAges.length > 0
          ? parentProfile.childAges.map((age, index) => ({
              key: `age-${index}`,
              label:
                parentProfile.childNames[index]?.trim() ||
                strings.parentProfileChildItemLabel(index + 1),
              detail: strings.parentAgeYears(age),
            }))
          : parentProfile.childAgeGroups.map((group, index) => ({
              key: `group-${index}`,
              label:
                parentProfile.childNames[index]?.trim() ||
                strings.parentProfileChildItemLabel(index + 1),
              detail: group,
            }))
      )
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
              <View style={styles.cardSectionHeader}>
                <View style={[styles.cardSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="edit-note" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.bioLabel}</AppText>
              </View>
              <AppText variant="body" style={styles.noteText}>
                {softWrapLongTokens(babysitterProfile.bio || strings.babysitterProfileEmptyHint)}
              </AppText>
            </AppCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(240).delay(150)}>
            <AppCard role="babysitter" variant="panel" style={styles.infoCard}>
              <View style={styles.cardSectionHeader}>
                <View style={[styles.cardSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="translate" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.spokenLanguages}</AppText>
              </View>
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
              <View style={styles.cardSectionHeader}>
                <View style={[styles.cardSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="calendar-today" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.availabilityProfile}</AppText>
              </View>
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
              <View style={styles.cardSectionHeader}>
                <View style={[styles.cardSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="verified-user" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.trustLabel}</AppText>
              </View>
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
              <View style={styles.cardSectionHeader}>
                <View style={[styles.cardSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="star" size={20} color={BabyCityPalette.primary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="bodyLarge" weight="700">{strings.ratingsTitle}</AppText>
                  {avgStars !== null ? (
                    <AppText variant="caption" tone="muted">
                      {receivedRatings.length === 1
                        ? strings.ratingsSummaryOne(avgStars)
                        : strings.ratingsSummary(avgStars, receivedRatings.length)}
                    </AppText>
                  ) : null}
                </View>
              </View>
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
          <ScreenStateCard
            role="babysitter"
            icon="person-outline"
            title={strings.babysitterProfileEmpty}
            body={strings.babysitterProfileEmptyHint}
            actionLabel={strings.startOnboarding}
            onActionPress={() => router.push('/babysitter-onboarding')}
            size="large"
            style={styles.emptyProfileCard}
          />
        </AppScreen>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={strings.myProfile}
      activeTab="profile"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
      bottomOverlay={
        parentProfile ? (
          <View style={styles.parentBottomOverlay}>
            <AppPrimaryButton
              label={strings.settingsEditProfile}
              onPress={() => router.push('/parent-onboarding?edit=true')}
              style={styles.parentBottomButton}
            />
          </View>
        ) : undefined
      }
    >
      <View style={styles.parentScreen}>
        <View style={styles.parentBackdropOrbTop} />
        <View style={styles.parentBackdropOrbBottom} />
        <AppScreen
          scrollable
          backgroundColor={theme.screenBackground}
          contentContainerStyle={styles.parentScreenContent}
          scrollProps={{
            refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
            showsVerticalScrollIndicator: false,
          }}
        >
          {parentProfile ? (
            <>
              <View style={styles.parentHeroSection}>
                <View style={styles.parentAvatarShell}>
                  <View style={styles.parentAvatarFrame}>
                    <View style={styles.parentAvatarWrap}>
                      <Pressable
                        onPress={openParentPhotoMenu}
                        disabled={photoBusy}
                        style={styles.parentPhotoAccessoryButton}
                        hitSlop={10}
                      >
                        {photoBusy ? (
                          <ActivityIndicator size="small" color={BabyCityPalette.onPrimary} />
                        ) : (
                          <Ionicons name="camera-outline" size={18} color={BabyCityPalette.onPrimary} />
                        )}
                      </Pressable>
                      <View style={styles.parentAvatarBadge}>
                        <AppText variant="caption" weight="700" style={styles.parentAvatarBadgeText}>
                          {strings.iAmParent}
                        </AppText>
                      </View>
                      <View style={styles.parentAvatarCircle}>
                        <AvatarCircle
                          name={parentProfile.fullName || strings.appName}
                          photoUrl={parentProfile.profilePhotoUrl}
                          size={116}
                          tone="accent"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <AppText variant="h1" weight="800" style={styles.parentHeroName}>
                  {parentProfile.fullName || strings.notFilled}
                </AppText>
                <AppText variant="body" style={styles.parentHeroSubtitle}>
                  {strings.parentProfileHeroSubtitle}
                </AppText>
                {photoError ? (
                  <AppText variant="caption" tone="error" style={styles.parentHeroErrorText}>
                    {photoError}
                  </AppText>
                ) : null}
              </View>

              <AppCard role="parent" variant="panel" style={styles.parentEditorialCard}>
                <View style={styles.parentSectionHeader}>
                  <View style={styles.parentSectionIconChip}>
                    <MaterialIcons name="person" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="bodyLarge" weight="700">
                    {strings.parentProfilePersonalSection}
                  </AppText>
                </View>

                <View style={styles.parentFieldStack}>
                  {parentIdentityFields.map(field => (
                    <View key={field.key} style={styles.parentFieldCard}>
                      <Ionicons
                        name={field.icon}
                        size={18}
                        color={BabyCityPalette.primary}
                        style={styles.parentFieldIcon}
                      />
                      <View style={styles.parentFieldTextWrap}>
                        <AppText variant="caption" weight="700" style={styles.parentFieldLabel}>
                          {field.label}
                        </AppText>
                        <AppText variant="body" weight="700" style={styles.parentFieldValue}>
                          {field.value}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.parentTextAreaCard}>
                  <AppText variant="caption" weight="700" style={styles.parentFieldLabel}>
                    {strings.parentFamilyNote}
                  </AppText>
                  <AppText variant="body" style={styles.parentTextAreaValue}>
                    {parentProfile.familyNote || strings.parentProfileNoteEmpty}
                  </AppText>
                </View>
              </AppCard>

              <AppCard role="parent" variant="panel" style={styles.parentEditorialCard}>
                <View style={styles.parentSectionHeaderRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.86}
                    onPress={() => router.push('/parent-onboarding?edit=true')}
                    style={styles.parentInlineAction}
                  >
                    <AppText variant="caption" weight="800" style={styles.parentInlineActionText}>
                      {strings.parentProfileChildrenAction}
                    </AppText>
                  </TouchableOpacity>
                  <View style={styles.parentSectionHeaderGroup}>
                    <View style={styles.parentSectionIconChip}>
                      <MaterialIcons name="child-care" size={20} color={BabyCityPalette.primary} />
                    </View>
                    <AppText variant="bodyLarge" weight="700">
                      {strings.parentProfileChildrenSection}
                    </AppText>
                  </View>
                </View>

                <View style={styles.parentChildrenMetaRow}>
                  <AppChip
                    label={
                      parentProfile.childrenCount !== null
                        ? `${parentProfile.childrenCount} ${strings.parentChildrenCount}`
                        : strings.notFilled
                    }
                    tone="primary"
                    size="sm"
                  />
                </View>

                {parentChildrenItems.length > 0 ? (
                  <View style={styles.parentChildrenList}>
                    {parentChildrenItems.map((child, index) => (
                      <View key={child.key} style={styles.parentChildRow}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          activeOpacity={0.86}
                          onPress={() => router.push('/parent-onboarding?edit=true')}
                          style={styles.parentChildEditButton}
                        >
                          <MaterialIcons name="edit" size={18} color={BabyCityPalette.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.parentChildText}>
                          <AppText variant="body" weight="700">
                            {child.label}
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            {child.detail}
                          </AppText>
                        </View>

                        <View
                          style={[
                            styles.parentChildIconWrap,
                            index % 2 === 1 && styles.parentChildIconWrapAlt,
                          ]}
                        >
                          <MaterialIcons
                            name={index % 2 === 1 ? 'face-3' : 'face'}
                            size={22}
                            color={index % 2 === 1 ? '#e65592' : BabyCityPalette.primary}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <AppText variant="body" tone="muted">
                    {strings.notFilled}
                  </AppText>
                )}
              </AppCard>

              <AppCard role="parent" variant="panel" style={styles.parentEditorialCard}>
                <View style={styles.parentSectionHeader}>
                  <View style={styles.parentSectionIconChip}>
                    <MaterialIcons name="pets" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="bodyLarge" weight="700">
                    {strings.parentPets}
                  </AppText>
                </View>

                <View style={styles.parentFieldCard}>
                  <Ionicons
                    name="paw-outline"
                    size={18}
                    color={BabyCityPalette.primary}
                    style={styles.parentFieldIcon}
                  />
                  <View style={styles.parentFieldTextWrap}>
                    <AppText variant="caption" weight="700" style={styles.parentFieldLabel}>
                      {strings.parentProfilePetsQuestion}
                    </AppText>
                    <AppText variant="body" weight="700" style={styles.parentFieldValue}>
                      {parentProfile.pets.length > 0
                        ? parentProfile.pets.join(', ')
                        : strings.notFilled}
                    </AppText>
                  </View>
                </View>
              </AppCard>

              <AppCard role="parent" variant="panel" style={styles.parentEditorialCard}>
                <View style={styles.parentSectionHeaderRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.86}
                    onPress={() => router.push('/my-posts')}
                    style={styles.parentInlineAction}
                  >
                    <AppText variant="caption" weight="800" style={styles.parentInlineActionText}>
                      {strings.parentProfilePostsAction}
                    </AppText>
                  </TouchableOpacity>
                  <View style={styles.parentSectionHeaderGroup}>
                    <View style={styles.parentSectionIconChip}>
                      <MaterialIcons name="campaign" size={20} color={BabyCityPalette.primary} />
                    </View>
                    <AppText variant="bodyLarge" weight="700">
                      {strings.parentPostsSection}
                    </AppText>
                  </View>
                </View>

                {parentProfile.posts.length > 0 ? (
                  <View style={styles.parentPostsWrap}>
                    {parentProfile.posts.slice(0, 2).map(post => (
                      <ParentOwnedPostCard
                        key={post.id}
                        post={post}
                        mode="profile"
                        onPress={() => router.push('/my-posts')}
                        onEdit={() =>
                          router.push({ pathname: '/create-post', params: { postId: post.id } })
                        }
                      />
                    ))}
                  </View>
                ) : (
                  <AppText variant="body" tone="muted">
                    {strings.parentProfilePostsEmpty}
                  </AppText>
                )}
              </AppCard>
            </>
          ) : (
            <ScreenStateCard
              role="parent"
              icon="person-outline"
              title={strings.parentProfileEmpty}
              body={strings.parentProfileEmptyHint}
              actionLabel={strings.settingsEditProfile}
              onActionPress={() => router.push('/parent-onboarding')}
              size="large"
              style={styles.emptyProfileCard}
            />
          )}
        </AppScreen>
      </View>
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
  cardSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardSectionIconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  parentScreen: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },
  parentBackdropOrbTop: {
    position: 'absolute',
    top: -28,
    left: -30,
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  parentBackdropOrbBottom: {
    position: 'absolute',
    right: -48,
    bottom: 180,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${BabyCityPalette.primary}10`,
  },
  parentScreenContent: {
    paddingBottom: 168,
  },
  parentHeroSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  parentAvatarShell: {
    marginBottom: 18,
  },
  parentAvatarFrame: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#ffffff',
    padding: 8,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}12`,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  parentAvatarWrap: {
    flex: 1,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8edf8',
  },
  parentAvatarCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentPhotoAccessoryButton: {
    position: 'absolute',
    left: -2,
    bottom: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BabyCityPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  parentAvatarBadge: {
    position: 'absolute',
    top: 8,
    right: -6,
    minHeight: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: `${BabyCityPalette.primary}0f`,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}18`,
    zIndex: 2,
  },
  parentAvatarBadgeText: {
    color: BabyCityPalette.primary,
  },
  parentHeroName: {
    textAlign: 'center',
    fontSize: 31,
    lineHeight: 38,
  },
  parentHeroSubtitle: {
    marginTop: 6,
    textAlign: 'center',
    color: BabyCityPalette.textSecondary,
  },
  parentHeroErrorText: {
    marginTop: 10,
    textAlign: 'center',
  },
  parentEditorialCard: {
    marginBottom: 18,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  parentSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  parentSectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  parentSectionHeaderGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  parentSectionIconChip: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: BabyCityPalette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentInlineAction: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: `${BabyCityPalette.primary}0d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentInlineActionText: {
    color: BabyCityPalette.primary,
  },
  parentFieldStack: {
    gap: 12,
  },
  parentFieldCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: BabyCityPalette.surface,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.border}80`,
  },
  parentFieldIcon: {
    marginTop: 2,
  },
  parentFieldTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  parentFieldLabel: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
  },
  parentFieldValue: {
    marginTop: 4,
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    width: '100%',
  },
  parentTextAreaCard: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: BabyCityPalette.surface,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.border}80`,
  },
  parentTextAreaValue: {
    marginTop: 8,
    lineHeight: 23,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  parentChildrenMetaRow: {
    flexDirection: 'row-reverse',
    marginBottom: 14,
  },
  parentChildrenList: {
    gap: 10,
  },
  parentChildRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: BabyCityPalette.surface,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.border}66`,
  },
  parentChildEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: `${BabyCityPalette.border}90`,
  },
  parentChildText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  parentChildIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}18`,
  },
  parentChildIconWrapAlt: {
    borderColor: '#f6cade',
  },
  parentPostsWrap: {
    width: '100%',
    gap: 12,
  },
  parentBottomOverlay: {
    paddingHorizontal: 2,
    paddingTop: 18,
    paddingBottom: 4,
    backgroundColor: 'rgba(244,246,255,0.94)',
  },
  parentBottomButton: {
    marginTop: 0,
  },
  emptyProfileCard: {
    marginTop: 8,
  },
});
