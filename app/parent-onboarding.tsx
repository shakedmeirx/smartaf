import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LabeledInput from '@/components/onboarding/LabeledInput';
import TagSelector from '@/components/onboarding/TagSelector';
import BirthdayField from '@/components/onboarding/BirthdayField';
import AddressLocationField from '@/components/ui/AddressLocationField';
import AppText from '@/components/ui/AppText';
import AppHeading from '@/components/ui/AppHeading';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { BabyCityGeometry, BabyCityPalette, BabyCityChipTones, getRoleTheme } from '@/constants/theme';
import { useAppState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { resizeChildBirthDates, deriveChildAgeGroupsFromBirthDates } from '@/lib/parentChildren';
import { calculateAgeFromBirthDate } from '@/lib/birthDate';
import { normalizeParentOnboardingDraft } from '@/lib/parentProfile';
import {
  isProfilePhotoPermissionError,
  removeParentProfilePhoto,
  selectAndUploadParentProfilePhoto,
} from '@/lib/profilePhoto';
import { validateParentProfileForm } from '@/lib/onboardingValidation';
import { strings } from '@/locales';
import { supabase } from '@/lib/supabase';
import { initialParentOnboardingData, ParentOnboardingData } from '@/types/parent';

const MAX_CHILDREN = 12;
const MAX_FAMILY_NOTE_LENGTH = 200;

const PET_OPTIONS = [strings.parentPetDog, strings.parentPetCat, strings.parentPetOther];

type ParentField =
  | 'firstName'
  | 'lastName'
  | 'addressFull'
  | 'city'
  | 'childrenCount'
  | 'childBirthDates'
  | 'familyNote';

function formatParentSaveError(error: unknown) {
  if (!(error instanceof Error)) {
    return strings.parentSaveError;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('city') ||
    message.includes('children_count') ||
    message.includes('hourly_budget') ||
    message.includes('child_age_groups') ||
    message.includes('family_note') ||
    message.includes('first_name') ||
    message.includes('last_name') ||
    message.includes('address_full') ||
    message.includes('child_birth_dates') ||
    message.includes('pets') ||
    message.includes('profile_photo_path') ||
    message.includes('schema cache')
  ) {
    return strings.parentSaveMigrationNeeded;
  }

  return `${strings.parentSaveError} ${error.message}`;
}

function splitFullName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function toCountText(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  return '';
}

function normalizeParentData(
  value: Partial<ParentOnboardingData>,
  fallbackName: string
): ParentOnboardingData {
  const fallback = splitFullName(fallbackName);
  const countText = toCountText(value.childrenCount);
  const birthDates = Array.isArray(value.childBirthDates) ? value.childBirthDates : [];
  const parsedCount = countText ? Math.min(Number.parseInt(countText, 10) || 0, MAX_CHILDREN) : 0;
  const effectiveCount = parsedCount || birthDates.length;
  const normalized = normalizeParentOnboardingDraft(value, fallbackName);

  return {
    ...initialParentOnboardingData,
    ...normalized,
    firstName: normalized.firstName || fallback.firstName,
    lastName: normalized.lastName || fallback.lastName,
    childrenCount: effectiveCount > 0 ? String(effectiveCount) : '',
    childBirthDates: resizeChildBirthDates(effectiveCount, birthDates),
    postDrafts: [],
  };
}

function childBirthDateLabel(index: number) {
  return `${strings.parentChildBirthDateLabel} ${index + 1}`;
}

export default function ParentOnboardingScreen() {
  const { session, dbUser } = useAuth();
  const { refreshParentData } = useAppState();
  const userId = session?.user.id;
  const theme = getRoleTheme('parent');

  const [uiStep, setUiStep] = useState<'welcome' | 'form' | 'review'>('welcome');
  const [data, setData] = useState<ParentOnboardingData>(initialParentOnboardingData);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ParentField, string>>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [draftCoordinates, setDraftCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const storageKey = userId ? `parent_onboarding_draft:${userId}` : null;

  useEffect(() => {
    const draftStorageKey = storageKey;
    if (!draftStorageKey || !userId) return;

    let isMounted = true;

    async function hydrate() {
      const [draftValue, { data: profileRow }] = await Promise.all([
        AsyncStorage.getItem(draftStorageKey ?? ''),
        supabase
          .from('parent_profiles')
          .select(`
            first_name,
            last_name,
            address_full,
            city,
            profile_photo_path,
            children_count,
            child_birth_dates,
            pets,
            family_note,
            hourly_budget
          `)
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (!isMounted) return;

      const fallbackName = dbUser?.name ?? '';

      if (draftValue) {
        try {
          const parsedDraft = JSON.parse(draftValue) as Partial<ParentOnboardingData>;
          setData(normalizeParentData(parsedDraft, fallbackName));
          setHydrated(true);
          return;
        } catch {
          // Fall through to profile hydration.
        }
      }

      const fromProfile: Partial<ParentOnboardingData> = profileRow
        ? {
            firstName: (profileRow.first_name as string | null) ?? '',
            lastName: (profileRow.last_name as string | null) ?? '',
            addressFull: (profileRow.address_full as string | null) ?? '',
            city: (profileRow.city as string | null) ?? '',
            profilePhotoPath: (profileRow.profile_photo_path as string | null) ?? '',
            childrenCount:
              profileRow.children_count === null || profileRow.children_count === undefined
                ? ''
                : String(profileRow.children_count),
            childBirthDates: (profileRow.child_birth_dates as string[] | null) ?? [],
            pets: (profileRow.pets as string[] | null) ?? [],
            hourlyBudget:
              profileRow.hourly_budget === null || profileRow.hourly_budget === undefined
                ? ''
                : String(profileRow.hourly_budget),
            familyNote: (profileRow.family_note as string | null) ?? '',
          }
        : {};

      setData(normalizeParentData(fromProfile, fallbackName));
      setHydrated(true);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [dbUser?.name, storageKey, userId]);

  useEffect(() => {
    const draftStorageKey = storageKey;
    if (!draftStorageKey || !hydrated) return;
    AsyncStorage.setItem(draftStorageKey ?? '', JSON.stringify(data));
  }, [data, hydrated, storageKey]);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/my-profile');
  }

  function clearFieldError(key: ParentField) {
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
    setSaveError('');
  }

  function updateField<K extends keyof ParentOnboardingData>(key: K, value: ParentOnboardingData[K]) {
    clearFieldError(key as ParentField);
    setData(prev => ({ ...prev, [key]: value }));
  }

  function handleChildrenCountChange(value: string) {
    clearFieldError('childrenCount');
    clearFieldError('childBirthDates');
    const sanitized = value.replace(/[^\d]/g, '').slice(0, 2);
    const count = sanitized ? Math.min(Number.parseInt(sanitized, 10) || 0, MAX_CHILDREN) : 0;

    setData(prev => ({
      ...prev,
      childrenCount: sanitized,
      childBirthDates: resizeChildBirthDates(count, prev.childBirthDates),
    }));
  }

  function handleChildBirthDateChange(index: number, value: string) {
    clearFieldError('childBirthDates');
    setData(prev => {
      const next = [...prev.childBirthDates];
      next[index] = value;
      return { ...prev, childBirthDates: next };
    });
  }

  function togglePet(option: string) {
    setData(prev => ({
      ...prev,
      pets: prev.pets.includes(option)
        ? prev.pets.filter(item => item !== option)
        : [...prev.pets, option],
    }));
  }

  async function handlePickProfilePhoto() {
    if (!userId || photoBusy) return;

    try {
      setPhotoBusy(true);
      setSaveError('');
      const uploadedPhoto = await selectAndUploadParentProfilePhoto(userId);

      if (!uploadedPhoto) {
        return;
      }

      setData(prev => ({
        ...prev,
        profilePhotoPath: uploadedPhoto.path,
        profilePhotoUrl: uploadedPhoto.url,
      }));
    } catch (error) {
      setSaveError(
        isProfilePhotoPermissionError(error)
          ? strings.parentProfilePhotoPermissionError
          : strings.parentProfilePhotoUploadError
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleRemoveProfilePhoto() {
    if (!data.profilePhotoPath || photoBusy) return;

      try {
        setPhotoBusy(true);
        setSaveError('');
      await removeParentProfilePhoto(data.profilePhotoPath);

      setData(prev => ({
        ...prev,
        profilePhotoPath: '',
        profilePhotoUrl: '',
      }));
    } catch {
      setSaveError(strings.parentProfilePhotoRemoveError);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleFinish() {
    if (!session || !userId) return;

    const validation = validateParentProfileForm(data);
    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
      setSaveError(strings.onboardingValidationFix);
      return;
    }

    try {
      setSaving(true);
      setSaveError('');

      const trimmedFirstName = data.firstName.trim();
      const trimmedLastName = data.lastName.trim();
      const trimmedAddress = data.addressFull.trim();
      const trimmedCity = data.city.trim();
      const trimmedNote = data.familyNote.trim();
      const parsedChildrenCount = Number.parseInt(data.childrenCount.trim(), 10);
      const parsedHourlyBudget =
        data.hourlyBudget.trim() === ''
          ? null
          : Number.parseInt(data.hourlyBudget.trim(), 10);
      const childAgeGroups = deriveChildAgeGroupsFromBirthDates(data.childBirthDates);
      const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ');

      const { error: userError } = await supabase
        .from('users')
        .update({ name: fullName })
        .eq('id', userId);

      if (userError) {
        throw new Error(userError.message);
      }

      const profilePayload = {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        address_full: trimmedAddress,
        city: trimmedCity,
        profile_photo_path: data.profilePhotoPath || null,
        children_count: Number.isNaN(parsedChildrenCount) ? null : parsedChildrenCount,
        child_birth_dates: data.childBirthDates,
        child_age_groups: childAgeGroups,
        pets: data.pets,
        family_note: trimmedNote,
        hourly_budget: Number.isNaN(parsedHourlyBudget) ? null : parsedHourlyBudget,
        latitude: draftCoordinates?.latitude ?? null,
        longitude: draftCoordinates?.longitude ?? null,
      };

      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('parent_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfileError) {
        throw new Error(existingProfileError.message);
      }

      if (existingProfile) {
        const { error } = await supabase
          .from('parent_profiles')
          .update(profilePayload)
          .eq('user_id', userId);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase
          .from('parent_profiles')
          .insert({
            user_id: userId,
            ...profilePayload,
          });

        if (error) {
          throw new Error(error.message);
        }
      }

      await refreshParentData();

      if (storageKey) {
        await AsyncStorage.removeItem(storageKey);
      }

      router.replace('/parent');
    } catch (error) {
      console.error('Parent profile save failed', error);
      setSaveError(formatParentSaveError(error));
    } finally {
      setSaving(false);
    }
  }

  function handleGoToReview() {
    const validation = validateParentProfileForm(data);
    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
      setSaveError(strings.onboardingValidationFix);
      return;
    }
    setSaveError('');
    setUiStep('review');
  }

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (uiStep === 'welcome') {
    return (
      <SafeAreaView style={styles.welcomeSafe}>
        <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={styles.welcomeBrand}>
            <View style={styles.welcomeBrandMark}>
              <AppText variant="bodyLarge" weight="800" style={{ color: BabyCityPalette.primary }}>S</AppText>
            </View>
            <AppText variant="bodyLarge" weight="800">{strings.appName}</AppText>
          </View>

          {/* Hero placeholder */}
          <View style={styles.welcomeHero}>
            <View style={styles.welcomeHeroPlaceholder}>
              <Ionicons name="people" size={64} color={BabyCityPalette.surfaceContainer} />
            </View>
          </View>

          <AppText variant="h1" weight="800" align="center" style={styles.welcomeHeadline}>
            {'ברוכים הבאים לסמארטאף'}
          </AppText>
          <AppText variant="body" tone="muted" align="center" style={styles.welcomeSubtitle}>
            {'מצאו את הבייביסיטר המושלם עבור המשפחה שלכם'}
          </AppText>

          {/* Feature cards */}
          <View style={styles.welcomeFeatureRow}>
            {[
              { icon: 'shield-checkmark-outline' as const, title: 'בטיחות', body: 'כל בייביסיטר עובר בדיקה ואימות' },
              { icon: 'search-outline' as const, title: 'התאמה חכמה', body: 'מציאת הבייביסיטר הקרוב אליכם' },
              { icon: 'heart-outline' as const, title: 'תמיכה אישית', body: 'אנחנו כאן לכל שאלה' },
            ].map(f => (
              <View key={f.title} style={styles.welcomeFeatureCard}>
                <Ionicons name={f.icon} size={24} color={BabyCityPalette.primary} />
                <AppText variant="caption" weight="700" align="center" style={{ marginTop: 8 }}>{f.title}</AppText>
                <AppText variant="caption" tone="muted" align="center" style={{ lineHeight: 18 }}>{f.body}</AppText>
              </View>
            ))}
          </View>

          {/* Social proof */}
          <View style={styles.welcomeSocialProof}>
            <View style={styles.welcomeAvatarStack}>
              {['#dee8ff', '#ede9f5', '#e8f8ff'].map((bg, i) => (
                <View key={i} style={[styles.welcomeAvatar, { backgroundColor: bg, right: i * 22 }]}>
                  <Ionicons name="person" size={12} color={BabyCityPalette.textSecondary} />
                </View>
              ))}
            </View>
            <AppText variant="caption" weight="600" tone="muted" style={{ flex: 1, textAlign: 'right' }}>
              {'הצטרפו ל-2,400+ משפחות'}
            </AppText>
          </View>

          <AppPrimaryButton
            label={'בואו נתחיל'}
            onPress={() => setUiStep('form')}
            style={styles.welcomeCta}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Review screen ────────────────────────────────────────────────────────────
  if (uiStep === 'review') {
    const childCount = Number.parseInt(data.childrenCount, 10) || 0;
    return (
      <SafeAreaView style={styles.reviewSafe}>
        <ScrollView contentContainerStyle={styles.reviewScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.reviewHeader}>
            <AppText variant="h1" weight="800" style={styles.reviewTitle}>{'סקירה'}</AppText>
            <AppText variant="body" tone="muted" style={styles.reviewSubtitle}>
              {'בדקו שהפרטים נכונים לפני השמירה'}
            </AppText>
          </View>

          {/* Location */}
          {data.city ? (
            <AppCard style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <Ionicons name="location-outline" size={18} color={BabyCityPalette.primary} />
                <AppText variant="bodyLarge" weight="700" style={styles.reviewRowText}>{data.city}</AppText>
              </View>
            </AppCard>
          ) : null}

          {/* Pets */}
          {data.pets.length > 0 ? (
            <AppCard style={styles.reviewCard}>
              <AppText variant="caption" weight="700" tone="muted" style={styles.reviewCardLabel}>{'חיות מחמד'}</AppText>
              <View style={styles.reviewChipsRow}>
                {data.pets.map(pet => (
                  <AppChip key={pet} label={pet} tone="primary" size="sm" />
                ))}
              </View>
            </AppCard>
          ) : null}

          {/* Children */}
          {childCount > 0 ? (
            <AppCard style={styles.reviewCard}>
              <AppText variant="caption" weight="700" tone="muted" style={styles.reviewCardLabel}>{'ילדים'}</AppText>
              <View style={styles.reviewChildrenRow}>
                {Array.from({ length: Math.min(childCount, 4) }).map((_, i) => {
                  const birthDate = data.childBirthDates?.[i];
                  const age = birthDate ? calculateAgeFromBirthDate(birthDate) : null;
                  return (
                    <View key={i} style={styles.reviewChildChip}>
                      <AvatarCircle name={String(i + 1)} size={44} tone="accent" />
                      {age !== null ? (
                        <AppText variant="caption" tone="muted" align="center">
                          {`${age} שנים`}
                        </AppText>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </AppCard>
          ) : null}

          {saveError ? (
            <AppText variant="body" tone="error" style={styles.reviewError}>{saveError}</AppText>
          ) : null}

          <AppPrimaryButton
            label={'סיים'}
            loading={saving}
            onPress={handleFinish}
            style={styles.reviewSaveBtn}
          />
          <AppButton
            label={'ערוך'}
            variant="secondary"
            onPress={() => setUiStep('form')}
            style={styles.reviewEditBtn}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!hydrated) {
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
              <Ionicons name="chevron-forward" size={18} color={BabyCityPalette.primary} />
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
              {strings.parentSetupBadge}
            </AppText>
            <AppHeading
              title={strings.parentOnboardingSingleTitle}
              subtitle={strings.parentOnboardingSingleSubtitle}
              containerStyle={{ marginVertical: 0 }}
              style={{ color: theme.title }}
              // note: we don't pass tone="muted" to subtitle here because AppHeading does it by default
            />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {saveError ? <AppText variant="body" tone="error" style={styles.errorText}>{saveError}</AppText> : null}

            <View style={styles.formCard}>
              <AppText variant="h2" style={styles.sectionTitle}>{strings.parentFullNameLabel}</AppText>
              <LabeledInput
                label={strings.firstName}
                value={data.firstName}
                onChange={value => updateField('firstName', value)}
                placeholder={strings.firstNamePlaceholder}
                returnKeyType="next"
                errorText={fieldErrors.firstName}
              />
              <LabeledInput
                label={strings.lastName}
                value={data.lastName}
                onChange={value => updateField('lastName', value)}
                placeholder={strings.lastNamePlaceholder}
                returnKeyType="next"
                errorText={fieldErrors.lastName}
              />
            </View>

            <View style={styles.formCard}>
              <AddressLocationField
                value={data.addressFull}
                onChange={value => updateField('addressFull', value)}
                onCoordinatesObtained={(lat, lng) => setDraftCoordinates({ latitude: lat, longitude: lng })}
                onCityChange={value => updateField('city', value)}
                role="parent"
                errorText={fieldErrors.addressFull}
              />
            </View>

            <View style={styles.formCard}>
              <AppText variant="h2" style={styles.sectionTitle}>{strings.parentProfilePhoto}</AppText>
              <AppText variant="caption" tone="muted" style={styles.helperText}>{strings.parentProfilePhotoHint}</AppText>
              <View style={styles.photoCard}>
                <TouchableOpacity
                  style={styles.photoPreview}
                  onPress={handlePickProfilePhoto}
                  disabled={photoBusy}
                  activeOpacity={0.9}
                >
                  {data.profilePhotoUrl ? (
                    <Image source={{ uri: data.profilePhotoUrl }} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      {photoBusy ? (
                        <ActivityIndicator color={BabyCityPalette.primary} />
                      ) : (
                        <>
                          <Ionicons name="camera-outline" size={26} color={BabyCityPalette.primary} />
                          <AppText variant="body" weight="700" style={styles.photoPlaceholderText}>{strings.parentProfilePhotoAdd}</AppText>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.photoActions}>
                  <AppButton
                    label={
                      data.profilePhotoUrl
                        ? strings.parentProfilePhotoChange
                        : strings.parentProfilePhotoAdd
                    }
                    variant="secondary"
                    textColor={BabyCityPalette.primary}
                    backgroundColor={BabyCityPalette.primarySoft}
                    borderColor={BabyCityChipTones.primary.border}
                    onPress={handlePickProfilePhoto}
                    disabled={photoBusy}
                    style={styles.photoActionButton}
                  />
                  {data.profilePhotoPath ? (
                    <AppButton
                      label={strings.parentProfilePhotoRemove}
                      variant="secondary"
                      textColor={BabyCityPalette.textSecondary}
                      onPress={handleRemoveProfilePhoto}
                      disabled={photoBusy}
                      style={[styles.photoActionButton, styles.photoActionButtonGhost]}
                    />
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.formCard}>
              <AppText variant="h2" style={styles.sectionTitle}>{strings.parentChildrenCount}</AppText>
              <LabeledInput
                label={strings.parentChildrenCount}
                value={data.childrenCount}
                onChange={handleChildrenCountChange}
                placeholder={strings.parentChildrenCountPlaceholder}
                keyboardType="numeric"
                returnKeyType="done"
                errorText={fieldErrors.childrenCount}
              />

              {data.childBirthDates.length > 0 ? (
                <>
                  <AppText variant="body" weight="800" style={styles.subsectionTitle}>{strings.parentChildrenBirthDates}</AppText>
                  <AppText variant="caption" tone="muted" style={styles.helperText}>{strings.parentChildBirthDatesHint}</AppText>
                  {data.childBirthDates.map((value, index) => (
                    <BirthdayField
                      key={`child-birth-date-${index}`}
                      label={childBirthDateLabel(index)}
                      value={value}
                      onChange={nextValue => handleChildBirthDateChange(index, nextValue)}
                      errorText={fieldErrors.childBirthDates}
                    />
                  ))}
                </>
              ) : null}
            </View>

            <View style={styles.formCard}>
              <AppText variant="h2" style={styles.sectionTitle}>{strings.parentPets}</AppText>
              <AppText variant="caption" tone="muted" style={styles.helperText}>{strings.parentPetsHint}</AppText>
              <TagSelector
                options={PET_OPTIONS}
                selected={data.pets}
                onChange={next => updateField('pets', next)}
                tone="blue"
              />
            </View>

            <View style={styles.formCard}>
              <AppText variant="h2" style={styles.sectionTitle}>{strings.parentFamilyNote}</AppText>
              <LabeledInput
                label={strings.parentFamilyNote}
                value={data.familyNote}
                onChange={value => updateField('familyNote', value)}
                placeholder={strings.parentFamilyNotePlaceholder}
                multiline
                maxLength={MAX_FAMILY_NOTE_LENGTH}
                errorText={fieldErrors.familyNote}
              />
              <AppText variant="caption" tone="muted" style={styles.counterText}>
                {data.familyNote.length}/{MAX_FAMILY_NOTE_LENGTH} {strings.parentDescriptionCounter}
              </AppText>
            </View>

          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              label={strings.done}
              size="lg"
              loading={saving}
              onPress={handleGoToReview}
              disabled={saving || photoBusy}
              style={styles.doneButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Welcome screen
  welcomeSafe: { flex: 1, backgroundColor: '#ffffff' },
  welcomeScroll: { paddingHorizontal: 24, paddingBottom: 40 },
  welcomeBrand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 8 },
  welcomeBrandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: BabyCityPalette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  welcomeHero: { alignItems: 'center', marginVertical: 24 },
  welcomeHeroPlaceholder: { width: '100%', height: 180, borderRadius: 24, backgroundColor: BabyCityPalette.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  welcomeHeadline: { marginBottom: 10 },
  welcomeSubtitle: { marginBottom: 24, lineHeight: 22 },
  welcomeFeatureRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 24 },
  welcomeFeatureCard: { flex: 1, backgroundColor: BabyCityPalette.surfaceLow, borderRadius: 20, padding: 14, alignItems: 'center', gap: 4 },
  welcomeSocialProof: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 24 },
  welcomeAvatarStack: { flexDirection: 'row-reverse', width: 70, height: 36, position: 'relative' },
  welcomeAvatar: { position: 'absolute', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff', top: 3 },
  welcomeCta: { marginBottom: 12 },
  // Review screen
  reviewSafe: { flex: 1, backgroundColor: BabyCityPalette.canvas },
  reviewScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  reviewHeader: { alignItems: 'flex-end', marginBottom: 20 },
  reviewTitle: { textAlign: 'right' },
  reviewSubtitle: { textAlign: 'right', marginTop: 4 },
  reviewCard: { marginBottom: 12 },
  reviewRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  reviewRowText: { flex: 1, textAlign: 'right' },
  reviewCardLabel: { textAlign: 'right', marginBottom: 10 },
  reviewChipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  reviewChildrenRow: { flexDirection: 'row-reverse', gap: 12 },
  reviewChildChip: { alignItems: 'center', gap: 4 },
  reviewError: { textAlign: 'right', marginBottom: 12 },
  reviewSaveBtn: { marginBottom: 12 },
  reviewEditBtn: {},
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
    backgroundColor: BabyCityPalette.surface,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  sectionTitle: {
    marginBottom: 14,
  },
  subsectionTitle: {
    marginBottom: 10,
  },
  helperText: {
    marginTop: -6,
    marginBottom: 14,
  },
  photoCard: {
    gap: 14,
  },
  photoPreview: {
    height: 220,
    borderRadius: 26,
    backgroundColor: BabyCityPalette.surfaceMuted,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  photoPlaceholderText: {
    color: BabyCityPalette.primary,
    textAlign: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  photoActionButton: {
    flex: 1,
  },
  photoActionButtonGhost: {
    backgroundColor: BabyCityPalette.surface,
  },
  counterText: {
    marginTop: -10,
    color: BabyCityPalette.textTertiary,
    textAlign: 'right',
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
