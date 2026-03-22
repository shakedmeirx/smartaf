import { View } from 'react-native';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import LabeledInput from './LabeledInput';
import BirthdayField from './BirthdayField';
import SectionLabel from './SectionLabel';
import TagSelector from './TagSelector';
import AddressLocationField from '@/components/ui/AddressLocationField';

const LANGUAGE_OPTIONS = ['עברית', 'אנגלית', 'ערבית', 'רוסית', 'אמהרית', 'צרפתית', 'ספרדית'];

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  errors?: Partial<Record<'firstName' | 'city' | 'addressFull' | 'birthDate' | 'languages', string>>;
};

export default function Step1BasicInfo({ data, onChange, errors = {} }: Props) {
  return (
    <View>
      <LabeledInput
        label={strings.firstName}
        value={data.firstName}
        onChange={v => onChange({ firstName: v })}
        placeholder={strings.firstNamePlaceholder}
        returnKeyType="next"
        autoFocus
        errorText={errors.firstName}
      />
      <AddressLocationField
        value={data.addressFull}
        onChange={v => onChange({ addressFull: v })}
        onCoordinatesObtained={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
        onCityChange={v => onChange({ city: v })}
        errorText={errors.addressFull}
      />
      <BirthdayField
        label={strings.birthDate}
        value={data.birthDate}
        onChange={v => onChange({ birthDate: v })}
        errorText={errors.birthDate}
      />
      <SectionLabel text={strings.spokenLanguages} />
      <TagSelector
        options={LANGUAGE_OPTIONS}
        selected={data.languages}
        onChange={v => onChange({ languages: v })}
        errorText={errors.languages}
        tone="blue"
      />
    </View>
  );
}
