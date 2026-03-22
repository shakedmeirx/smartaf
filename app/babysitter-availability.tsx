import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import SectionHeader from '@/components/ui/SectionHeader';
import TagSelector from '@/components/onboarding/TagSelector';
import ToggleRow from '@/components/onboarding/ToggleRow';
import { useAppState } from '@/context/AppContext';
import {
  BabyCityPalette,
  BabyCityGeometry,
  BabysitterDesignTokens,
  getRoleTheme,
} from '@/constants/theme';
import { strings } from '@/locales';
import {
  BABYSITTER_AVAILABILITY_OPTIONS,
  BABYSITTER_EXTRAS_OPTIONS,
  BABYSITTER_LOCATION_OPTIONS,
} from '@/data/babysitterPreferences';
import {
  BabysitterAvailabilitySettings,
  getCurrentWeekDayOptions,
  initialBabysitterAvailabilitySettings,
  loadBabysitterAvailabilitySettings,
  saveBabysitterAvailabilitySettings,
} from '@/lib/babysitterAvailability';
import { initialOnboardingData } from '@/types/onboarding';
import { validateBabysitterStep } from '@/lib/onboardingValidation';

type FieldErrors = Partial<Record<'hourlyRate' | 'availability', string>>;

export default function BabysitterAvailabilityScreen() {
  const theme = getRoleTheme('babysitter');
  const { currentBabysitterProfileId, refreshBabysitterData } = useAppState();
  const currentWeekOptions = getCurrentWeekDayOptions();
  const [settings, setSettings] = useState<BabysitterAvailabilitySettings>(
    initialBabysitterAvailabilitySettings
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      if (!currentBabysitterProfileId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { settings: loadedSettings, error } =
        await loadBabysitterAvailabilitySettings(currentBabysitterProfileId);

      if (cancelled) {
        return;
      }

      if (error || !loadedSettings) {
        setErrorText(strings.babysitterAvailabilityLoadError);
      } else {
        setSettings(loadedSettings);
        setErrorText('');
      }

      setLoading(false);
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [currentBabysitterProfileId]);

  function updateSettings(fields: Partial<BabysitterAvailabilitySettings>) {
    setSettings(prev => ({ ...prev, ...fields }));
    setErrorText('');
    setSuccessText('');
    setFieldErrors(prev => {
      const nextErrors = { ...prev };
      for (const key of Object.keys(fields) as Array<keyof FieldErrors>) {
        delete nextErrors[key];
      }
      return nextErrors;
    });
  }

  async function handleSave() {
    if (!currentBabysitterProfileId) {
      setErrorText(strings.babysitterShiftProfileMissing);
      return;
    }

    const validation = validateBabysitterStep(4, {
      ...initialOnboardingData,
      hourlyRate: settings.hourlyRate,
      availability: [...settings.availability, ...settings.weekDays],
      extras: settings.extras,
      preferredLocation: settings.preferredLocation,
      hasCar: settings.hasCar,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
      setErrorText(strings.onboardingValidationFix);
      setSuccessText('');
      return;
    }

    setSaving(true);
    setErrorText('');
    setSuccessText('');

    const { error } = await saveBabysitterAvailabilitySettings(
      currentBabysitterProfileId,
      settings
    );

    setSaving(false);

    if (error) {
      setErrorText(strings.babysitterAvailabilitySaveError);
      return;
    }

    await refreshBabysitterData();
    setSuccessText(strings.babysitterAvailabilitySaved);
  }

  if (!currentBabysitterProfileId && !loading) {
    return (
      <AppShell
        title={strings.drawerAvailability}
        activeTab="settings"
        backgroundColor={theme.screenBackground}
        showBackButton
        onBack={() => router.back()}
      >
        <AppScreen backgroundColor={theme.screenBackground}>
          <ScreenStateCard
            role="babysitter"
            icon="calendar-outline"
            title={strings.drawerAvailability}
            body={strings.babysitterShiftProfileMissing}
            actionLabel={strings.drawerEditProfile}
            onActionPress={() => router.push('/babysitter-onboarding')}
          />
        </AppScreen>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={strings.drawerAvailability}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      <AppScreen scrollable backgroundColor={theme.screenBackground}>
        <AppCard
          role="babysitter"
          variant="hero"
          backgroundColor={theme.highlightedSurface}
          borderColor="transparent"
          style={styles.heroCard}
        >
          <SectionHeader
            title={strings.drawerAvailability}
            subtitle={strings.babysitterAvailabilitySubtitle}
          />
        </AppCard>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={theme.filterAccent} />
          </View>
        ) : (
          <>
            <AppCard role="babysitter" variant="panel" style={styles.sectionCard}>
              <SectionHeader
                title={strings.babysitterAvailabilityPreferencesTitle}
                subtitle={strings.hourlyRateHint}
              />

              <AppInput
                label={strings.hourlyRate}
                value={settings.hourlyRate}
                onChangeText={value => updateSettings({ hourlyRate: value })}
                placeholder={strings.hourlyRatePlaceholder}
                keyboardType="numeric"
                error={fieldErrors.hourlyRate}
                containerStyle={styles.fieldBlock}
              />

              <AppText variant="body" weight="700" style={styles.label}>
                {strings.availabilityLabel}
              </AppText>
              <TagSelector
                options={BABYSITTER_AVAILABILITY_OPTIONS}
                selected={settings.availability}
                onChange={availability => updateSettings({ availability })}
                errorText={fieldErrors.availability}
                tone="lavender"
              />

              <AppText variant="body" weight="700" style={styles.label}>
                {strings.babysitterAvailabilityWeekdaysTitle}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.hint}>
                {strings.babysitterAvailabilityWeekdaysSubtitle}
              </AppText>
              <TagSelector
                options={currentWeekOptions.map(option => option.label)}
                selected={currentWeekOptions
                  .filter(option => settings.weekDays.includes(option.key))
                  .map(option => option.label)}
                onChange={selectedLabels => {
                  const selectedKeys = currentWeekOptions
                    .filter(option => selectedLabels.includes(option.label))
                    .map(option => option.key);
                  updateSettings({ weekDays: selectedKeys });
                }}
                tone="blue"
              />

              <AppText variant="body" weight="700" style={styles.label}>
                {strings.extrasLabel}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.hint}>
                {strings.extrasHint}
              </AppText>
              <TagSelector
                options={BABYSITTER_EXTRAS_OPTIONS}
                selected={settings.extras}
                onChange={extras => updateSettings({ extras })}
                tone="blue"
              />

              <AppText variant="body" weight="700" style={styles.label}>
                {strings.preferredLocationLabel}
              </AppText>
              <TagSelector
                options={BABYSITTER_LOCATION_OPTIONS}
                selected={settings.preferredLocation ? [settings.preferredLocation] : []}
                onChange={values => updateSettings({ preferredLocation: values[0] ?? '' })}
                singleSelect
                tone="lavender"
              />

              <ToggleRow
                label={strings.hasCar}
                value={settings.hasCar}
                onChange={hasCar => updateSettings({ hasCar })}
                tone="lavender"
              />
            </AppCard>

            <AppCard role="babysitter" variant="panel" style={styles.sectionCard}>
              <SectionHeader
                title={strings.babysitterAvailabilityVisibilityTitle}
                subtitle={strings.reviewNote}
              />

              <ToggleRow
                label={strings.acceptingRequestsLabel}
                value={settings.acceptingRequests}
                onChange={acceptingRequests => updateSettings({ acceptingRequests })}
                tone="blue"
              />
              <ToggleRow
                label={strings.notificationsLabel}
                value={settings.notifications}
                onChange={notifications => updateSettings({ notifications })}
                tone="blue"
              />
              <ToggleRow
                label={strings.profileVisibleLabel}
                value={settings.profileVisible}
                onChange={profileVisible => updateSettings({ profileVisible })}
                tone="blue"
              />
            </AppCard>

            {errorText ? (
              <AppText variant="body" tone="error" style={styles.feedbackText}>
                {errorText}
              </AppText>
            ) : null}

            {successText ? (
              <AppText
                variant="body"
                style={[styles.feedbackText, { color: BabyCityPalette.success }]}
              >
                {successText}
              </AppText>
            ) : null}

            <AppPrimaryButton
              label={saving ? strings.babysitterAvailabilitySaving : strings.babysitterAvailabilitySave}
              loading={saving}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </>
        )}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  loadingWrap: {
    paddingVertical: BabyCityGeometry.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  fieldBlock: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  label: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  hint: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  feedbackText: {
    marginBottom: BabyCityGeometry.spacing.md,
  },
  saveButton: {
    marginBottom: BabyCityGeometry.spacing.xl,
  },
});
