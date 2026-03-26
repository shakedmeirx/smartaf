import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import LabeledInput from '@/components/onboarding/LabeledInput';
import TagSelector from '@/components/onboarding/TagSelector';
import BirthdayField from '@/components/onboarding/BirthdayField';
import AddressLocationField from '@/components/ui/AddressLocationField';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';
import AppChip from '@/components/ui/AppChip';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { BabyCityPalette, BabyCityChipTones, BabyCityShadows, getRoleTheme } from '@/constants/theme';
import { useAppState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  resizeChildBirthDates,
  resizeChildNames,
  deriveChildAgeGroupsFromBirthDates,
} from '@/lib/parentChildren';
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
const PARENT_WELCOME_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB5wfqxzhnrq9X-rWgu93gAkoCCF6Slk7LPdDPHyxoUb5XQ7FeWinBlNQ1b1jovjfnqz_gnk1BpggjfyM4AB7Hfj2mOAjowhr7QXqdCcJftoRY2iAmU-WEIhinLjNsIyzjKrj_IIDPQGDgLqO71oY4FRYpaohir7eFEU73qcLVQ5L9ae1CWoOicMwZ-MPVsAVJsQKH78RP1duR2SVTJumpJwgwSaUBP8v7HoAubImaKo4TWsCGCNGoXP472KsNluUysQ7vTTPguPfpq';
const PARENT_CHILDREN_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA7JoQg8rU89L6fmSsbxLR90iA4ElUL43NOQwP4pjgbOhVcY3rlDET_LawuGBoiYkLC21wY5ghf0eNrJuZaXiYTJCvd8fGQy8cm537WKmjq8JmkYrhlGPqTXLYSOxgHBsz1V3uLgZ-GZPNgfS8bqtJT3Lh66X5XwL0sWmYGNaBwSn3oo5UActeKirOssJopmWCEvWw1Vpc-MttDX57S_URixLWa02FgSOJ2RWUdZ4K_wN9v65ITI1s6rEK6LXcH-ReOgkYMNgim45Xs';

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
    message.includes('child_names') ||
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
  const childNames = Array.isArray(value.childNames) ? value.childNames : [];
  const birthDates = Array.isArray(value.childBirthDates) ? value.childBirthDates : [];
  const parsedCount = countText ? Math.min(Number.parseInt(countText, 10) || 0, MAX_CHILDREN) : 0;
  const effectiveCount = parsedCount || Math.max(birthDates.length, childNames.length);
  const normalized = normalizeParentOnboardingDraft(value, fallbackName);

  return {
    ...initialParentOnboardingData,
    ...normalized,
    firstName: normalized.firstName || fallback.firstName,
    lastName: normalized.lastName || fallback.lastName,
    childrenCount: effectiveCount > 0 ? String(effectiveCount) : '',
    childNames: resizeChildNames(effectiveCount, normalized.childNames),
    childBirthDates: resizeChildBirthDates(effectiveCount, birthDates),
    postDrafts: [],
  };
}

function childBirthDateLabel(index: number) {
  return `${strings.parentChildBirthDateLabel} ${index + 1}`;
}

function childAgeBandForAge(age: number | null) {
  if (age === null) return null;
  if (age < 1) return 'infant';
  if (age <= 2) return 'toddler';
  if (age <= 4) return 'preschool';
  return 'older';
}

export default function ParentOnboardingScreen() {
  const { session, dbUser } = useAuth();
  const { refreshParentData } = useAppState();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const userId = session?.user.id;
  const theme = getRoleTheme('parent');

  const [uiStep, setUiStep] = useState<'welcome' | 'form' | 'review'>(edit === 'true' ? 'form' : 'welcome');
  const [data, setData] = useState<ParentOnboardingData>(initialParentOnboardingData);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ParentField, string>>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [draftCoordinates, setDraftCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const childNameInputRefs = useRef<Record<number, TextInput | null>>({});
  const childrenCardTopRef = useRef(0);
  const childEditorsGroupTopRef = useRef(0);
  const childEditorsListTopRef = useRef(0);
  const childCardYPositions = useRef<Record<number, number>>({});
  const pendingChildScrollIndexRef = useRef<number | null>(null);

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
            child_names,
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
            childNames: (profileRow.child_names as string[] | null) ?? [],
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
      childNames: resizeChildNames(count, prev.childNames),
      childBirthDates: resizeChildBirthDates(count, prev.childBirthDates),
    }));
  }

  function handleChildNameChange(index: number, value: string) {
    setData(prev => {
      const next = [...prev.childNames];
      next[index] = value;
      return { ...prev, childNames: next };
    });
  }

  function handleChildBirthDateChange(index: number, value: string) {
    clearFieldError('childBirthDates');
    setData(prev => {
      const next = [...prev.childBirthDates];
      next[index] = value;
      return { ...prev, childBirthDates: next };
    });
  }

  function handleAddChild() {
    clearFieldError('childrenCount');
    clearFieldError('childBirthDates');
    setData(prev => {
      const nextIndex = Math.min(MAX_CHILDREN - 1, prev.childBirthDates.length);
      const nextCount = Math.min(MAX_CHILDREN, prev.childBirthDates.length + 1);
      pendingChildScrollIndexRef.current = nextIndex;

      return {
        ...prev,
        childrenCount: String(nextCount),
        childNames: resizeChildNames(nextCount, prev.childNames),
        childBirthDates: resizeChildBirthDates(nextCount, prev.childBirthDates),
      };
    });
  }

  function maybeScrollToChild(index: number) {
    const cardY = childCardYPositions.current[index];
    if (cardY === undefined) return;

    const y =
      childrenCardTopRef.current +
      childEditorsGroupTopRef.current +
      childEditorsListTopRef.current +
      cardY;

    formScrollRef.current?.scrollTo({
      y: Math.max(y - 24, 0),
      animated: true,
    });

    requestAnimationFrame(() => {
      childNameInputRefs.current[index]?.focus();
    });

    pendingChildScrollIndexRef.current = null;
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
        child_names: data.childNames.map(value => value.trim()),
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
        <View style={styles.welcomeBubbleTopLeft} pointerEvents="none" />
        <View style={styles.welcomeBubbleMidRight} pointerEvents="none" />

        <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeStage}>
            <View style={styles.welcomeBrandRow}>
              <AppText variant="bodyLarge" weight="800" style={styles.welcomeBrandName}>
                {strings.appName}
              </AppText>
            </View>

            <View style={styles.welcomeHeroWrap}>
              <View style={styles.welcomeHeroBgShape1} />
              <View style={styles.welcomeHeroBgShape2} />

              <View style={styles.welcomeHeroImageWrap}>
                <Image
                  source={{ uri: PARENT_WELCOME_IMAGE_URL }}
                  style={styles.welcomeHeroImage}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.welcomeTrustBadge}>
                <View style={styles.welcomeTrustIcon}>
                  <MaterialIcons name="verified" size={20} color="#64042d" />
                </View>
                <View style={styles.welcomeTrustText}>
                  <AppText variant="caption" weight="700" style={styles.welcomeTrustTitle}>
                    {strings.parentOnboardingWelcomeTrustTitle}
                  </AppText>
                  <AppText style={styles.welcomeTrustSub}>
                    {strings.parentOnboardingWelcomeTrustSubtitle}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.welcomeCopyBlock}>
              <AppText variant="h1" weight="800" align="center" style={styles.welcomeHeadline}>
                {strings.parentOnboardingWelcomeHeadline}
              </AppText>
              <AppText variant="bodyLarge" tone="muted" align="center" style={styles.welcomeSubtitle}>
                {strings.parentOnboardingWelcomeSubtitle}
              </AppText>
            </View>

            <View style={styles.welcomeActions}>
              <AppPrimaryButton
                label={strings.parentOnboardingWelcomePrimaryAction}
                onPress={() => setUiStep('form')}
                style={styles.welcomeCta}
              />

              <View style={styles.welcomeLoginRow}>
                <AppText variant="body" weight="500" style={styles.welcomeLoginPrefix}>
                  {strings.parentOnboardingWelcomeSecondaryPrefix}
                </AppText>
                <AppText variant="body" weight="700" style={styles.welcomeLoginText}>
                  {strings.parentOnboardingWelcomeSecondaryAction}
                </AppText>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Review screen ────────────────────────────────────────────────────────────
  if (uiStep === 'review') {
    const childCount = Number.parseInt(data.childrenCount, 10) || 0;
    const secondaryDetail = data.hourlyBudget.trim() !== ''
      ? {
          icon: 'payments' as const,
          label: strings.parentReviewBudgetLabel,
          value: `₪${data.hourlyBudget.trim()}`,
          chips: null as string[] | null,
        }
      : data.pets.length > 0
        ? {
            icon: 'pets' as const,
            label: strings.parentPets,
            value: '',
            chips: data.pets,
          }
        : data.addressFull.trim() !== ''
          ? {
              icon: 'home' as const,
              label: strings.addressLabel,
              value: data.addressFull.trim(),
              chips: null as string[] | null,
            }
          : null;

    return (
      <SafeAreaView style={styles.reviewSafe}>
        <View style={styles.reviewTopBar}>
          <AppText variant="bodyLarge" weight="800" style={styles.reviewTopBarBrand}>
            {strings.appName}
          </AppText>
          <TouchableOpacity
            style={styles.reviewTopBarAction}
            activeOpacity={0.82}
            onPress={() => setUiStep('form')}
          >
            <MaterialIcons name="arrow-forward-ios" size={18} color={BabyCityPalette.primary} />
            <AppText variant="caption" weight="700" style={styles.reviewTopBarActionText}>
              {strings.back}
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.reviewScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.reviewHeroSection}>
            <View style={styles.reviewHeroIconWrap}>
              <View style={styles.reviewHeroBlur} />
              <View style={styles.reviewHeroCircle}>
                <MaterialIcons name="verified-user" size={64} color={BabyCityPalette.primary} />
              </View>
              <View style={styles.reviewHeroBadge}>
                <MaterialIcons name="celebration" size={20} color="#ffeff1" />
              </View>
            </View>
            <AppText variant="h1" weight="800" align="center" style={styles.reviewHeroTitle}>
              {strings.parentReviewHeroTitle}
            </AppText>
            <AppText variant="body" tone="muted" align="center" style={styles.reviewHeroSubtitle}>
              {strings.parentReviewHeroSubtitle}
            </AppText>
          </View>

          <View style={styles.reviewTopGrid}>
            {data.familyNote ? (
              <View style={styles.reviewFamilyCard}>
                <View style={styles.reviewFamilyCardAccent} />
                <View style={styles.reviewCardHeader}>
                  <MaterialIcons name="family-restroom" size={20} color={BabyCityPalette.primary} />
                  <AppText variant="bodyLarge" weight="700" style={styles.reviewCardHeaderText}>
                    {strings.parentReviewFamilyCardTitle}
                  </AppText>
                </View>
                <AppText style={styles.reviewFamilyNote}>{`"${data.familyNote}"`}</AppText>
              </View>
            ) : null}

            <View style={styles.reviewDetailStack}>
              {data.city ? (
                <View style={styles.reviewDetailCard}>
                  <View style={styles.reviewDetailIconWrap}>
                    <MaterialIcons name="location-on" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.reviewDetailTextWrap}>
                    <AppText variant="caption" tone="muted" style={styles.reviewDetailLabel}>
                      {strings.parentReviewCityLabel}
                    </AppText>
                    <AppText variant="bodyLarge" weight="700" style={styles.reviewDetailValue}>{data.city}</AppText>
                  </View>
                </View>
              ) : null}

              {secondaryDetail ? (
                <View style={styles.reviewDetailCard}>
                  <View style={styles.reviewDetailIconWrap}>
                    <MaterialIcons name={secondaryDetail.icon} size={20} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.reviewDetailRight}>
                    <AppText variant="caption" tone="muted" style={styles.reviewDetailLabel}>
                      {secondaryDetail.label}
                    </AppText>
                    {secondaryDetail.chips ? (
                      <View style={styles.reviewChipsRow}>
                        {secondaryDetail.chips.map(value => (
                          <AppChip key={value} label={value} tone="primary" size="sm" />
                        ))}
                      </View>
                    ) : (
                      <AppText variant="bodyLarge" weight="700" style={styles.reviewDetailValue}>
                        {secondaryDetail.value}
                      </AppText>
                    )}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {childCount > 0 ? (
            <View style={styles.reviewChildrenCard}>
              <View style={styles.reviewChildrenHeader}>
                <AppText variant="bodyLarge" weight="700" style={styles.reviewCardHeaderText}>
                  {strings.parentReviewChildrenTitle}
                </AppText>
                <View style={styles.reviewChildCountBadge}>
                  <AppText style={styles.reviewChildCountText}>
                    {strings.parentReviewChildrenCount(childCount)}
                  </AppText>
                </View>
              </View>

              <View style={styles.reviewChildrenList}>
                {Array.from({ length: Math.min(childCount, 4) }).map((_, i) => {
                  const birthDate = data.childBirthDates?.[i];
                  const age = birthDate ? calculateAgeFromBirthDate(birthDate) : null;
                  const childLabel =
                    data.childNames?.[i]?.trim() || strings.parentReviewChildName(i + 1);

                  return (
                    <View key={i} style={styles.reviewChildRow}>
                      <AvatarCircle name={childLabel} size={56} tone="accent" />
                      <View style={styles.reviewChildInfo}>
                        <AppText variant="body" weight="700" style={styles.reviewChildName}>
                          {childLabel}
                        </AppText>
                        {age !== null ? (
                          <AppText variant="caption" tone="muted" style={styles.reviewChildAge}>
                            {strings.parentReviewChildAge(age)}
                          </AppText>
                        ) : null}
                      </View>
                      <MaterialIcons
                        name={age !== null && age < 1 ? 'stroller' : 'child-care'}
                        size={20}
                        color={BabyCityPalette.textTertiary}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.reviewNotice}>
            <MaterialIcons name="info" size={20} color="#564f61" style={styles.reviewNoticeIcon} />
            <AppText style={styles.reviewNoticeText}>
              {strings.parentReviewNotice}
            </AppText>
          </View>

          {saveError ? (
            <AppText variant="body" tone="error" style={styles.reviewError}>{saveError}</AppText>
          ) : null}

          {/* CTA */}
          <View style={styles.reviewActions}>
            <AppPrimaryButton
              label={strings.parentReviewFinishAction}
              loading={saving}
              onPress={handleFinish}
              style={styles.reviewSaveBtn}
            />
            <TouchableOpacity
              style={styles.reviewEditBtn}
              onPress={() => setUiStep('form')}
              activeOpacity={0.8}
            >
              <AppText variant="body" weight="700" style={styles.reviewEditText}>
                {strings.parentReviewEditAction}
              </AppText>
            </TouchableOpacity>
          </View>
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
            ref={formScrollRef}
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.progressRow}>
              <View style={styles.progressTrackMuted} />
              <View style={[styles.progressTrackActive, { backgroundColor: theme.filterAccent }]} />
              <View style={styles.progressTrackIdle} />
            </View>

            <View style={styles.formIntroBlock}>
              <AppText variant="h1" weight="800" style={styles.formIntroTitle}>
                {'ספרו לנו על המשפחה שלכם'}
              </AppText>
              <AppText variant="body" tone="muted" style={styles.formIntroSubtitle}>
                {'המידע יעזור לנו ב-Smartaf למצוא עבורכם את המטפלת המושלמת שמתאימה בדיוק לצרכים של המשפחה שלכם.'}
              </AppText>
            </View>

            {saveError ? <AppText variant="body" tone="error" style={styles.errorText}>{saveError}</AppText> : null}

            <View style={styles.formCard}>
              <View style={styles.photoCard}>
                <TouchableOpacity
                  style={styles.photoStage}
                  onPress={handlePickProfilePhoto}
                  disabled={photoBusy}
                  activeOpacity={0.9}
                >
                  <View style={styles.photoPreview}>
                    {data.profilePhotoUrl ? (
                      <Image source={{ uri: data.profilePhotoUrl }} style={styles.photoImage} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <View style={styles.photoPlaceholderIcon}>
                          {photoBusy ? (
                            <ActivityIndicator color={BabyCityPalette.primary} />
                          ) : (
                            <MaterialIcons name="add-a-photo" size={34} color={BabyCityPalette.primary} />
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.photoEditBadge}>
                    <MaterialIcons
                      name={data.profilePhotoUrl ? 'edit' : 'camera-alt'}
                      size={16}
                      color="#ffffff"
                    />
                  </View>
                </TouchableOpacity>

                <AppText variant="caption" tone="muted" style={styles.photoPlaceholderHint}>
                  {strings.parentProfilePhotoHint}
                </AppText>

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

              <View style={styles.sectionIconHeader}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="person" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.parentFullNameLabel}</AppText>
              </View>
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
              <AddressLocationField
                city={data.city}
                value={data.addressFull}
                onChange={value => updateField('addressFull', value)}
                onCoordinatesObtained={(lat, lng) => setDraftCoordinates({ latitude: lat, longitude: lng })}
                onCityChange={value => updateField('city', value)}
                role="parent"
                errorText={fieldErrors.addressFull}
                cityErrorText={fieldErrors.city}
              />
            </View>

            <View style={[styles.formCard, styles.familyDetailsCard]}>
              <View style={styles.sectionIconHeader}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="edit-note" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.parentFamilyNote}</AppText>
              </View>

              <View style={styles.familyNoteSurface}>
                <TextInput
                  value={data.familyNote}
                  onChangeText={value => updateField('familyNote', value)}
                  placeholder={strings.parentFamilyNotePlaceholder}
                  placeholderTextColor={BabyCityPalette.textTertiary}
                  multiline
                  maxLength={MAX_FAMILY_NOTE_LENGTH}
                  textAlign="right"
                  style={styles.familyNoteInput}
                />
              </View>

              <AppText variant="caption" tone="muted" style={styles.counterText}>
                {data.familyNote.length}/{MAX_FAMILY_NOTE_LENGTH} {strings.parentDescriptionCounter}
              </AppText>
              {fieldErrors.familyNote ? (
                <AppText variant="caption" tone="error" style={styles.familyNoteError}>
                  {fieldErrors.familyNote}
                </AppText>
              ) : null}

              <View style={styles.familyBudgetCard}>
                <View style={styles.familyBudgetHeader}>
                  <View style={styles.familyBudgetIconWrap}>
                    <MaterialIcons name="payments" size={18} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="bodyLarge" weight="700" style={styles.familyBudgetTitle}>
                    {strings.parentHourlyBudget}
                  </AppText>
                </View>

                <View style={styles.familyBudgetInputWrap}>
                  <TextInput
                    value={data.hourlyBudget}
                    onChangeText={value => updateField('hourlyBudget', value.replace(/[^\d]/g, ''))}
                    placeholder={strings.parentHourlyBudgetPlaceholder}
                    placeholderTextColor={BabyCityPalette.textTertiary}
                    keyboardType="numeric"
                    textAlign="right"
                    style={styles.familyBudgetInput}
                  />
                  <View style={styles.familyBudgetCurrencyBadge}>
                    <AppText variant="bodyLarge" weight="800" style={styles.familyBudgetCurrencyText}>
                      ₪
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.sectionIconHeader}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="pets" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.parentPets}</AppText>
              </View>
              <AppText variant="caption" tone="muted" style={styles.helperText}>{strings.parentPetsHint}</AppText>
              <TagSelector
                options={PET_OPTIONS}
                selected={data.pets}
                onChange={next => updateField('pets', next)}
                tone="blue"
              />
            </View>

            <View style={styles.childrenSectionIntro}>
              <AppText variant="h2" weight="800" style={styles.childrenSectionTitle}>
                {strings.parentChildrenSectionTitle}
              </AppText>
              <AppText variant="body" tone="muted" style={styles.childrenSectionSubtitle}>
                {strings.parentChildrenSectionSubtitle}
              </AppText>
            </View>

            <View
              style={[styles.formCard, styles.childrenCard]}
              onLayout={event => {
                childrenCardTopRef.current = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.childrenCardBadge}>
                <View style={styles.childrenCardBadgeRing}>
                  <Image source={{ uri: PARENT_CHILDREN_IMAGE_URL }} style={styles.childrenCardBadgeImage} />
                </View>
              </View>

              <View style={styles.childrenFieldGroup}>
                <AppText variant="caption" tone="muted" style={styles.helperText}>
                  {strings.parentChildrenCountHint}
                </AppText>
                <View style={styles.childrenCountInputCard}>
                  <View style={styles.childrenCountIconWrap}>
                    <MaterialIcons name="group" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.childrenCountInputWrap}>
                    <AppText variant="caption" tone="muted" style={styles.childrenCountLabel}>
                      {strings.parentChildrenCount}
                    </AppText>
                    <TextInput
                      value={data.childrenCount}
                      onChangeText={handleChildrenCountChange}
                      placeholder={strings.parentChildrenCountPlaceholder}
                      placeholderTextColor={BabyCityPalette.textTertiary}
                      keyboardType="numeric"
                      returnKeyType="done"
                      textAlign="right"
                      style={styles.childrenCountInput}
                    />
                  </View>
                </View>
                {fieldErrors.childrenCount ? (
                  <AppText variant="caption" tone="error" style={styles.childrenCountError}>
                    {fieldErrors.childrenCount}
                  </AppText>
                ) : null}
              </View>

              {data.childBirthDates.length > 0 ? (
                <View
                  style={styles.childrenBirthDatesGroup}
                  onLayout={event => {
                    childEditorsGroupTopRef.current = event.nativeEvent.layout.y;
                  }}
                >
                  <AppText variant="bodyLarge" weight="800" style={styles.childrenBirthDatesTitle}>
                    {strings.parentChildrenBirthDates}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.childrenBirthDatesHint}>
                    {strings.parentChildBirthDatesHint}
                  </AppText>
                  <View
                    style={styles.childrenBirthDatesList}
                    onLayout={event => {
                      childEditorsListTopRef.current = event.nativeEvent.layout.y;
                    }}
                  >
                    {data.childBirthDates.map((value, index) => (
                      <View
                        key={`child-birth-date-${index}`}
                        style={styles.childEditorCard}
                        onLayout={event => {
                          childCardYPositions.current[index] = event.nativeEvent.layout.y;

                          if (pendingChildScrollIndexRef.current === index) {
                            maybeScrollToChild(index);
                          }
                        }}
                      >
                        <View style={styles.childEditorBadge}>
                          <View style={styles.childEditorBadgeRing}>
                            <Image source={{ uri: PARENT_CHILDREN_IMAGE_URL }} style={styles.childEditorBadgeImage} />
                          </View>
                        </View>

                        <View style={styles.childEditorContent}>
                          <AppText variant="bodyLarge" weight="800" style={styles.childEditorTitle}>
                            {data.childNames[index]?.trim() || strings.parentChildrenCardTitle(index + 1)}
                          </AppText>
                          {(() => {
                            const computedAge = calculateAgeFromBirthDate(value);
                            return computedAge !== null ? (
                              <AppText variant="caption" tone="muted" style={styles.childEditorAgeText}>
                                {strings.parentChildrenCurrentAge(computedAge)}
                              </AppText>
                            ) : null;
                          })()}

                          <LabeledInput
                            ref={node => {
                              childNameInputRefs.current[index] = node;
                            }}
                            label={strings.parentChildNameLabel}
                            value={data.childNames[index] ?? ''}
                            onChange={nextValue => handleChildNameChange(index, nextValue)}
                            placeholder={strings.parentChildNamePlaceholder}
                            returnKeyType="next"
                          />

                          <BirthdayField
                            label={childBirthDateLabel(index)}
                            value={value}
                            onChange={nextValue => handleChildBirthDateChange(index, nextValue)}
                            errorText={fieldErrors.childBirthDates}
                          />

                          <View style={styles.childAgeBandsBlock}>
                            <AppText variant="caption" tone="muted" style={styles.childAgeBandsLabel}>
                              {strings.parentChildrenAgeBandsLabel}
                            </AppText>
                            <View style={styles.childAgeBandsRow}>
                              {[
                                { key: 'infant', label: strings.parentChildAgeBandInfant },
                                { key: 'toddler', label: strings.parentChildAgeBandToddler },
                                { key: 'preschool', label: strings.parentChildAgeBandPreschool },
                                { key: 'older', label: strings.parentChildAgeBandOlder },
                              ].map(option => {
                                const selected =
                                  childAgeBandForAge(calculateAgeFromBirthDate(value)) === option.key;

                                return (
                                  <View
                                    key={option.key}
                                    style={[
                                      styles.childAgeBandChip,
                                      selected && styles.childAgeBandChipActive,
                                    ]}
                                  >
                                    <AppText
                                      variant="caption"
                                      weight={selected ? '700' : '600'}
                                      style={[
                                        styles.childAgeBandChipText,
                                        selected && styles.childAgeBandChipTextActive,
                                      ]}
                                    >
                                      {option.label}
                                    </AppText>
                                  </View>
                                );
                              })}
                            </View>
                          </View>

                          <View style={styles.childEditorNoteCard}>
                            <AppText variant="caption" tone="muted" style={styles.childEditorNoteText}>
                              {strings.parentChildrenDerivedAgeHint}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleAddChild}
                disabled={data.childBirthDates.length >= MAX_CHILDREN}
                style={[
                  styles.childrenGhostButton,
                  data.childBirthDates.length >= MAX_CHILDREN && styles.childrenGhostButtonDisabled,
                ]}
              >
                <MaterialIcons
                  name="add-circle-outline"
                  size={24}
                  color={data.childBirthDates.length >= MAX_CHILDREN ? '#a2adc4' : BabyCityPalette.primary}
                />
                <AppText
                  variant="body"
                  weight="700"
                  style={[
                    styles.childrenGhostButtonText,
                    data.childBirthDates.length >= MAX_CHILDREN && styles.childrenGhostButtonTextDisabled,
                  ]}
                >
                  {data.childBirthDates.length > 0
                    ? strings.parentChildrenAddAnother
                    : strings.parentChildrenAddFirst}
                </AppText>
              </TouchableOpacity>

              <AppText variant="caption" tone="muted" style={styles.childrenSupportText}>
                {data.childBirthDates.length >= MAX_CHILDREN
                  ? strings.parentChildrenMaxReached
                  : strings.parentChildrenLaterHint}
              </AppText>
            </View>

            <View style={styles.formTrustRow}>
              <MaterialIcons name="lock" size={18} color={BabyCityPalette.textTertiary} />
              <AppText variant="caption" tone="muted" style={styles.formTrustText}>
                {'ב-Smartaf המידע שלך מאובטח ויוצג רק למטפלות מאושרות.'}
              </AppText>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AppPrimaryButton
              label={'המשך'}
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
  // ── Welcome screen ─────────────────────────────────────────────────────────
  welcomeSafe: { flex: 1, backgroundColor: '#f4f6ff' },
  welcomeScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 44,
  },
  welcomeBubbleTopLeft: {
    position: 'absolute',
    top: -96,
    left: -88,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#dee8ffb8',
    zIndex: 0,
  },
  welcomeBubbleMidRight: {
    position: 'absolute',
    top: '44%',
    right: -148,
    width: 336,
    height: 336,
    borderRadius: 168,
    backgroundColor: '#e9def58a',
    zIndex: 0,
  },
  welcomeStage: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  welcomeBrandRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  welcomeBrandName: {
    color: '#702ae1',
    fontSize: 24,
    lineHeight: 30,
  },
  welcomeHeroWrap: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    position: 'relative',
  },
  welcomeHeroBgShape1: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#ecf1ff',
    borderRadius: 9999,
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }, { translateX: 14 }, { translateY: -12 }],
  },
  welcomeHeroBgShape2: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#e9def566',
    borderRadius: 9999,
    transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }, { translateX: -8 }, { translateY: 10 }],
  },
  welcomeHeroImageWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#242f41',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 6,
    zIndex: 1,
  },
  welcomeHeroImage: { width: '100%', height: '100%' },
  welcomeTrustBadge: {
    position: 'absolute',
    bottom: -18,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#242f41',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 6,
    zIndex: 2,
  },
  welcomeTrustIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff8eac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTrustText: { alignItems: 'flex-end' },
  welcomeTrustTitle: { color: '#242f41', fontSize: 13 },
  welcomeTrustSub: { color: '#515c70', fontSize: 11 },
  welcomeCopyBlock: {
    marginTop: 44,
    gap: 18,
    alignItems: 'center',
  },
  welcomeHeadline: {
    fontSize: 32,
    lineHeight: 40,
    color: '#242f41',
    maxWidth: 320,
  },
  welcomeSubtitle: {
    fontSize: 17,
    lineHeight: 27,
    color: '#515c70',
    maxWidth: 320,
    alignSelf: 'center',
  },
  welcomeActions: {
    marginTop: 30,
    gap: 14,
    paddingBottom: 10,
  },
  welcomeCta: {
    shadowColor: '#702ae1',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  welcomeLoginRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  welcomeLoginPrefix: {
    color: '#6c778c',
    fontSize: 15,
  },
  welcomeLoginText: {
    color: '#702ae1',
    fontSize: 15,
  },

  // ── Review screen ───────────────────────────────────────────────────────────
  reviewSafe: { flex: 1, backgroundColor: '#f4f6ff' },
  reviewTopBar: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(244,246,255,0.88)',
  },
  reviewTopBarBrand: {
    color: BabyCityPalette.primary,
    fontSize: 24,
    lineHeight: 30,
  },
  reviewTopBarAction: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  reviewTopBarActionText: {
    color: BabyCityPalette.primary,
  },
  reviewScroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 },
  reviewHeroSection: { alignItems: 'center', marginBottom: 34, gap: 10 },
  reviewHeroIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  reviewHeroBlur: {
    position: 'absolute',
    inset: 0,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#702ae11a',
  },
  reviewHeroCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#242f41',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  reviewHeroBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9e3657',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#242f41',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  reviewHeroTitle: { fontSize: 32, color: '#242f41' },
  reviewHeroSubtitle: { fontSize: 16, lineHeight: 24, color: '#515c70', maxWidth: '85%' },
  reviewTopGrid: {
    gap: 18,
    marginBottom: 18,
  },
  reviewFamilyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    overflow: 'hidden',
    position: 'relative',
    ...BabyCityShadows.soft,
  },
  reviewFamilyCardAccent: {
    position: 'absolute',
    top: -32,
    left: -32,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#702ae10d',
  },
  reviewCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 16 },
  reviewCardHeaderText: { color: '#242f41', textAlign: 'right' },
  reviewFamilyNote: { color: '#515c70', lineHeight: 24, textAlign: 'right', fontStyle: 'italic', fontSize: 14 },
  reviewDetailStack: {
    gap: 16,
  },
  reviewDetailCard: {
    backgroundColor: '#ecf1ff',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 18,
    ...BabyCityShadows.soft,
  },
  reviewDetailIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#242f41',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  reviewDetailTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reviewDetailRight: { flex: 1, alignItems: 'flex-end', gap: 6 },
  reviewDetailLabel: { textAlign: 'right', fontSize: 12, color: '#515c70' },
  reviewDetailValue: { textAlign: 'right', color: '#242f41', fontSize: 18 },
  reviewChipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  reviewChildrenCard: {
    backgroundColor: '#dee8ff',
    borderRadius: 24,
    padding: 26,
    marginBottom: 16,
  },
  reviewChildrenHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  reviewChildCountBadge: {
    backgroundColor: '#702ae11a',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  reviewChildCountText: { color: '#702ae1', fontSize: 13, fontWeight: '700' },
  reviewChildrenList: { gap: 12 },
  reviewChildRow: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    ...BabyCityShadows.soft,
  },
  reviewChildInfo: { flex: 1, alignItems: 'flex-end' },
  reviewChildName: { textAlign: 'right', color: '#242f41' },
  reviewChildAge: { textAlign: 'right' },
  reviewNotice: {
    backgroundColor: '#e9def5',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  reviewNoticeIcon: { marginTop: 2 },
  reviewNoticeText: { flex: 1, color: '#564f61', fontSize: 13, lineHeight: 20, textAlign: 'right' },
  reviewError: { textAlign: 'right', marginBottom: 12 },
  reviewActions: { marginTop: 32, gap: 16, marginBottom: 8 },
  reviewSaveBtn: {},
  reviewEditBtn: { alignItems: 'center', paddingVertical: 12 },
  reviewEditText: { color: '#702ae1', fontSize: 15 },
  container: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },
  formAuraTopLeft: {
    position: 'absolute',
    top: -96,
    left: -84,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#dee8ff99',
  },
  formAuraBottomRight: {
    position: 'absolute',
    right: -110,
    bottom: 40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#e9def566',
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
    paddingBottom: 6,
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
    paddingTop: 6,
    paddingBottom: 34,
  },
  progressRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  progressTrackMuted: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#d9cdf9',
    opacity: 0.45,
  },
  progressTrackActive: {
    width: 48,
    height: 6,
    borderRadius: 999,
  },
  progressTrackIdle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#d5e3ff',
  },
  formIntroBlock: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  formIntroTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
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
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginBottom: 18,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 3,
  },
  sectionTitle: {
    marginBottom: 14,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  sectionIconHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${BabyCityPalette.primary}0d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subsectionTitle: {
    marginBottom: 10,
    textAlign: 'right',
  },
  helperText: {
    marginTop: -6,
    marginBottom: 14,
    textAlign: 'right',
  },
  photoCard: {
    gap: 16,
    marginBottom: 28,
    alignItems: 'center',
  },
  photoPreview: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#dfe8ff',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: BabyCityPalette.surfaceLowest,
  },
  photoStage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dfe8ff',
  },
  photoPlaceholderHint: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 220,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoEditBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primary,
    borderWidth: 2,
    borderColor: BabyCityPalette.surfaceLowest,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  photoActions: {
    flexDirection: 'row-reverse',
    gap: 10,
    width: '100%',
  },
  photoActionButton: {
    flex: 1,
  },
  photoActionButtonGhost: {
    backgroundColor: BabyCityPalette.surface,
  },
  familyDetailsCard: {
    gap: 16,
  },
  familyNoteSurface: {
    minHeight: 152,
    borderRadius: 28,
    backgroundColor: BabyCityPalette.surfaceContainer,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  familyNoteInput: {
    minHeight: 118,
    fontSize: 15,
    lineHeight: 24,
    color: BabyCityPalette.textPrimary,
    textAlignVertical: 'top',
    fontFamily: 'BeVietnamPro_400Regular',
    writingDirection: 'rtl',
  },
  familyNoteError: {
    marginTop: -6,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  familyBudgetCard: {
    borderRadius: 24,
    backgroundColor: BabyCityPalette.surfaceLow,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  familyBudgetHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  familyBudgetIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  familyBudgetTitle: {
    color: BabyCityPalette.textPrimary,
  },
  familyBudgetInputWrap: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: BabyCityPalette.surfaceLowest,
    paddingRight: 52,
    paddingLeft: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  familyBudgetInput: {
    fontSize: 20,
    lineHeight: 26,
    color: BabyCityPalette.textPrimary,
    fontFamily: 'BeVietnamPro_600SemiBold',
    paddingVertical: 12,
  },
  familyBudgetCurrencyBadge: {
    position: 'absolute',
    right: 12,
    top: 11,
    bottom: 11,
    width: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primarySoft,
  },
  familyBudgetCurrencyText: {
    color: BabyCityPalette.primary,
  },
  childrenCard: {
    marginTop: 10,
    paddingTop: 40,
    overflow: 'visible',
  },
  childrenCardBadge: {
    position: 'absolute',
    top: -18,
    right: 22,
    zIndex: 2,
  },
  childrenCardBadgeRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: BabyCityPalette.canvas,
    backgroundColor: '#e9def5',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  childrenCardBadgeImage: {
    width: '100%',
    height: '100%',
  },
  childrenSectionIntro: {
    marginBottom: 26,
    alignItems: 'flex-end',
  },
  childrenSectionTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    marginBottom: 8,
  },
  childrenSectionSubtitle: {
    textAlign: 'right',
    lineHeight: 26,
    maxWidth: 340,
  },
  childrenFieldGroup: {
    marginBottom: 6,
  },
  childrenCountInputCard: {
    borderRadius: 24,
    backgroundColor: BabyCityPalette.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  childrenCountIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${BabyCityPalette.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childrenCountInputWrap: {
    flex: 1,
  },
  childrenCountLabel: {
    marginBottom: 4,
    textAlign: 'right',
  },
  childrenCountInput: {
    fontSize: 20,
    lineHeight: 26,
    color: BabyCityPalette.textPrimary,
    fontFamily: 'BeVietnamPro_600SemiBold',
    paddingVertical: 2,
  },
  childrenCountError: {
    marginTop: 8,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  childrenBirthDatesGroup: {
    marginTop: 2,
  },
  childrenBirthDatesTitle: {
    textAlign: 'right',
    marginBottom: 8,
  },
  childrenBirthDatesHint: {
    textAlign: 'right',
    marginBottom: 10,
  },
  childrenBirthDatesList: {
    marginTop: 4,
    gap: 18,
  },
  childEditorCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 18,
    paddingBottom: 18,
    position: 'relative',
    ...BabyCityShadows.soft,
  },
  childEditorBadge: {
    position: 'absolute',
    top: -18,
    right: 18,
    zIndex: 2,
  },
  childEditorBadgeRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: BabyCityPalette.canvas,
    backgroundColor: '#f1eaff',
  },
  childEditorBadgeImage: {
    width: '100%',
    height: '100%',
  },
  childEditorContent: {
    paddingTop: 12,
  },
  childEditorTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    marginBottom: 4,
  },
  childEditorAgeText: {
    textAlign: 'right',
    marginBottom: 12,
    lineHeight: 20,
  },
  childAgeBandsBlock: {
    marginTop: -2,
    marginBottom: 12,
  },
  childAgeBandsLabel: {
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 20,
  },
  childAgeBandsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  childAgeBandChip: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAgeBandChipActive: {
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  childAgeBandChipText: {
    color: BabyCityPalette.textSecondary,
  },
  childAgeBandChipTextActive: {
    color: BabyCityPalette.onSecondaryContainer,
  },
  childEditorNoteCard: {
    borderRadius: 22,
    backgroundColor: BabyCityPalette.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  childEditorNoteText: {
    textAlign: 'right',
    lineHeight: 20,
  },
  childrenGhostButton: {
    minHeight: 64,
    marginTop: 4,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d7dce9',
    backgroundColor: '#f8fbff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  childrenGhostButtonDisabled: {
    opacity: 0.72,
  },
  childrenGhostButtonText: {
    color: BabyCityPalette.primary,
  },
  childrenGhostButtonTextDisabled: {
    color: BabyCityPalette.textTertiary,
  },
  childrenSupportText: {
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  counterText: {
    marginTop: -6,
    color: BabyCityPalette.textTertiary,
    textAlign: 'right',
  },
  formTrustRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  formTrustText: {
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
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
