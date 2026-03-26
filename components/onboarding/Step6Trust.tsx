import { View } from 'react-native';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import ToggleRow from './ToggleRow';

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
};

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
    </View>
  );
}
