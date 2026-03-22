import { View, StyleSheet } from 'react-native';
import { BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import AppText from '@/components/ui/AppText';
import LabeledInput from './LabeledInput';
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

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  errors?: Partial<Record<'bio', string>>;
};

export default function Step2About({ data, onChange, errors = {} }: Props) {
  const charsLeft = BIO_MAX - data.bio.length;
  const isNearLimit = charsLeft <= 30;

  return (
    <View>
      <LabeledInput
        label={strings.shortBio}
        value={data.bio}
        onChange={v => onChange({ bio: v })}
        placeholder={strings.bioPlaceholder}
        multiline
        maxLength={BIO_MAX}
        errorText={errors.bio}
      />
      {/* Character counter shown below the bio input */}
      <AppText style={[styles.charCount, isNearLimit && styles.charCountWarning]}>
        {charsLeft}
      </AppText>

      <SectionLabel text={strings.personalityTagsLabel} />
      <TagSelector
        options={PERSONALITY_OPTIONS}
        selected={data.personalityTags}
        onChange={v => onChange({ personalityTags: v })}
        tone="peach"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  charCount: {
    alignSelf: 'flex-end',
    color: BabyCityPalette.textSecondary,
    marginTop: -8,
    marginBottom: 18,
    backgroundColor: BabyCityPalette.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  charCountWarning: {
    color: BabyCityPalette.error,
    backgroundColor: BabyCityPalette.errorSoft,
  },
});
