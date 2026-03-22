import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AvatarCircle from '@/components/ui/AvatarCircle';
import AppHeading from '@/components/ui/AppHeading';
import SectionHeader from '@/components/ui/SectionHeader';
import Step1BasicInfo from '@/components/onboarding/Step1BasicInfo';
import Step2About from '@/components/onboarding/Step2About';
import Step3Experience from '@/components/onboarding/Step3Experience';
import Step4Preferences from '@/components/onboarding/Step4Preferences';
import Step5Photos from '@/components/onboarding/Step5Photos';
import Step6Trust from '@/components/onboarding/Step6Trust';
import Step7Visibility from '@/components/onboarding/Step7Visibility';
import {
  BabyCityGeometry,
  BabyCityPalette,
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

export default function BabysitterOnboarding() {
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
        setData(prev => ({
          ...prev,
          firstName: dbUser?.name ?? prev.firstName,
        }));
        setLegacyAge(null);
        setIsLoading(false);
        return;
      }

      setLegacyAge((profile.age as number | null) ?? null);

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

      setData(
        rowToBabysitterOnboardingData(profile as Record<string, unknown>, {
          dbUserName: dbUser?.name ?? '',
          languages: (languagesRes.data ?? []).map(row => row.language as string),
          ageGroups: (ageGroupsRes.data ?? []).map(row => row.age_group as string),
          certifications: (certificationsRes.data ?? []).map(row => row.certification as string),
          superpowers: (superpowersRes.data ?? []).map(row => row.superpower as string),
          personalityTags: (personalityTagsRes.data ?? []).map(row => row.tag as string),
          availability: (availabilityRes.data ?? []).map(row => row.slot as string),
          galleryPhotos: galleryRowsToPhotos(
            (galleryPhotosRes.data ?? []) as Record<string, unknown>[]
          ),
        })
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
            url: getBabysitterPhotoUrl(photoPath),
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
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/my-profile');
  }

  if (showComplete && savedProfile) {
    return (
      <SafeAreaView style={styles.completeSafe}>
        <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
          {/* Hero banner */}
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAYq3z43IEF7wzINRBjv-HjOCTAez46mbFz_TM5w25NKGS6FzF-V8Y8X2y98p2Md-De8etwaMb312fW3LW6Vc1khRr7YGQCNoVY3GQB9wMuWRMFjXvIQnQA9vDq5lTQ9pTVcEjclhBR1LRqqFDfoAiiIJk17pCJUaAW-ulyYnWirdUwy-I4tAYTc22nIjK2yhQD7-P5n4GeoRrXWv6wL5WMjUwEUa76hNuX1-P9c1xZW1YqjE0VVLMfFACs2XWhSnq2_2_RbiLCtKX' }}
            style={styles.completeBanner}
            resizeMode="cover"
          />

          {/* Success icon */}
          <View style={styles.completeIconWrap}>
            <LinearGradient colors={['#702ae1', '#6411d5']} style={styles.completeIconGradient}>
              <MaterialIcons name="check" size={40} color="#ffffff" />
            </LinearGradient>
          </View>

          <AppText variant="h1" weight="800" align="center" style={styles.completeHeading}>
            {'ברוכה הבאה לקהילת Smartaf! 🎉'}
          </AppText>
          <AppText variant="body" tone="muted" align="center" style={styles.completeSubtitle}>
            {'הפרופיל שלך נוצר בהצלחה'}
          </AppText>

          {/* Profile preview card */}
          <AppCard style={styles.completeCard}>
            <View style={styles.completeCardRow}>
              <AvatarCircle name={savedProfile.name} photoUrl={savedProfile.photoUrl} size={64} />
              <View style={styles.completeCardInfo}>
                <AppText variant="h3" weight="800" style={styles.completeCardName}>
                  {savedProfile.name}
                </AppText>
                <View style={styles.completeNewBadge}>
                  <MaterialIcons name="star" size={12} color={BabyCityPalette.primary} />
                  <AppText variant="caption" weight="700" style={styles.completeNewBadgeText}>
                    {'חדשה בקהילת Smartaf'}
                  </AppText>
                </View>
                {savedProfile.city ? (
                  <View style={styles.completeCityRow}>
                    <MaterialIcons name="location-on" size={12} color={BabyCityPalette.textSecondary} />
                    <AppText variant="caption" tone="muted">{savedProfile.city}</AppText>
                  </View>
                ) : null}
                <AppText variant="caption" tone="muted">
                  {`₪${savedProfile.hourlyRate} ${strings.perHour}`}
                </AppText>
              </View>
            </View>
          </AppCard>

          {/* Actions */}
          <AppPrimaryButton
            label={'עבור ללוח הבקרה'}
            onPress={() => router.replace('/babysitter')}
            style={styles.completeBtn}
          />
          <AppButton
            label={'הצג פרופיל ציבורי'}
            variant="secondary"
            onPress={() => router.push('/my-profile')}
            style={styles.completeBtn}
          />
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.flex}>
          <View style={styles.topBar}>
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

          <View
            style={[
              styles.headerCard,
              { backgroundColor: theme.highlightedSurface },
            ]}
          >
            <AppText variant="caption" weight="700" style={[styles.kicker, { color: theme.filterAccent }]}>
              {strings.drawerEditProfile}
            </AppText>
            <AppHeading
              title={strings.babysitterOnboardingSingleTitle}
              subtitle={strings.babysitterOnboardingSingleSubtitle}
              containerStyle={{ marginVertical: 0 }}
              style={{ color: theme.title }}
            />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {saveError !== '' ? <AppText variant="body" tone="error" style={styles.errorText}>{saveError}</AppText> : null}

            <AppCard role="babysitter" style={styles.formCard}>
              <SectionHeader title={strings.step1Title} titleVariant="h2" style={styles.sectionHeader} />
              <Step1BasicInfo
                data={data}
                onChange={updateData}
                errors={fieldErrors}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <SectionHeader title={strings.step2Title} titleVariant="h2" style={styles.sectionHeader} />
              <Step2About
                data={data}
                onChange={updateData}
                errors={fieldErrors}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <SectionHeader title={strings.step3Title} titleVariant="h2" style={styles.sectionHeader} />
              <Step3Experience
                data={data}
                onChange={updateData}
                errors={fieldErrors}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <SectionHeader title={strings.step4Title} titleVariant="h2" style={styles.sectionHeader} />
              <Step4Preferences
                data={data}
                onChange={updateData}
                errors={fieldErrors}
              />
            </AppCard>

            <AppCard role="babysitter" style={styles.formCard}>
              <SectionHeader title={strings.step5Title} titleVariant="h2" style={styles.sectionHeader} />
              <Step5Photos
                data={data}
                onChange={updateData}
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
              <SectionHeader title={strings.step6Title} titleVariant="h2" style={styles.sectionHeader} />
              <Step6Trust
                data={data}
                onChange={updateData}
              />

              <View style={styles.sectionDivider} />

              <SectionHeader title={strings.step7Title} titleVariant="h2" style={styles.sectionHeader} />
              <Step7Visibility
                data={data}
                onChange={updateData}
                showReviewSummary={false}
              />
            </AppCard>
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              label={strings.babysitterOnboardingSaveButton}
              size="lg"
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
  // Completion screen
  completeSafe: { flex: 1, backgroundColor: BabyCityPalette.canvas },
  completeScroll: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 40, alignItems: 'center' },
  completeBanner: { alignSelf: 'stretch', height: 220, marginHorizontal: -24, marginBottom: 32 },
  completeIconWrap: { marginBottom: 24 },
  completeIconGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  completeHeading: { marginBottom: 8 },
  completeSubtitle: { marginBottom: 24 },
  completeCard: { width: '100%', marginBottom: 24 },
  completeCardRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  completeCardInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  completeCardName: { textAlign: 'right' },
  completeNewBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BabyCityPalette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BabyCityGeometry.radius.pill,
  },
  completeNewBadgeText: { color: BabyCityPalette.primary },
  completeCityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  completeBtn: { marginBottom: 12, width: '100%' },
  container: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
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
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'flex-end',
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
  headerCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 30,
  },
  kicker: {
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  errorText: {
    marginBottom: 12,
    backgroundColor: BabyCityPalette.errorSoft,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionDivider: {
    marginVertical: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: 'rgba(236, 241, 255, 0.96)',
  },
  doneButton: {
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  },
});
