import { View } from 'react-native';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import LabeledInput from './LabeledInput';
import HintText from './HintText';
import SectionLabel from './SectionLabel';
import TagSelector from './TagSelector';
import ToggleRow from './ToggleRow';
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
  return (
    <View>
      <LabeledInput
        label={strings.hourlyRate}
        value={data.hourlyRate}
        onChange={v => onChange({ hourlyRate: v })}
        placeholder={strings.hourlyRatePlaceholder}
        keyboardType="numeric"
        returnKeyType="done"
        errorText={errors.hourlyRate}
      />
      <HintText text={strings.hourlyRateHint} />

      <SectionLabel text={strings.availabilityLabel} />
      <TagSelector
        options={BABYSITTER_AVAILABILITY_OPTIONS}
        selected={data.availability}
        onChange={v => onChange({ availability: v })}
        errorText={errors.availability}
        tone="lavender"
      />

      <SectionLabel text={strings.extrasLabel} />
      <HintText text={strings.extrasHint} />
      <TagSelector
        options={BABYSITTER_EXTRAS_OPTIONS}
        selected={data.extras}
        onChange={v => onChange({ extras: v })}
        tone="lavender"
      />

      <SectionLabel text={strings.preferredLocationLabel} />
      <TagSelector
        options={BABYSITTER_LOCATION_OPTIONS}
        selected={data.preferredLocation ? [data.preferredLocation] : []}
        onChange={v => onChange({ preferredLocation: v[0] ?? '' })}
        singleSelect
        tone="lavender"
      />

      <ToggleRow
        label={strings.hasCar}
        value={data.hasCar}
        onChange={v => onChange({ hasCar: v })}
        tone="lavender"
      />
    </View>
  );
}
