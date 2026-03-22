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
import { MaterialIcons } from '@expo/vector-icons';
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
        {/* Atmosphere bubbles */}
        <View style={styles.welcomeBubbleTopLeft} pointerEvents="none" />
        <View style={styles.welcomeBubbleMidRight} pointerEvents="none" />

        <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
          {/* Brand — centered */}
          <View style={styles.welcomeBrandRow}>
            <AppText variant="bodyLarge" weight="800" style={styles.welcomeBrandName}>
              {strings.appName}
            </AppText>
          </View>

          {/* Hero illustration */}
          <View style={styles.welcomeHeroWrap}>
            {/* Background shape layers */}
            <View style={styles.welcomeHeroBgShape1} />
            <View style={styles.welcomeHeroBgShape2} />

            {/* Main image */}
            <View style={styles.welcomeHeroImageWrap}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5wfqxzhnrq9X-rWgu93gAkoCCF6Slk7LPdDPHyxoUb5XQ7FeWinBlNQ1b1jovjfnqz_gnk1BpggjfyM4AB7Hfj2mOAjowhr7QXqdCcJftoRY2iAmU-WEIhinLjNsIyzjKrj_IIDPQGDgLqO71oY4FRYpaohir7eFEU73qcLVQ5L9ae1CWoOicMwZ-MPVsAVJsQKH78RP1duR2SVTJumpJwgwSaUBP8v7HoAubImaKo4TWsCGCNGoXP472KsNluUysQ7vTTPguPfpq' }}
                style={styles.welcomeHeroImage}
                resizeMode="cover"
              />
            </View>

            {/* Floating trust badge */}
            <View style={styles.welcomeTrustBadge}>
              <View style={styles.welcomeTrustIcon}>
                <MaterialIcons name="verified" size={20} color="#64042d" />
              </View>
              <View style={styles.welcomeTrustText}>
                <AppText variant="caption" weight="700" style={styles.welcomeTrustTitle}>{'ביטחון מלא'}</AppText>
                <AppText style={styles.welcomeTrustSub}>{'מטפלות מוסמכות בלבד'}</AppText>
              </View>
            </View>
          </View>

          {/* Headline + subtitle */}
          <View style={styles.welcomeCopyBlock}>
            <AppText variant="h1" weight="800" align="center" style={styles.welcomeHeadline}>
              {'ברוכים הבאים למשפחת Smartaf'}
            </AppText>
            <AppText variant="body" tone="muted" align="center" style={styles.welcomeSubtitle}>
              {'המקום שבו ביטחון, רוגע וטיפול מסור נפגשים. אנחנו כאן כדי לעזור לכם למצוא את המעטפת המושלמת עבור הקטנטנים שלכם.'}
            </AppText>
          </View>

          {/* CTA buttons */}
          <View style={styles.welcomeActions}>
            <AppPrimaryButton
              label={'מתחילים'}
              onPress={() => setUiStep('form')}
              style={styles.welcomeCta}
            />
            <TouchableOpacity activeOpacity={0.8} style={styles.welcomeLoginBtn}>
              <AppText variant="body" weight="600" style={styles.welcomeLoginText}>
                {'כבר יש לי חשבון? התחברות'}
              </AppText>
            </TouchableOpacity>
          </View>
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

          {/* Hero section — verified icon + badge */}
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
            <AppText variant="h1" weight="800" align="center" style={styles.reviewHeroTitle}>{'הכל מוכן!'}</AppText>
            <AppText variant="body" tone="muted" align="center" style={styles.reviewHeroSubtitle}>
              {'פרופיל ההורה שלך נוצר בהצלחה. הנה סיכום של המידע שהזנת.'}
            </AppText>
          </View>

          {/* Family description card (family note) */}
          {data.familyNote ? (
            <View style={styles.reviewFamilyCard}>
              <View style={styles.reviewFamilyCardAccent} />
              <View style={styles.reviewCardHeader}>
                <MaterialIcons name="family-restroom" size={20} color={BabyCityPalette.primary} />
                <AppText variant="bodyLarge" weight="700" style={styles.reviewCardHeaderText}>{'תיאור המשפחה'}</AppText>
              </View>
              <AppText style={styles.reviewFamilyNote}>{`"${data.familyNote}"`}</AppText>
            </View>
          ) : null}

          {/* Location row */}
          {data.city ? (
            <View style={styles.reviewDetailCard}>
              <View style={styles.reviewDetailIconWrap}>
                <MaterialIcons name="location-on" size={20} color={BabyCityPalette.primary} />
              </View>
              <View>
                <AppText variant="caption" tone="muted" style={styles.reviewDetailLabel}>{'עיר מגורים'}</AppText>
                <AppText variant="bodyLarge" weight="700" style={styles.reviewDetailValue}>{data.city}</AppText>
              </View>
            </View>
          ) : null}

          {/* Pets */}
          {data.pets.length > 0 ? (
            <View style={styles.reviewDetailCard}>
              <View style={styles.reviewDetailIconWrap}>
                <MaterialIcons name="pets" size={20} color={BabyCityPalette.primary} />
              </View>
              <View style={styles.reviewDetailRight}>
                <AppText variant="caption" tone="muted" style={styles.reviewDetailLabel}>{'חיות מחמד'}</AppText>
                <View style={styles.reviewChipsRow}>
                  {data.pets.map(pet => (
                    <AppChip key={pet} label={pet} tone="primary" size="sm" />
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {/* Children section */}
          {childCount > 0 ? (
            <View style={styles.reviewChildrenCard}>
              <View style={styles.reviewChildrenHeader}>
                <AppText variant="bodyLarge" weight="700" style={styles.reviewCardHeaderText}>{'הילדים שלנו'}</AppText>
                <View style={styles.reviewChildCountBadge}>
                  <AppText style={styles.reviewChildCountText}>{`${childCount} ילדים`}</AppText>
                </View>
              </View>
              <View style={styles.reviewChildrenList}>
                {Array.from({ length: Math.min(childCount, 4) }).map((_, i) => {
                  const birthDate = data.childBirthDates?.[i];
                  const age = birthDate ? calculateAgeFromBirthDate(birthDate) : null;
                  return (
                    <View key={i} style={styles.reviewChildRow}>
                      <AvatarCircle name={String(i + 1)} size={56} tone="accent" />
                      <View style={styles.reviewChildInfo}>
                        <AppText variant="body" weight="700">{`ילד ${i + 1}`}</AppText>
                        {age !== null ? (
                          <AppText variant="caption" tone="muted">{`בן/בת ${age} שנים`}</AppText>
                        ) : null}
                      </View>
                      <MaterialIcons name="child-care" size={20} color={BabyCityPalette.textTertiary} />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Verification notice */}
          <View style={styles.reviewNotice}>
            <MaterialIcons name="info" size={20} color="#564f61" style={styles.reviewNoticeIcon} />
            <AppText style={styles.reviewNoticeText}>
              {'שימי לב: המידע שהזנת יוצג למטפלות פוטנציאליות רק לאחר אישור הפרופיל על ידי הצוות שלנו. תוכלי לערוך את הפרטים בכל עת מהגדרות הפרופיל.'}
            </AppText>
          </View>

          {saveError ? (
            <AppText variant="body" tone="error" style={styles.reviewError}>{saveError}</AppText>
          ) : null}

          {/* CTA */}
          <View style={styles.reviewActions}>
            <AppPrimaryButton
              label={'סיום והמשך לאפליקציה'}
              loading={saving}
              onPress={handleFinish}
              style={styles.reviewSaveBtn}
            />
            <TouchableOpacity
              style={styles.reviewEditBtn}
              onPress={() => setUiStep('form')}
              activeOpacity={0.8}
            >
              <AppText variant="body" weight="700" style={styles.reviewEditText}>{'חזרה לעריכה'}</AppText>
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
                          <MaterialIcons name="camera-alt" size={26} color={BabyCityPalette.primary} />
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
  // ── Welcome screen ─────────────────────────────────────────────────────────
  welcomeSafe: { flex: 1, backgroundColor: '#f4f6ff' },
  welcomeScroll: { paddingHorizontal: 24, paddingBottom: 48 },
  // Atmosphere bubbles
  welcomeBubbleTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: '#dee8ff99',
    zIndex: 0,
  },
  welcomeBubbleMidRight: {
    position: 'absolute',
    top: '40%',
    right: -128,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#e9def566',
    zIndex: 0,
  },
  // Brand
  welcomeBrandRow: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  welcomeBrandName: { color: '#702ae1', fontSize: 24, lineHeight: 30 },
  // Hero illustration
  welcomeHeroWrap: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  welcomeHeroBgShape1: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#ecf1ff',
    borderRadius: 9999,
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }, { translateX: 12 }, { translateY: -12 }],
  },
  welcomeHeroBgShape2: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#e9def54d',
    borderRadius: 9999,
    transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }, { translateX: -8 }, { translateY: 8 }],
  },
  welcomeHeroImageWrap: {
    width: '90%',
    height: '90%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#242f41',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 6,
    zIndex: 1,
  },
  welcomeHeroImage: { width: '100%', height: '100%' },
  // Floating trust badge
  welcomeTrustBadge: {
    position: 'absolute',
    bottom: -16,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
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
  // Copy
  welcomeCopyBlock: { marginTop: 28, gap: 16 },
  welcomeHeadline: { fontSize: 32, lineHeight: 40, color: '#242f41' },
  welcomeSubtitle: { fontSize: 17, lineHeight: 26, color: '#515c70', maxWidth: '90%', alignSelf: 'center' },
  // Actions
  welcomeActions: { marginTop: 28, gap: 12, paddingBottom: 16 },
  welcomeCta: {},
  welcomeLoginBtn: { alignItems: 'center', paddingVertical: 12 },
  welcomeLoginText: { color: '#702ae1', fontSize: 15 },

  // ── Review screen ───────────────────────────────────────────────────────────
  reviewSafe: { flex: 1, backgroundColor: '#f4f6ff' },
  reviewScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  // Hero
  reviewHeroSection: { alignItems: 'center', marginBottom: 32, gap: 12 },
  reviewHeroIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  reviewHeroBlur: {
    position: 'absolute',
    inset: 0,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: '#702ae11a',
  },
  reviewHeroCircle: {
    width: 192,
    height: 192,
    borderRadius: 96,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  // Family card
  reviewFamilyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#242f41',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
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
  reviewFamilyNote: { color: '#515c70', lineHeight: 22, textAlign: 'right', fontStyle: 'italic', fontSize: 14 },
  // Detail card (location / pets)
  reviewDetailCard: {
    backgroundColor: '#ecf1ff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 20,
    shadowColor: '#242f41',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
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
  reviewDetailRight: { flex: 1, alignItems: 'flex-end', gap: 6 },
  reviewDetailLabel: { textAlign: 'right', fontSize: 12, color: '#515c70' },
  reviewDetailValue: { textAlign: 'right', color: '#242f41', fontSize: 18 },
  reviewChipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  // Children card
  reviewChildrenCard: {
    backgroundColor: '#dee8ff',
    borderRadius: 16,
    padding: 32,
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
  reviewChildrenList: { gap: 16 },
  reviewChildRow: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
  },
  reviewChildInfo: { flex: 1, alignItems: 'flex-end' },
  // Notice
  reviewNotice: {
    backgroundColor: '#e9def5',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  reviewNoticeIcon: { marginTop: 2 },
  reviewNoticeText: { flex: 1, color: '#564f61', fontSize: 13, lineHeight: 20, textAlign: 'right' },
  reviewError: { textAlign: 'right', marginBottom: 12 },
  // Actions
  reviewActions: { marginTop: 32, gap: 16 },
  reviewSaveBtn: {},
  reviewEditBtn: { alignItems: 'center', paddingVertical: 12 },
  reviewEditText: { color: '#702ae1', fontSize: 15 },
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
