import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BabyCityGeometry,
  BabyCityPalette,
  BabyCityShadows,
} from '@/constants/theme';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import AppText from '@/components/ui/AppText';
import {
  BABYSITTER_AVAILABILITY_OPTIONS,
  BABYSITTER_EXTRAS_OPTIONS,
  BABYSITTER_LOCATION_OPTIONS,
} from '@/data/babysitterPreferences';

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  errors?: Partial<Record<'hourlyRate' | 'availability', string>>;
};

export default function Step4Preferences({ data, onChange, errors = {} }: Props) {
  const availabilitySummary = data.availability.length > 0
    ? data.availability.join(' • ')
    : strings.availabilityLabel;

  const extrasSummary = data.extras.length > 0
    ? data.extras.join(' • ')
    : strings.extrasHint;

  const locationSummary = data.preferredLocation || strings.preferredLocationLabel;

  function renderOptionPill(
    option: string,
    selected: boolean,
    onPress: () => void,
    wide = false
  ) {
    return (
      <TouchableOpacity key={option} activeOpacity={0.9} onPress={onPress}>
        {selected ? (
          <LinearGradient
            colors={[BabyCityPalette.primary, BabyCityPalette.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.activePill, wide && styles.widePill]}
          >
            <AppText variant="body" weight="700" style={styles.activePillText}>
              {option}
            </AppText>
          </LinearGradient>
        ) : (
          <View style={[styles.idlePill, wide && styles.widePill]}>
            <AppText variant="body" weight="600" tone="muted" style={styles.idlePillText}>
              {option}
            </AppText>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mobilityCard}>
        <View style={styles.mobilityCopy}>
          <AppText variant="bodyLarge" weight="800" style={styles.mobilityTitle}>
            {strings.hasCar}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.mobilitySubtitle}>
            {strings.availabilityPreferencesCarHint}
          </AppText>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onChange({ hasCar: !data.hasCar })}
          style={[styles.toggleTrack, data.hasCar && styles.toggleTrackActive]}
        >
          <View style={[styles.toggleThumb, data.hasCar && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>

      <View style={styles.preferencesBoard}>
        <View style={styles.boardHeader}>
          <View style={styles.boardIconWrap}>
            <MaterialIcons name="calendar-month" size={20} color={BabyCityPalette.primary} />
          </View>
          <AppText variant="h3" weight="800" style={styles.boardTitle}>
            {strings.step4Title}
          </AppText>
        </View>

        <View style={styles.preferenceCard}>
          <View style={styles.preferenceHeading}>
            <View style={styles.preferenceCopy}>
              <AppText variant="bodyLarge" weight="800" style={styles.preferenceTitle}>
                {strings.hourlyRate}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.preferenceSubtitle}>
                {strings.hourlyRateHint}
              </AppText>
            </View>
            <View style={styles.preferenceIconWrap}>
              <MaterialIcons name="payments" size={22} color={BabyCityPalette.primary} />
            </View>
          </View>

          <View style={[styles.rateInputWrap, !!errors.hourlyRate && styles.rateInputWrapError]}>
            <TextInput
              value={data.hourlyRate}
              onChangeText={value => onChange({ hourlyRate: value.replace(/[^\d]/g, '') })}
              placeholder={strings.hourlyRatePlaceholder}
              keyboardType="numeric"
              style={styles.rateInput}
              placeholderTextColor={BabyCityPalette.outline}
              textAlign="right"
            />
            <View style={styles.rateCurrencyBadge}>
              <AppText variant="bodyLarge" weight="800" style={styles.rateCurrencyText}>
                ₪
              </AppText>
            </View>
          </View>

          {errors.hourlyRate ? (
            <AppText variant="caption" tone="error" style={styles.errorText}>
              {errors.hourlyRate}
            </AppText>
          ) : null}
        </View>

        <View style={styles.preferenceCard}>
          <View style={styles.preferenceHeading}>
            <View style={styles.preferenceCopy}>
              <AppText variant="bodyLarge" weight="800" style={styles.preferenceTitle}>
                {strings.availabilityLabel}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.preferenceSubtitle}>
                {availabilitySummary}
              </AppText>
            </View>
            <View style={styles.preferenceIconWrap}>
              <MaterialIcons name="schedule" size={22} color={BabyCityPalette.primary} />
            </View>
          </View>

          <View style={styles.pillGrid}>
            {BABYSITTER_AVAILABILITY_OPTIONS.map(option =>
              renderOptionPill(
                option,
                data.availability.includes(option),
                () =>
                  onChange({
                    availability: data.availability.includes(option)
                      ? data.availability.filter(value => value !== option)
                      : [...data.availability, option],
                  })
              )
            )}
          </View>

          {errors.availability ? (
            <AppText variant="caption" tone="error" style={styles.errorText}>
              {errors.availability}
            </AppText>
          ) : null}
        </View>

        <View style={styles.preferenceCard}>
          <View style={styles.preferenceHeading}>
            <View style={styles.preferenceCopy}>
              <AppText variant="bodyLarge" weight="800" style={styles.preferenceTitle}>
                {strings.preferredLocationLabel}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.preferenceSubtitle}>
                {locationSummary}
              </AppText>
            </View>
            <View style={styles.preferenceIconWrap}>
              <MaterialIcons name="home-work" size={22} color={BabyCityPalette.primary} />
            </View>
          </View>

          <View style={styles.pillGrid}>
            {BABYSITTER_LOCATION_OPTIONS.map(option =>
              renderOptionPill(
                option,
                data.preferredLocation === option,
                () => onChange({ preferredLocation: data.preferredLocation === option ? '' : option }),
                true
              )
            )}
          </View>
        </View>

        <View style={styles.preferenceCard}>
          <View style={styles.preferenceHeading}>
            <View style={styles.preferenceCopy}>
              <AppText variant="bodyLarge" weight="800" style={styles.preferenceTitle}>
                {strings.extrasLabel}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.preferenceSubtitle}>
                {extrasSummary}
              </AppText>
            </View>
            <View style={styles.preferenceIconWrap}>
              <MaterialIcons name="auto-awesome" size={22} color={BabyCityPalette.primary} />
            </View>
          </View>

          <View style={styles.pillGrid}>
            {BABYSITTER_EXTRAS_OPTIONS.map(option =>
              renderOptionPill(
                option,
                data.extras.includes(option),
                () =>
                  onChange({
                    extras: data.extras.includes(option)
                      ? data.extras.filter(value => value !== option)
                      : [...data.extras, option],
                  }),
                true
              )
            )}
          </View>
        </View>
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <MaterialIcons name="lightbulb-outline" size={20} color={BabyCityPalette.onSecondaryContainer} />
        </View>
        <View style={styles.tipCopy}>
          <AppText variant="body" weight="700" style={styles.tipTitle}>
            {strings.availabilityPreferencesTipTitle}
          </AppText>
          <AppText variant="caption" style={styles.tipText}>
            {strings.availabilityPreferencesTipBody}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  mobilityCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderRadius: 28,
    backgroundColor: BabyCityPalette.surfaceLow,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  mobilityCopy: {
    flex: 1,
    gap: 4,
  },
  mobilityTitle: {
    color: BabyCityPalette.textPrimary,
  },
  mobilitySubtitle: {
    lineHeight: 20,
  },
  toggleTrack: {
    width: 58,
    height: 34,
    borderRadius: 999,
    backgroundColor: `${BabyCityPalette.outlineVariant}55`,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleTrackActive: {
    backgroundColor: BabyCityPalette.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  preferencesBoard: {
    borderRadius: 28,
    backgroundColor: BabyCityPalette.surfaceLowest,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    ...BabyCityShadows.soft,
  },
  boardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  boardTitle: {
    flex: 1,
    color: BabyCityPalette.textPrimary,
  },
  boardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  preferenceCard: {
    borderRadius: 24,
    backgroundColor: BabyCityPalette.surfaceLow,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  preferenceHeading: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  preferenceCopy: {
    flex: 1,
    gap: 2,
  },
  preferenceTitle: {
    color: BabyCityPalette.textPrimary,
  },
  preferenceSubtitle: {
    lineHeight: 20,
  },
  preferenceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}0e`,
  },
  rateInputWrap: {
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: BabyCityPalette.surfaceContainer,
    paddingRight: 56,
    paddingLeft: 18,
    justifyContent: 'center',
    position: 'relative',
  },
  rateInputWrapError: {
    borderWidth: 1.5,
    borderColor: BabyCityPalette.error,
    backgroundColor: BabyCityPalette.errorSoft,
  },
  rateInput: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: BabyCityPalette.textPrimary,
    paddingVertical: 14,
  },
  rateCurrencyBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    bottom: 12,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceLowest,
  },
  rateCurrencyText: {
    color: BabyCityPalette.primary,
  },
  pillGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  activePill: {
    minHeight: 42,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...BabyCityShadows.soft,
  },
  activePillText: {
    color: BabyCityPalette.onPrimary,
  },
  idlePill: {
    minHeight: 42,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceContainer,
  },
  idlePillText: {
    color: BabyCityPalette.textSecondary,
  },
  widePill: {
    minWidth: 112,
  },
  errorText: {
    marginTop: -4,
    paddingHorizontal: 2,
    textAlign: 'right',
  },
  tipCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 28,
    backgroundColor: BabyCityPalette.secondaryContainer,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  tipIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tipCopy: {
    flex: 1,
    gap: 4,
  },
  tipTitle: {
    color: BabyCityPalette.onSecondaryContainer,
  },
  tipText: {
    color: BabyCityPalette.onSecondaryContainer,
    lineHeight: 20,
  },
});
