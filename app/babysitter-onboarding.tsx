import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '@/components/ui/AppText';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AvatarCircle from '@/components/ui/AvatarCircle';
import Step1BasicInfo from '@/components/onboarding/Step1BasicInfo';
import Step2About from '@/components/onboarding/Step2About';
import Step3Experience from '@/components/onboarding/Step3Experience';
import Step4Preferences from '@/components/onboarding/Step4Preferences';
import Step6Trust from '@/components/onboarding/Step6Trust';
import {
  BabyCityPalette,
  BabyCityShadows,
  getRoleTheme,
} from '@/constants/theme';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { calculateAgeFromBirthDate } from '@/lib/birthDate';
import {
  BABYSITTER_PHOTOS_BUCKET,
  getBabysitterGalleryPhotoPath,
  getBabysitterPhotoUrl,
  getBabysitterPhotoUrls,
} from '@/lib/babysitterPhotos';
import {
  galleryRowsToPhotos,
  rowToBabysitterOnboardingData,
} from '@/lib/babysitterProfile';
import {
  isProfilePhotoPermissionError,
  removeBabysitterProfilePhoto,
  selectAndUploadBabysitterProfilePhoto,
} from '@/lib/profilePhoto';
import { formatBabysitterSaveError, validateBabysitterBeforeFinish } from '@/lib/onboardingValidation';
import { supabase } from '@/lib/supabase';
import { GalleryPhoto, OnboardingData, initialOnboardingData } from '@/types/onboarding';

const JOIN_TABLES = {
  languages: 'babysitter_languages',
  ageGroups: 'babysitter_age_groups',
  certifications: 'babysitter_certifications',
  superpowers: 'babysitter_superpowers',
  personalityTags: 'babysitter_personality_tags',
  availability: 'babysitter_availability',
} as const;

const SITTER_INTRO_ILLUSTRATION = require('../.stitch/designs/sitter-onboarding-intro.png');
const SITTER_INTRO_COMMUNITY = require('../.stitch/designs/sitter-onboarding-skills.png');

export default function BabysitterOnboarding() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { dbUser, session } = useAuth();
  const { refreshBabysitterData } = useAppState();
  const theme = getRoleTheme('babysitter');
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);
  const [removingGalleryPhotoId, setRemovingGalleryPhotoId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [legacyAge, setLegacyAge] = useState<number | null>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [uiStep, setUiStep] = useState<'welcome' | 'form'>(edit === 'true' ? 'form' : 'welcome');
  const [showComplete, setShowComplete] = useState(false);
  const [savedProfile, setSavedProfile] = useState<{
    name: string;
    city: string;
    hourlyRate: number;
    photoUrl?: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<
    'firstName' | 'city' | 'birthDate' | 'languages' | 'bio' | 'yearsExperience' | 'ageGroups' | 'hourlyRate' | 'availability',
    string
  >>>({});

  useEffect(() => {
    const sessionUserId = session?.user.id;

    if (!sessionUserId) {
      setIsLoading(false);
      return;
    }

    async function loadExistingProfile() {
      const { data: profile } = await supabase
        .from('babysitter_profiles')
        .select(`
          id,
          city,
          address_full,
          latitude,
          longitude,
          bio,
          hourly_rate,
          years_experience,
          age,
          birth_date,
          has_car,
          has_first_aid,
          special_needs,
          has_references,
          is_accepting_requests,
          profile_photo_path,
          preferred_location,
          extras,
          notifications_enabled,
          profile_visible
        `)
        .eq('user_id', sessionUserId)
        .maybeSingle();

      if (!profile) {
        setHasExistingProfile(false);
        setData(prev => ({
          ...prev,
          firstName: dbUser?.name ?? prev.firstName,
        }));
        setLegacyAge(null);
        setIsLoading(false);
        return;
      }

      setLegacyAge((profile.age as number | null) ?? null);
      setHasExistingProfile(true);
      setUiStep('form');

      const profileId = profile.id as string;
      const [
        languagesRes,
        ageGroupsRes,
        certificationsRes,
        superpowersRes,
        personalityTagsRes,
        availabilityRes,
        galleryPhotosRes,
      ] = await Promise.all([
        supabase.from('babysitter_languages').select('language').eq('babysitter_id', profileId),
        supabase.from('babysitter_age_groups').select('age_group').eq('babysitter_id', profileId),
        supabase.from('babysitter_certifications').select('certification').eq('babysitter_id', profileId),
        supabase.from('babysitter_superpowers').select('superpower').eq('babysitter_id', profileId),
        supabase.from('babysitter_personality_tags').select('tag').eq('babysitter_id', profileId),
        supabase.from('babysitter_availability').select('slot').eq('babysitter_id', profileId),
        supabase
          .from('babysitter_gallery_photos')
          .select('id, storage_path, position')
          .eq('babysitter_id', profileId)
          .order('position', { ascending: true }),
      ]);

      const profilePhotoPath = (profile.profile_photo_path as string | null) ?? '';
      const galleryRows = (galleryPhotosRes.data ?? []) as Record<string, unknown>[];
      const galleryPaths = galleryRows.map(row => row.storage_path as string);
      const photoUrlMap = await getBabysitterPhotoUrls(
        [profilePhotoPath, ...galleryPaths].filter(Boolean)
      );
      const profilePhotoUrl = profilePhotoPath
        ? photoUrlMap.get(profilePhotoPath) ?? ''
        : '';

      setData(
        rowToBabysitterOnboardingData(profile as Record<string, unknown>, {
          dbUserName: dbUser?.name ?? '',
          languages: (languagesRes.data ?? []).map(row => row.language as string),
          ageGroups: (ageGroupsRes.data ?? []).map(row => row.age_group as string),
          certifications: (certificationsRes.data ?? []).map(row => row.certification as string),
          superpowers: (superpowersRes.data ?? []).map(row => row.superpower as string),
          personalityTags: (personalityTagsRes.data ?? []).map(row => row.tag as string),
          availability: (availabilityRes.data ?? []).map(row => row.slot as string),
          galleryPhotos: galleryRowsToPhotos(galleryRows, photoUrlMap),
        }, profilePhotoUrl)
      );
      setIsLoading(false);
    }

    void loadExistingProfile();
  }, [dbUser?.name, session?.user.id]);

  function updateData(fields: Partial<OnboardingData>) {
    setSaveError('');
    setFieldErrors(prev => {
      const nextErrors = { ...prev };
      for (const key of Object.keys(fields) as (keyof typeof prev)[]) {
        delete nextErrors[key];
      }
      return nextErrors;
    });
    setData(prev => ({ ...prev, ...fields }));
  }

  async function handlePickProfilePhoto() {
    if (!session?.user.id || isUploadingPhoto) return;

    try {
      setIsUploadingPhoto(true);
      setSaveError('');
      const uploadedPhoto = await selectAndUploadBabysitterProfilePhoto(session.user.id);

      if (!uploadedPhoto) {
        return;
      }

      updateData({
        profilePhotoPath: uploadedPhoto.path,
        profilePhotoUrl: uploadedPhoto.url,
      });
    } catch (error) {
      setSaveError(
        isProfilePhotoPermissionError(error)
          ? strings.profilePhotoPermissionError
          : strings.profilePhotoUploadError
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function pickImageAsset() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSaveError(strings.profilePhotoPermissionError);
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return result.assets[0];
  }

  async function handleAddGalleryPhoto() {
    if (!session?.user.id || isUploadingGalleryPhoto) return;

    try {
      setIsUploadingGalleryPhoto(true);
      setSaveError('');

      const asset = await pickImageAsset();
      if (!asset) return;

      const fileName = asset.fileName ?? `gallery-${Date.now()}.jpg`;
      const photoPath = getBabysitterGalleryPhotoPath(session.user.id, fileName);
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(BABYSITTER_PHOTOS_BUCKET)
        .upload(photoPath, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      updateData({
        galleryPhotos: [
          ...data.galleryPhotos,
          {
            path: photoPath,
            url: await getBabysitterPhotoUrl(photoPath),
            position: data.galleryPhotos.length,
          },
        ],
      });
    } catch {
      setSaveError(strings.galleryPhotoUploadError);
    } finally {
      setIsUploadingGalleryPhoto(false);
    }
  }

  async function handleRemoveProfilePhoto() {
    if (!session?.user.id || !data.profilePhotoPath || isRemovingPhoto) return;

    try {
      setIsRemovingPhoto(true);
      setSaveError('');
      await removeBabysitterProfilePhoto(data.profilePhotoPath);

      const { error: profileError } = await supabase
        .from('babysitter_profiles')
        .update({ profile_photo_path: null })
        .eq('user_id', session.user.id);

      if (profileError) throw profileError;

      updateData({
        profilePhotoPath: '',
        profilePhotoUrl: '',
      });
    } catch {
      setSaveError(strings.profilePhotoRemoveError);
    } finally {
      setIsRemovingPhoto(false);
    }
  }

  async function handleRemoveGalleryPhoto(photoId: string) {
    const photo = data.galleryPhotos.find(item => (item.id ?? item.path) === photoId);
    if (!photo || removingGalleryPhotoId) return;

    try {
      setRemovingGalleryPhotoId(photoId);
      setSaveError('');

      const { error: storageError } = await supabase.storage
        .from(BABYSITTER_PHOTOS_BUCKET)
        .remove([photo.path]);

      if (storageError) throw storageError;

      if (photo.id) {
        const { error: deleteRowError } = await supabase
          .from('babysitter_gallery_photos')
          .delete()
          .eq('id', photo.id);

        if (deleteRowError) throw deleteRowError;
      }

      updateData({
        galleryPhotos: data.galleryPhotos
          .filter(item => (item.id ?? item.path) !== photoId)
          .map((item, index) => ({ ...item, position: index })),
      });
    } catch {
      setSaveError(strings.galleryPhotoRemoveError);
    } finally {
      setRemovingGalleryPhotoId(null);
    }
  }

  async function replaceJoinTableRows(
    table: keyof typeof JOIN_TABLES,
    babysitterId: string,
    values: string[]
  ) {
    const tableName = JOIN_TABLES[table];
    const valueKey =
      table === 'languages' ? 'language' :
      table === 'ageGroups' ? 'age_group' :
      table === 'certifications' ? 'certification' :
      table === 'superpowers' ? 'superpower' :
      table === 'personalityTags' ? 'tag' :
      'slot';

    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('babysitter_id', babysitterId);

    if (deleteError) throw deleteError;

    if (values.length === 0) return;

    const rows = values.map(value => ({
      babysitter_id: babysitterId,
      [valueKey]: value,
    }));

    const { error: insertError } = await supabase
      .from(tableName)
      .insert(rows);

    if (insertError) throw insertError;
  }

  async function replaceGalleryPhotoRows(
    babysitterId: string,
    galleryPhotos: GalleryPhoto[]
  ) {
    const { error: deleteError } = await supabase
      .from('babysitter_gallery_photos')
      .delete()
      .eq('babysitter_id', babysitterId);

    if (deleteError) throw deleteError;

    if (galleryPhotos.length === 0) return;

    const rows = galleryPhotos.map((photo, index) => ({
      babysitter_id: babysitterId,
      storage_path: photo.path,
      position: index,
    }));

    const { error: insertError } = await supabase
      .from('babysitter_gallery_photos')
      .insert(rows);

    if (insertError) throw insertError;
  }

  async function handleFinish() {
    if (!session?.user.id) return;

    const validation = validateBabysitterBeforeFinish(data);
    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
      setSaveError(strings.babysitterSaveValidationError);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError('');

      const parsedHourlyRate = Number.parseInt(data.hourlyRate.trim(), 10);
      const computedAge = data.birthDate.trim() === '' ? null : calculateAgeFromBirthDate(data.birthDate.trim());

      const { error: userError } = await supabase
        .from('users')
        .update({ name: data.firstName.trim() })
        .eq('id', session.user.id);

      if (userError) throw new Error(`users update failed: ${userError.message}`);

      const { data: profileRow, error: profileError } = await supabase
        .from('babysitter_profiles')
        .upsert(
          {
            user_id: session.user.id,
            city: data.city.trim(),
            address_full: data.addressFull.trim(),
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            bio: data.bio.trim(),
            hourly_rate: parsedHourlyRate,
            years_experience: data.yearsExperience,
            age: computedAge ?? legacyAge,
            birth_date: data.birthDate.trim() || null,
            has_car: data.hasCar,
            has_first_aid: data.hasFirstAid,
            special_needs: data.specialNeeds,
            has_references: data.hasReferences,
            is_accepting_requests: data.acceptingRequests,
            profile_photo_path: data.profilePhotoPath || null,
            preferred_location: data.preferredLocation,
            extras: data.extras,
            notifications_enabled: data.notifications,
            profile_visible: data.profileVisible,
          },
          { onConflict: 'user_id' }
        )
        .select('id')
        .single();

      if (profileError || !profileRow) {
        throw new Error(`profile save failed: ${profileError?.message ?? 'unknown profile error'}`);
      }

      const babysitterId = profileRow.id as string;

      try {
        await Promise.all([
          replaceJoinTableRows('languages', babysitterId, data.languages),
          replaceJoinTableRows('ageGroups', babysitterId, data.ageGroups),
          replaceJoinTableRows('certifications', babysitterId, data.certifications),
          replaceJoinTableRows('superpowers', babysitterId, data.superpowers),
          replaceJoinTableRows('personalityTags', babysitterId, data.personalityTags),
          replaceJoinTableRows('availability', babysitterId, data.availability),
        ]);
      } catch (error) {
        throw new Error(`join table sync failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }

      try {
        await replaceGalleryPhotoRows(babysitterId, data.galleryPhotos);
      } catch (error) {
        throw new Error(`gallery sync failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }

      await refreshBabysitterData();
      setSavedProfile({
        name: data.firstName.trim(),
        city: data.city.trim(),
        hourlyRate: parsedHourlyRate,
        photoUrl: data.profilePhotoUrl || undefined,
      });
      setShowComplete(true);
    } catch (error) {
      console.error('Babysitter profile save failed', error);
      setSaveError(formatBabysitterSaveError(error));
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (uiStep === 'form' && !hasExistingProfile && edit !== 'true') {
      setUiStep('welcome');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/my-profile');
  }

  if (showComplete && savedProfile) {
    return (
      <SafeAreaView style={styles.completeSafe}>
        {/* Ambient background decorative blobs */}
        <View style={styles.blobTopLeft} pointerEvents="none" />
        <View style={styles.blobBottomRight} pointerEvents="none" />

        <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
          {/* Gradient check circle */}
          <View style={styles.completeIconWrap}>
            <LinearGradient colors={['#702ae1', '#6411d5']} style={styles.completeIconGradient}>
              <MaterialIcons name="check" size={40} color="#ffffff" />
            </LinearGradient>
            {/* Decorative atmospheric blobs around icon */}
            <View style={styles.iconBlobTopRight} pointerEvents="none" />
            <View style={styles.iconBlobBottomLeft} pointerEvents="none" />
          </View>

          <AppText variant="h1" weight="800" align="center" style={styles.completeHeading}>
            {strings.babysitterOnboardingCompleteTitle}
          </AppText>
          <AppText variant="body" tone="muted" align="center" style={styles.completeSubtitle}>
            {strings.babysitterOnboardingCompleteSubtitle}
          </AppText>

          {/* Profile preview card — avatar overlaps top-right */}
          <View style={styles.completeCardOuter}>
            {/* Overlapping avatar — absolutely positioned */}
            <View style={styles.completeAvatarOverlap}>
              <View style={styles.completeAvatarBorder}>
                <AvatarCircle
                  name={savedProfile.name}
                  photoUrl={savedProfile.photoUrl}
                  size={72}
                />
              </View>
            </View>

            {/* Inner white card */}
            <View style={styles.completeCardInner}>
              {/* Name + community line */}
              <View style={styles.completeCardHeader}>
                <AppText variant="h3" weight="800" style={styles.completeCardName}>
                  {savedProfile.name}
                </AppText>
                <View style={styles.completeBrandLine}>
                  <MaterialIcons
                    name="star"
                    size={14}
                    color={BabyCityPalette.primary}
                    style={styles.completeBrandStar}
                  />
                  <AppText variant="caption" weight="700" style={styles.completeBrandText}>
                    {strings.babysitterOnboardingCompleteNewBadge}
                  </AppText>
                </View>
              </View>

              {/* Bento grid: location + rate */}
              <View style={styles.completeBentoGrid}>
                <View style={styles.completeBentoCell}>
                  <MaterialIcons name="location-on" size={18} color="#515c70" />
                  <AppText variant="caption" tone="muted">{strings.babysitterOnboardingCompleteLocation}</AppText>
                  <AppText variant="body" weight="700" style={styles.completeBentoCellValue}>
                    {savedProfile.city || '—'}
                  </AppText>
                </View>
                <View style={styles.completeBentoCell}>
                  <MaterialIcons name="payments" size={18} color="#515c70" />
                  <AppText variant="caption" tone="muted">{strings.babysitterOnboardingCompleteRate}</AppText>
                  <AppText variant="body" weight="700" style={styles.completeBentoCellValue}>
                    {`₪${savedProfile.hourlyRate}`}
                  </AppText>
                </View>
              </View>

              {/* Trust markers row */}
              <View style={styles.completeTrustRow}>
                <AppText variant="caption" tone="muted" weight="600">{strings.babysitterOnboardingCompleteVerified}</AppText>
                <View style={styles.completeTrustIcons}>
                  <View style={[styles.completeTrustIcon, { backgroundColor: '#ff8eac33' }]}>
                    <MaterialIcons name="shield" size={14} color="#64042d" />
                  </View>
                  <View style={[styles.completeTrustIcon, { backgroundColor: '#e9def5' }]}>
                    <MaterialIcons name="medical-services" size={14} color="#564f61" />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <AppPrimaryButton
            label={strings.babysitterOnboardingGoToDashboard}
            onPress={() => router.replace('/babysitter')}
            style={styles.completeBtn}
          />
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push('/my-profile')}
            style={styles.completeSecondaryAction}
          >
            <AppText variant="body" weight="700" style={styles.completeSecondaryActionText}>
              {strings.babysitterOnboardingViewPublicProfile}
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={BabyCityPalette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (uiStep === 'welcome') {
    return (
      <SafeAreaView style={styles.welcomeSafe} edges={['top', 'bottom']}>
        <View style={styles.welcomeGlowTop} pointerEvents="none" />
        <View style={styles.welcomeGlowBottom} pointerEvents="none" />

        <View style={styles.welcomeHeader}>
          <TouchableOpacity
            style={styles.welcomeHelpButton}
            activeOpacity={0.84}
            onPress={() => router.push('/about')}
          >
            <MaterialIcons name="help-outline" size={20} color="#64748b" />
          </TouchableOpacity>

          <AppText variant="bodyLarge" weight="800" align="center" style={styles.welcomeBrand}>
            {strings.appName}
          </AppText>

          <View style={styles.welcomeHeaderSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.welcomeScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeCommunityRow}>
              <View style={styles.welcomeCommunityLine} />
              <AppText variant="caption" weight="700" align="center" style={styles.welcomeCommunityLabel}>
                {strings.babysitterOnboardingWelcomeEyebrow}
              </AppText>
              <View style={styles.welcomeCommunityLine} />
            </View>

            <View style={styles.welcomeHeadlineGroup}>
              <AppText variant="h1" weight="800" align="center" style={styles.welcomeHeadline}>
                {strings.babysitterOnboardingWelcomeHeadlineLine1}
              </AppText>
              <AppText variant="h1" weight="800" align="center" style={styles.welcomeHeadlineAccent}>
                {strings.babysitterOnboardingWelcomeHeadlineLine2}
              </AppText>
            </View>

            <AppText
              variant="bodyLarge"
              tone="muted"
              align="center"
              style={styles.welcomeSubtitle}
            >
              {strings.babysitterOnboardingWelcomeSubtitle}
            </AppText>

            <View style={styles.welcomeIllustrationWrap}>
              <View style={styles.welcomeIllustrationGlow} />
              <View style={styles.welcomeIllustrationFrame}>
                <Image
                  source={SITTER_INTRO_ILLUSTRATION}
                  style={styles.welcomeIllustrationImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            <View style={styles.welcomeBenefits}>
              <View style={styles.welcomeBenefitCard}>
                <View style={styles.welcomeBenefitIconWrap}>
                  <MaterialIcons name="payments" size={24} color="#7c3aed" />
                </View>
                <View style={styles.welcomeBenefitText}>
                  <AppText variant="bodyLarge" weight="700" style={styles.welcomeBenefitTitle}>
                    {strings.babysitterOnboardingWelcomeBenefitRateTitle}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.welcomeBenefitBody}>
                    {strings.babysitterOnboardingWelcomeBenefitRateBody}
                  </AppText>
                </View>
              </View>

              <View style={styles.welcomeBenefitCard}>
                <View style={styles.welcomeBenefitIconWrap}>
                  <MaterialIcons name="shield" size={24} color="#7c3aed" />
                </View>
                <View style={styles.welcomeBenefitText}>
                  <AppText variant="bodyLarge" weight="700" style={styles.welcomeBenefitTitle}>
                    {strings.babysitterOnboardingWelcomeBenefitTrustTitle}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.welcomeBenefitBody}>
                    {strings.babysitterOnboardingWelcomeBenefitTrustBody}
                  </AppText>
                </View>
              </View>

              <View style={styles.welcomeBenefitCard}>
                <View style={styles.welcomeBenefitAvatarWrap}>
                  <Image
                    source={SITTER_INTRO_COMMUNITY}
                    style={styles.welcomeBenefitAvatar}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.welcomeBenefitText}>
                  <AppText variant="bodyLarge" weight="700" style={styles.welcomeBenefitTitle}>
                    {strings.babysitterOnboardingWelcomeBenefitCommunityTitle}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.welcomeBenefitBody}>
                    {strings.babysitterOnboardingWelcomeBenefitCommunityBody}
                  </AppText>
                </View>
              </View>
            </View>

          </View>
        </ScrollView>

        <View style={styles.welcomeFooter}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.welcomePrimaryButton}
            onPress={() => setUiStep('form')}
          >
            <LinearGradient
              colors={['#7c3aed', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomePrimaryGradient}
            >
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
              <AppText variant="bodyLarge" weight="800" style={styles.welcomePrimaryText}>
                {strings.babysitterOnboardingWelcomePrimaryAction}
              </AppText>
            </LinearGradient>
          </TouchableOpacity>

          <AppText variant="caption" tone="muted" align="center" style={styles.welcomeLegal}>
            {strings.babysitterOnboardingWelcomeLegal}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.formAuraTopLeft} pointerEvents="none" />
      <View style={styles.formAuraBottomRight} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.flex}>
          <View style={styles.topBar}>
            <AppText variant="bodyLarge" weight="800" style={styles.topBarBrand}>
              {strings.appName}
            </AppText>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.86}
            >
              <MaterialIcons name="arrow-forward-ios" size={18} color={BabyCityPalette.primary} />
              <AppText variant="caption" weight="700" style={{ color: BabyCityPalette.primary }}>
                {strings.back}
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.progressMetaRow}>
              <View style={styles.progressTracks}>
                <View style={[styles.progressTrackActive, { backgroundColor: theme.filterAccent }]} />
                <View style={[styles.progressTrackActive, { backgroundColor: theme.filterAccent }]} />
                <View style={styles.progressTrackIdle} />
                <View style={styles.progressTrackIdle} />
              </View>
              <AppText variant="caption" weight="600" style={styles.progressLabel}>
                {strings.babysitterOnboardingStepsCount}
              </AppText>
            </View>

            <View style={styles.formIntroBlock}>
              <AppText variant="h1" weight="800" style={styles.formIntroTitle}>
                {strings.babysitterOnboardingFormIntroTitle}
              </AppText>
              <AppText variant="body" tone="muted" style={styles.formIntroSubtitle}>
                {strings.babysitterOnboardingFormIntroSubtitle}
              </AppText>
            </View>

            {saveError !== '' ? <AppText variant="body" tone="error" style={styles.errorText}>{saveError}</AppText> : null}

            <AppCard role="babysitter" style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="person" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.step1Title}</AppText>
              </View>
              <Step1BasicInfo
                data={data}
                onChange={updateData}
                errors={fieldErrors}
                onPickProfilePhoto={handlePickProfilePhoto}
                isUploadingProfilePhoto={isUploadingPhoto}
                onRemoveProfilePhoto={handleRemoveProfilePhoto}
                isRemovingProfilePhoto={isRemovingPhoto}
                onAddGalleryPhoto={handleAddGalleryPhoto}
                onRemoveGalleryPhoto={handleRemoveGalleryPhoto}
                isUploadingGalleryPhoto={isUploadingGalleryPhoto}
                removingGalleryPhotoId={removingGalleryPhotoId}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="edit-note" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.step2Title}</AppText>
              </View>
              <Step2About
                data={data}
                onChange={updateData}
                errors={fieldErrors}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="school" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.step3Title}</AppText>
              </View>
              <Step3Experience
                data={data}
                onChange={updateData}
                errors={fieldErrors}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="tune" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.step4Title}</AppText>
              </View>
              <Step4Preferences
                data={data}
                onChange={updateData}
                errors={fieldErrors}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                  <MaterialIcons name="shield" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.step6Title}</AppText>
              </View>
              <Step6Trust
                data={data}
                onChange={updateData}
              />
            </AppCard>

            <View style={styles.formTrustCard}>
              <View style={styles.formTrustIconWrap}>
                <MaterialIcons name="shield" size={28} color={BabyCityPalette.primary} />
              </View>
              <View style={styles.formTrustBody}>
                <AppText variant="bodyLarge" weight="800" style={styles.formTrustTitle}>
                  {strings.babysitterOnboardingTrustTitle}
                </AppText>
                <AppText variant="body" tone="muted" style={styles.formTrustText}>
                  {strings.babysitterOnboardingTrustBody}
                </AppText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AppPrimaryButton
              label={strings.babysitterOnboardingSaveButton}
              loading={isSaving}
              onPress={handleFinish}
              disabled={isSaving || isUploadingPhoto || isRemovingPhoto || isUploadingGalleryPhoto}
              style={styles.doneButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  welcomeSafe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  welcomeGlowTop: {
    position: 'absolute',
    top: 92,
    left: 18,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(124,58,237,0.07)',
  },
  welcomeGlowBottom: {
    position: 'absolute',
    right: -34,
    bottom: 88,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  welcomeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.35)',
  },
  welcomeHelpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  welcomeHeaderSpacer: {
    width: 40,
    height: 40,
  },
  welcomeBrand: {
    color: '#7c3aed',
    fontSize: 24,
    lineHeight: 30,
  },
  welcomeScroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 180,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeCommunityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  welcomeCommunityLine: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(124,58,237,0.18)',
  },
  welcomeCommunityLabel: {
    color: '#7c3aed',
    letterSpacing: 2.2,
    fontSize: 11,
    lineHeight: 16,
  },
  welcomeHeadlineGroup: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 12,
  },
  welcomeHeadline: {
    color: '#1a2133',
    fontSize: 34,
    lineHeight: 38,
  },
  welcomeHeadlineAccent: {
    color: '#7c3aed',
    fontSize: 34,
    lineHeight: 38,
  },
  welcomeSubtitle: {
    maxWidth: 300,
    fontSize: 15,
    lineHeight: 25,
    opacity: 0.82,
    marginBottom: 28,
  },
  welcomeIllustrationWrap: {
    width: '100%',
    marginBottom: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  welcomeIllustrationGlow: {
    position: 'absolute',
    inset: -12,
    borderRadius: 42,
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  welcomeIllustrationFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 6,
  },
  welcomeIllustrationImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  welcomeBenefits: {
    width: '100%',
    gap: 14,
    marginBottom: 28,
  },
  welcomeBenefitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#7c3aed',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 28,
    elevation: 4,
  },
  welcomeBenefitIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  welcomeBenefitAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(124,58,237,0.10)',
  },
  welcomeBenefitAvatar: {
    width: '100%',
    height: '100%',
  },
  welcomeBenefitText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  welcomeBenefitTitle: {
    color: '#1a2133',
    marginBottom: 3,
  },
  welcomeBenefitBody: {
    lineHeight: 20,
    opacity: 0.72,
  },
  welcomeFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 24 : 18,
    backgroundColor: 'rgba(248,249,255,0.97)',
  },
  welcomePrimaryButton: {
    width: '100%',
    marginBottom: 14,
  },
  welcomePrimaryGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 20,
    paddingVertical: 18,
    shadowColor: '#7c3aed',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 5,
  },
  welcomePrimaryText: {
    color: '#ffffff',
  },
  welcomeLegal: {
    fontSize: 11,
    lineHeight: 18,
    opacity: 0.58,
    paddingHorizontal: 14,
  },
  // Completion screen
  completeSafe: { flex: 1, backgroundColor: '#f4f6ff' },
  completeScroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40, alignItems: 'center' },
  // Ambient background blobs
  blobTopLeft: {
    position: 'absolute',
    top: '-10%',
    left: '-20%',
    width: '60%',
    height: '40%',
    backgroundColor: 'rgba(112,42,225,0.05)',
    borderRadius: 999,
    // blur not supported in RN without library — using soft opacity instead
  } as any,
  blobBottomRight: {
    position: 'absolute',
    bottom: '-10%',
    right: '-20%',
    width: '60%',
    height: '40%',
    backgroundColor: 'rgba(158,54,87,0.04)',
    borderRadius: 999,
  } as any,
  completeIconWrap: { marginBottom: 34, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  completeIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#702ae1',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  iconBlobTopRight: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,142,172,0.4)',
    borderRadius: 24,
  },
  iconBlobBottomLeft: {
    position: 'absolute',
    bottom: -8,
    left: -24,
    width: 64,
    height: 64,
    backgroundColor: 'rgba(178,140,255,0.3)',
    borderRadius: 32,
  },
  completeHeading: { marginBottom: 10, color: BabyCityPalette.textPrimary },
  completeSubtitle: { marginBottom: 36, maxWidth: 288, lineHeight: 28 },
  // Profile card with overlapping avatar
  completeCardOuter: {
    width: '100%',
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 28,
    paddingTop: 6,
    paddingBottom: 6,
    marginBottom: 34,
    position: 'relative',
    overflow: 'visible',
    marginTop: 48,
    ...BabyCityShadows.soft,
  },
  completeAvatarOverlap: {
    position: 'absolute',
    top: -40,
    right: 24,
    zIndex: 10,
  },
  completeAvatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: BabyCityPalette.surfaceLow,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  completeCardInner: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 22,
    alignItems: 'flex-end',
  },
  completeCardHeader: {
    alignItems: 'flex-end',
    marginBottom: 24,
    gap: 5,
  },
  completeCardName: { textAlign: 'right', color: '#242f41' },
  completeBrandLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  completeBrandStar: {
    marginRight: 2,
  },
  completeBrandText: {
    color: BabyCityPalette.primary,
  },
  completeBentoGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  completeBentoCell: {
    flex: 1,
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 20,
    padding: 14,
    alignItems: 'flex-start',
    gap: 3,
  },
  completeBentoCellValue: {
    color: '#242f41',
    textAlign: 'left',
  },
  completeTrustRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completeTrustIcons: {
    flexDirection: 'row-reverse',
    gap: -8,
  },
  completeTrustIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginLeft: -8,
  },
  completeBtn: { marginBottom: 8, width: '100%' },
  completeSecondaryAction: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  completeSecondaryActionText: {
    color: BabyCityPalette.primary,
  },
  container: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },
  formAuraTopLeft: {
    position: 'absolute',
    top: -108,
    left: -92,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(112,42,225,0.06)',
  },
  formAuraBottomRight: {
    position: 'absolute',
    right: -120,
    bottom: 60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,142,172,0.08)',
  },
  flex: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarBrand: {
    color: BabyCityPalette.primary,
    fontSize: 24,
    lineHeight: 30,
  },
  backButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.primarySoft,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 34,
  },
  progressMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  progressTracks: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  progressTrackActive: {
    width: 34,
    height: 6,
    borderRadius: 999,
  },
  progressTrackIdle: {
    width: 34,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#d5e3ff',
  },
  progressLabel: {
    color: BabyCityPalette.textSecondary,
  },
  formIntroBlock: {
    marginBottom: 22,
    alignItems: 'flex-end',
  },
  formIntroTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    marginBottom: 10,
  },
  formIntroSubtitle: {
    textAlign: 'right',
    lineHeight: 28,
  },
  errorText: {
    marginBottom: 12,
    backgroundColor: BabyCityPalette.errorSoft,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: 'right',
  },
  formCard: {
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginBottom: 18,
    borderRadius: 30,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTrustCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#ecf1ff',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
  },
  formTrustIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceLowest,
  },
  formTrustBody: {
    flex: 1,
    alignItems: 'flex-end',
  },
  formTrustTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  formTrustText: {
    textAlign: 'right',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 18,
    backgroundColor: 'rgba(244, 246, 255, 0.94)',
  },
  doneButton: {
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 4,
  },
});
