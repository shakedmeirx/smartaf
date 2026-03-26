import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppText from '@/components/ui/AppText';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
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

type WeekDayVisual = {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBackground: string;
  filled?: boolean;
};

const DAY_VISUALS: WeekDayVisual[] = [
  {
    icon: 'wb-sunny',
    iconColor: BabyCityPalette.primary,
    iconBackground: `${BabyCityPalette.primary}12`,
    filled: true,
  },
  {
    icon: 'calendar-today',
    iconColor: BabyCityPalette.textSecondary,
    iconBackground: BabyCityPalette.secondaryContainer,
  },
  {
    icon: 'nightlight-round',
    iconColor: BabyCityPalette.outline,
    iconBackground: '#f1f4f9',
  },
  {
    icon: 'cloud',
    iconColor: '#e05564',
    iconBackground: '#fff0f2',
    filled: true,
  },
  {
    icon: 'bolt',
    iconColor: '#f59e0b',
    iconBackground: '#fff7e6',
    filled: true,
  },
  {
    icon: 'nights-stay',
    iconColor: '#6366f1',
    iconBackground: '#eef2ff',
  },
  {
    icon: 'celebration',
    iconColor: '#059669',
    iconBackground: '#ecfdf5',
    filled: true,
  },
];

function formatDayTitle(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('he-IL', {
    weekday: 'long',
  });
}

function summarizeAvailabilitySlots(selected: string[]) {
  if (selected.length === 0) {
    return strings.notFilled;
  }

  if (selected.length <= 2) {
    return selected.join(' • ');
  }

  return strings.babysitterAvailabilitySlotsSummary(selected.length);
}

export default function BabysitterAvailabilityScreen() {
  const theme = getRoleTheme('babysitter');
  const { currentBabysitterProfileId, refreshBabysitterData } = useAppState();
  const currentWeekOptions = useMemo(() => getCurrentWeekDayOptions(), []);
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
      for (const key of Object.keys(fields) as (keyof FieldErrors)[]) {
        delete nextErrors[key];
      }
      return nextErrors;
    });
  }

  function toggleWeekDay(dayKey: string) {
    const nextDays = settings.weekDays.includes(dayKey)
      ? settings.weekDays.filter(value => value !== dayKey)
      : [...settings.weekDays, dayKey];

    updateSettings({ weekDays: nextDays });
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

  const availabilitySummary = summarizeAvailabilitySlots(settings.availability);
  const hourlyRateSummary = settings.hourlyRate.trim()
    ? `₪${settings.hourlyRate.trim()}`
    : strings.notFilled;

  if (!currentBabysitterProfileId && !loading) {
    return (
      <AppShell
        title={strings.babysitterAvailabilityScreenTitle}
        activeTab="settings"
        backgroundColor={theme.screenBackground}
        showBackButton
        onBack={() => router.back()}
      >
        <AppScreen backgroundColor={theme.screenBackground}>
          <ScreenStateCard
            role="babysitter"
            icon="calendar-outline"
            title={strings.babysitterAvailabilityScreenTitle}
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
      title={strings.babysitterAvailabilityScreenTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
      bottomOverlay={
        loading ? null : (
          <LinearGradient
            colors={['rgba(244,246,255,0)', 'rgba(244,246,255,0.92)', '#f4f6ff']}
            locations={[0, 0.35, 1]}
            style={styles.bottomOverlay}
          >
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveButtonOuter, saving && styles.saveButtonDisabled]}
            >
              <LinearGradient
                colors={['#702ae1', '#6411d5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                <MaterialIcons name="check-circle" size={22} color="#ffffff" />
                <AppText variant="h3" weight="700" align="center" style={styles.saveButtonText}>
                  {saving ? strings.babysitterAvailabilitySaving : strings.babysitterAvailabilitySave}
                </AppText>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        )
      }
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.heroSection}>
          <AppText variant="h1" weight="800" style={styles.heroTitle}>
            {strings.babysitterAvailabilityHeroTitle}
          </AppText>
          <AppText variant="bodyLarge" tone="muted" style={styles.heroSubtitle}>
            {strings.babysitterAvailabilityHeroSubtitle}
          </AppText>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={theme.filterAccent} />
          </View>
        ) : (
          <>
            <View style={styles.weekCardStack}>
              {currentWeekOptions.map((option, index) => {
                const isActive = settings.weekDays.includes(option.key);
                const visual = DAY_VISUALS[index % DAY_VISUALS.length];

                return (
                  <TouchableOpacity
                    key={option.key}
                    accessibilityRole="button"
                    activeOpacity={0.88}
                    onPress={() => toggleWeekDay(option.key)}
                    style={[
                      styles.weekCard,
                      isActive ? styles.weekCardActive : styles.weekCardInactive,
                    ]}
                  >
                    <View style={styles.weekCardHeader}>
                      <View style={styles.weekCardTitleWrap}>
                        <AppText
                          variant="caption"
                          weight="700"
                          tone="muted"
                          style={styles.weekCardDate}
                        >
                          {option.label}
                        </AppText>
                        <View style={styles.weekCardTitleRow}>
                          <AppText
                            variant="h3"
                            weight="800"
                            style={[styles.weekCardTitle, !isActive && styles.weekCardTitleInactive]}
                          >
                            {formatDayTitle(option.isoDate)}
                          </AppText>
                          <View
                            style={[
                              styles.weekCardIconWrap,
                              {
                                backgroundColor: isActive
                                  ? visual.iconBackground
                                  : '#f3f4f6',
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={visual.icon}
                              size={24}
                              color={isActive ? visual.iconColor : BabyCityPalette.outline}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={[styles.weekToggle, isActive && styles.weekToggleActive]}>
                        <View style={[styles.weekToggleThumb, isActive && styles.weekToggleThumbActive]} />
                      </View>
                    </View>

                    {isActive ? (
                      <View style={styles.weekCardSummaryGrid}>
                        <View style={styles.weekCardSummaryBox}>
                          <AppText variant="caption" weight="700" tone="muted">
                            {strings.hourlyRate}
                          </AppText>
                          <AppText variant="bodyLarge" weight="700" style={styles.weekCardSummaryValue}>
                            {hourlyRateSummary}
                          </AppText>
                        </View>
                        <View style={styles.weekCardSummaryBox}>
                          <AppText variant="caption" weight="700" tone="muted">
                            {strings.availabilityLabel}
                          </AppText>
                          <AppText variant="bodyLarge" weight="700" style={styles.weekCardSummaryValue}>
                            {availabilitySummary}
                          </AppText>
                        </View>
                      </View>
                    ) : (
                      <AppText variant="caption" tone="muted" style={styles.weekCardHint}>
                        {strings.babysitterAvailabilityDayInactive}
                      </AppText>
                    )}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.trustBanner}>
                <MaterialIcons
                  name="verified-user"
                  size={20}
                  color={BabyCityPalette.primary}
                  style={styles.trustIcon}
                />
                <AppText variant="caption" weight="600" style={styles.trustText}>
                  {strings.reviewNote}
                </AppText>
              </View>
            </View>

            <AppCard role="babysitter" variant="panel" style={styles.sectionCard}>
              <View style={styles.sectionIconHeader}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="schedule" size={20} color={BabyCityPalette.primary} />
                </View>
                <View style={styles.sectionTitleWrap}>
                  <AppText variant="bodyLarge" weight="700">
                    {strings.babysitterAvailabilityTimeWindowsTitle}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {strings.babysitterAvailabilityTimeWindowsSubtitle}
                  </AppText>
                </View>
              </View>

              <TagSelector
                options={BABYSITTER_AVAILABILITY_OPTIONS}
                selected={settings.availability}
                onChange={availability => updateSettings({ availability })}
                errorText={fieldErrors.availability}
                tone="lavender"
              />
            </AppCard>

            <AppCard role="babysitter" variant="panel" style={styles.sectionCard}>
              <View style={styles.sectionIconHeader}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="tune" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">
                  {strings.babysitterAvailabilityDetailsTitle}
                </AppText>
              </View>

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
                {strings.preferredLocationLabel}
              </AppText>
              <TagSelector
                options={BABYSITTER_LOCATION_OPTIONS}
                selected={settings.preferredLocation ? [settings.preferredLocation] : []}
                onChange={values => updateSettings({ preferredLocation: values[0] ?? '' })}
                singleSelect
                tone="lavender"
              />

              <AppText variant="body" weight="700" style={styles.label}>
                {strings.extrasLabel}
              </AppText>
              <TagSelector
                options={BABYSITTER_EXTRAS_OPTIONS}
                selected={settings.extras}
                onChange={extras => updateSettings({ extras })}
                tone="blue"
              />

              <ToggleRow
                label={strings.hasCar}
                value={settings.hasCar}
                onChange={hasCar => updateSettings({ hasCar })}
                tone="lavender"
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
          </>
        )}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 176,
  },
  heroSection: {
    marginBottom: 22,
    gap: 10,
    paddingHorizontal: 2,
  },
  heroTitle: {
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 24,
  },
  weekCardStack: {
    gap: 14,
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  weekCard: {
    borderRadius: 28,
    padding: 22,
  },
  weekCardActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(112, 42, 225, 0.06)',
    shadowColor: '#702ae1',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  weekCardInactive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(196,198,208,0.5)',
  },
  weekCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  weekCardTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  weekCardTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  weekCardDate: {
    opacity: 0.68,
  },
  weekCardTitle: {
    color: BabyCityPalette.textPrimary,
  },
  weekCardTitleInactive: {
    opacity: 0.44,
  },
  weekCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekToggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#d8deea',
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  weekToggleActive: {
    backgroundColor: BabyCityPalette.primary,
  },
  weekToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  weekToggleThumbActive: {
    alignSelf: 'flex-end',
  },
  weekCardSummaryGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 18,
  },
  weekCardSummaryBox: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: '#f8f9fc',
    borderWidth: 1,
    borderColor: '#f0f2f6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  weekCardSummaryValue: {
    textAlign: 'right',
  },
  weekCardHint: {
    marginTop: 14,
    marginRight: 60,
    opacity: 0.7,
    lineHeight: 18,
  },
  trustBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: `${BabyCityPalette.primary}0a`,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}16`,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  trustIcon: {
    marginTop: 2,
  },
  trustText: {
    flex: 1,
    textAlign: 'right',
    color: BabyCityPalette.primary,
    lineHeight: 18,
  },
  loadingWrap: {
    paddingVertical: BabyCityGeometry.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
    padding: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}0d`,
  },
  sectionTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  fieldBlock: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  label: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  feedbackText: {
    marginBottom: BabyCityGeometry.spacing.md,
    textAlign: 'right',
  },
  bottomOverlay: {
    paddingTop: 22,
    paddingBottom: 8,
  },
  saveButtonOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButton: {
    minHeight: 58,
    borderRadius: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  saveButtonText: {
    color: '#ffffff',
  },
});
