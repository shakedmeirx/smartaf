import { View, StyleSheet, TextInput } from 'react-native';
import { BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import AppText from '@/components/ui/AppText';
import SectionLabel from './SectionLabel';
import TagSelector from './TagSelector';

const PERSONALITY_OPTIONS = [
  'סבלני/ת',
  'אנרגטי/ת',
  'יצירתי/ת',
  'אחראי/ת',
  'שקט/ה',
  'משעשע/ת',
  'מסור/ה',
  'חם/ה',
];

const BIO_MAX = 250;
const MIN_BIO_LENGTH = 30;

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  errors?: Partial<Record<'bio', string>>;
};

export default function Step2About({ data, onChange, errors = {} }: Props) {
  const charsUsed = data.bio.length;
  const isNearLimit = BIO_MAX - charsUsed <= 30;

  return (
    <View style={styles.container}>
      <View style={styles.accentBubble} />

      <View style={styles.fieldBlock}>
        <AppText variant="bodyLarge" weight="800" style={styles.fieldTitle}>
          {strings.shortBio}
        </AppText>

        <TextInput
          value={data.bio}
          onChangeText={v => onChange({ bio: v })}
          placeholder={strings.bioPlaceholder}
          multiline
          maxLength={BIO_MAX}
          style={[styles.textArea, !!errors.bio && styles.textAreaError]}
          placeholderTextColor={BabyCityPalette.outline}
          textAlign="right"
          textAlignVertical="top"
        />

        <View style={styles.counterRow}>
          <AppText variant="caption" tone="muted" style={styles.counterText}>
            {strings.bioMinHint(MIN_BIO_LENGTH)}
          </AppText>
          <AppText
            variant="caption"
            tone={isNearLimit ? 'error' : 'muted'}
            style={styles.counterText}
          >
            {`${charsUsed} / ${BIO_MAX}`}
          </AppText>
        </View>

        {errors.bio ? (
          <AppText variant="caption" tone="error" style={styles.errorText}>
            {errors.bio}
          </AppText>
        ) : null}
      </View>

      <View style={styles.tagsBlock}>
        <SectionLabel text={strings.personalityTagsLabel} />
        <TagSelector
          options={PERSONALITY_OPTIONS}
          selected={data.personalityTags}
          onChange={v => onChange({ personalityTags: v })}
          tone="peach"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  accentBubble: {
    position: 'absolute',
    top: -18,
    left: -18,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: BabyCityPalette.secondaryContainer,
    opacity: 0.35,
  },
  fieldBlock: {
    position: 'relative',
  },
  fieldTitle: {
    marginBottom: 12,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  textArea: {
    minHeight: 160,
    borderRadius: 24,
    backgroundColor: BabyCityPalette.inputRecessedBg,
    color: BabyCityPalette.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    lineHeight: 24,
  },
  textAreaError: {
    borderWidth: 1.5,
    borderColor: BabyCityPalette.error,
    backgroundColor: BabyCityPalette.errorSoft,
  },
  counterRow: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  counterText: {
    lineHeight: 18,
  },
  errorText: {
    marginTop: 8,
    paddingHorizontal: 2,
    textAlign: 'right',
  },
  tagsBlock: {
    marginTop: 18,
  },
});
