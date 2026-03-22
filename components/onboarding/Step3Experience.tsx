import { View } from 'react-native';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import SectionLabel from './SectionLabel';
import HintText from './HintText';
import TagSelector from './TagSelector';
import ToggleRow from './ToggleRow';

const YEARS_OPTIONS = ['פחות משנה', '1–2 שנים', '3–5 שנים', 'מעל 5 שנים'];
const AGE_GROUP_OPTIONS = ['תינוקות (0–1)', 'פעוטות (1–3)', 'גיל הגן (3–6)', 'גיל בית ספר (6–10)', 'מתבגרים (10+)'];
const CERTIFICATION_OPTIONS = ['עזרה ראשונה', 'מצילות/מציל', 'הוראה / חינוך', 'גן ילדים', 'אחות/אח סיעודי'];
const SUPERPOWER_OPTIONS = ['בישול', 'אמנות ויצירה', 'מוזיקה', 'ספורט', 'קריאת סיפורים', 'טבע ובעלי חיים'];

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  errors?: Partial<Record<'yearsExperience' | 'ageGroups', string>>;
};

export default function Step3Experience({ data, onChange, errors = {} }: Props) {
  return (
    <View>
      <SectionLabel text={strings.yearsExperience} />
      <HintText text={strings.yearsExperienceHint} />
      <TagSelector
        options={YEARS_OPTIONS}
        selected={data.yearsExperience ? [data.yearsExperience] : []}
        onChange={v => onChange({ yearsExperience: v[0] ?? '' })}
        singleSelect
        errorText={errors.yearsExperience}
        tone="lavender"
      />

      <SectionLabel text={strings.ageGroupsLabel} />
      <HintText text={strings.ageGroupsHint} />
      <TagSelector
        options={AGE_GROUP_OPTIONS}
        selected={data.ageGroups}
        onChange={v => onChange({ ageGroups: v })}
        errorText={errors.ageGroups}
        tone="lavender"
      />

      <SectionLabel text={strings.certificationsLabel} />
      <TagSelector
        options={CERTIFICATION_OPTIONS}
        selected={data.certifications}
        onChange={v => onChange({ certifications: v })}
        tone="lavender"
      />

      <ToggleRow
        label={strings.specialNeedsExperience}
        value={data.specialNeeds}
        onChange={v => onChange({ specialNeeds: v })}
        hint={strings.specialNeedsHint}
        tone="lavender"
      />

      <SectionLabel text={strings.superpowersLabel} />
      <HintText text={strings.superpowersHint} />
      <TagSelector
        options={SUPERPOWER_OPTIONS}
        selected={data.superpowers}
        onChange={v => onChange({ superpowers: v })}
        tone="lavender"
      />
    </View>
  );
}
