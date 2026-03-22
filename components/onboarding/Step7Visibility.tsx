import { View, StyleSheet } from 'react-native';
import AppText from '@/components/ui/AppText';
import { BabyCityPalette } from '@/constants/theme';
import { formatBirthDateForDisplay } from '@/lib/birthDate';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import ToggleRow from './ToggleRow';

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  showReviewSummary?: boolean;
};

// A single row in the review summary table.
function ReviewRow({ label, value }: { label: string; value: string }) {
  const isEmpty = !value || value.trim() === '';
  return (
    <View style={styles.reviewRow}>
      <AppText style={styles.reviewLabel}>{label}</AppText>
      <AppText variant="bodyLarge" weight="700" style={[styles.reviewValue, isEmpty && styles.reviewValueEmpty]}>
        {isEmpty ? strings.notFilled : value}
      </AppText>
    </View>
  );
}

export default function Step7Visibility({ data, onChange, showReviewSummary = true }: Props) {
  return (
    <View>
      <ToggleRow
        label={strings.acceptingRequestsLabel}
        value={data.acceptingRequests}
        onChange={v => onChange({ acceptingRequests: v })}
        tone="green"
      />
      <ToggleRow
        label={strings.notificationsLabel}
        value={data.notifications}
        onChange={v => onChange({ notifications: v })}
        tone="green"
      />
      <ToggleRow
        label={strings.profileVisibleLabel}
        value={data.profileVisible}
        onChange={v => onChange({ profileVisible: v })}
        tone="green"
      />

      {/* Review summary — shows the values the user filled in across all steps */}
      {showReviewSummary ? (
        <>
          <View style={styles.reviewBox}>
            <AppText variant="h3" weight="800" style={styles.reviewTitle}>
              {strings.reviewTitle}
            </AppText>

            <ReviewRow label={strings.reviewName} value={data.firstName} />
            <ReviewRow label={strings.reviewCity} value={data.city} />
            <ReviewRow label={strings.reviewBirthDate} value={formatBirthDateForDisplay(data.birthDate)} />
            <ReviewRow
              label={strings.reviewLanguages}
              value={data.languages.join(', ')}
            />
            <ReviewRow
              label={strings.reviewExperience}
              value={data.yearsExperience}
            />
            <ReviewRow
              label={strings.reviewRate}
              value={data.hourlyRate ? `₪${data.hourlyRate}` : ''}
            />
            <ReviewRow
              label={strings.reviewAvailability}
              value={data.availability.join(', ')}
            />
          </View>

          <AppText style={styles.finishNote}>{strings.reviewNote}</AppText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  reviewBox: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: BabyCityPalette.surface,
  },
  reviewTitle: {
    color: BabyCityPalette.textPrimary,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: BabyCityPalette.surfaceMuted,
  },
  reviewRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  reviewLabel: {
    color: BabyCityPalette.textSecondary,
    width: '100%',
    marginBottom: 6,
  },
  reviewValue: {
    color: BabyCityPalette.textPrimary,
    width: '100%',
    lineHeight: 26,
  },
  reviewValueEmpty: {
    color: BabyCityPalette.textTertiary,
  },
  finishNote: {
    color: BabyCityPalette.textSecondary,
    marginTop: 16,
    lineHeight: 21,
  },
});
