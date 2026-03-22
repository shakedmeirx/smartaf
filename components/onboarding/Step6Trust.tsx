import { View, StyleSheet } from 'react-native';
import AppText from '@/components/ui/AppText';
import { BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import ToggleRow from './ToggleRow';

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
};

// A static info box for features that aren't available until after registration.
function PendingBox({ title, note }: { title: string; note: string }) {
  return (
    <View style={styles.pendingBox}>
      <View style={styles.pendingLeft}>
        <AppText variant="caption" weight="700" style={styles.pendingBadge}>
          {strings.comingSoon}
        </AppText>
      </View>
      <View style={styles.pendingRight}>
        <AppText variant="bodyLarge" weight="800" style={styles.pendingTitle}>
          {title}
        </AppText>
        <AppText style={styles.pendingNote}>{note}</AppText>
      </View>
    </View>
  );
}

export default function Step6Trust({ data, onChange }: Props) {
  return (
    <View>
      <ToggleRow
        label={strings.firstAid}
        value={data.hasFirstAid}
        onChange={v => onChange({ hasFirstAid: v })}
        tone="green"
      />
      <ToggleRow
        label={strings.hasReferencesLabel}
        value={data.hasReferences}
        onChange={v => onChange({ hasReferences: v })}
        tone="green"
      />

      <View style={styles.pendingSection}>
        <PendingBox
          title={strings.idVerification}
          note={strings.idVerificationNote}
        />
        <PendingBox
          title={strings.phoneVerification}
          note={strings.phoneVerificationNote}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingSection: {
    marginTop: 24,
    gap: 12,
  },
  pendingBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: BabyCityPalette.surface,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  pendingRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  pendingLeft: {
    paddingTop: 2,
  },
  pendingTitle: {
    color: BabyCityPalette.textPrimary,
    marginBottom: 4,
  },
  pendingNote: {
    color: BabyCityPalette.textSecondary,
    lineHeight: 21,
  },
  pendingBadge: {
    color: BabyCityPalette.success,
    backgroundColor: BabyCityPalette.successSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
