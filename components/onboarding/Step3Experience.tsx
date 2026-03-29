import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import HintText from './HintText';
import AppText from '@/components/ui/AppText';

const YEARS_OPTIONS = ['פחות משנה', '1–2 שנים', '3–5 שנים', 'מעל 5 שנים'];
const AGE_GROUP_OPTIONS = ['תינוקות (0–1)', 'פעוטות (1–3)', 'גיל הגן (3–6)', 'גיל בית ספר (6–10)', 'מתבגרים (10+)'];
const CERTIFICATION_OPTIONS = ['עזרה ראשונה', 'מצילות/מציל', 'הוראה / חינוך', 'גן ילדים', 'אחות/אח סיעודי'];
const SUPERPOWER_OPTIONS = ['בישול', 'אמנות ויצירה', 'מוזיקה', 'ספורט', 'קריאת סיפורים', 'טבע ובעלי חיים'];

const CERTIFICATION_META: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; description: string }> = {
  'עזרה ראשונה': { icon: 'medical-services', description: 'הכשרה רפואית בתוקף' },
  'מצילות/מציל': { icon: 'pool', description: 'ערנות ובטיחות סביב מים' },
  'הוראה / חינוך': { icon: 'menu-book', description: 'ליווי לימודי וחינוכי' },
  'גן ילדים': { icon: 'child-care', description: 'ניסיון במסגרת לגיל הרך' },
  'אחות/אח סיעודי': { icon: 'healing', description: 'רקע טיפולי מקצועי' },
};

const SUPERPOWER_META: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; description: string }> = {
  בישול: { icon: 'restaurant', description: 'הכנת ארוחות מזינות' },
  'אמנות ויצירה': { icon: 'palette', description: 'פעילויות יצירה ומשחק' },
  מוזיקה: { icon: 'music-note', description: 'שירים, קצב והפעלות' },
  ספורט: { icon: 'sports-handball', description: 'הוצאת אנרגיה בתנועה' },
  'קריאת סיפורים': { icon: 'auto-stories', description: 'שגרות שקטות ומחבקות' },
  'טבע ובעלי חיים': { icon: 'pets', description: 'חיבור לחוץ ולסקרנות' },
};

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  errors?: Partial<Record<'yearsExperience' | 'ageGroups', string>>;
};

export default function Step3Experience({ data, onChange, errors = {} }: Props) {
  function toggleSingle(selectedValue: string, option: string, key: 'yearsExperience') {
    onChange({ [key]: selectedValue === option ? '' : option } as Partial<OnboardingData>);
  }

  function toggleMulti(selectedValues: string[], option: string, key: 'ageGroups' | 'certifications' | 'superpowers') {
    const next = selectedValues.includes(option)
      ? selectedValues.filter(value => value !== option)
      : [...selectedValues, option];
    onChange({ [key]: next } as Partial<OnboardingData>);
  }

  function renderExperienceChip(option: string) {
    const selected = data.yearsExperience === option;
    return (
      <TouchableOpacity
        key={option}
        activeOpacity={0.9}
        onPress={() => toggleSingle(data.yearsExperience, option, 'yearsExperience')}
      >
        {selected ? (
          <LinearGradient
            colors={[BabyCityPalette.primary, BabyCityPalette.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activePill}
          >
            <AppText variant="body" weight="700" style={styles.activePillText}>
              {option}
            </AppText>
          </LinearGradient>
        ) : (
          <View style={styles.idlePill}>
            <AppText variant="body" weight="600" tone="muted" style={styles.idlePillText}>
              {option}
            </AppText>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function renderAgeChip(option: string) {
    const selected = data.ageGroups.includes(option);
    return (
      <TouchableOpacity
        key={option}
        activeOpacity={0.9}
        onPress={() => toggleMulti(data.ageGroups, option, 'ageGroups')}
      >
        {selected ? (
          <LinearGradient
            colors={[BabyCityPalette.primary, BabyCityPalette.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeAgePill}
          >
            <MaterialIcons name="check" size={16} color="#ffffff" />
            <AppText variant="body" weight="700" style={styles.activePillText}>
              {option}
            </AppText>
          </LinearGradient>
        ) : (
          <View style={styles.idleAgePill}>
            <AppText variant="body" weight="600" tone="muted" style={styles.idlePillText}>
              {option}
            </AppText>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function renderSpecialtyCard(
    option: string,
    selected: boolean,
    toggle: () => void,
    meta: { icon: keyof typeof MaterialIcons.glyphMap; description: string }
  ) {
    return (
      <TouchableOpacity
        key={option}
        activeOpacity={0.92}
        onPress={toggle}
        style={[styles.specialtyCard, selected && styles.specialtyCardActive]}
      >
        {selected ? (
          <View style={styles.specialtyCheck}>
            <MaterialIcons name="check-circle" size={18} color={BabyCityPalette.primary} />
          </View>
        ) : null}

        <View style={[styles.specialtyIconWrap, selected && styles.specialtyIconWrapActive]}>
          <MaterialIcons
            name={meta.icon}
            size={24}
            color={selected ? BabyCityPalette.primary : BabyCityPalette.textSecondary}
          />
        </View>

        <AppText variant="bodyLarge" weight="800" style={styles.specialtyTitle}>
          {option}
        </AppText>
        <AppText variant="caption" tone="muted" style={styles.specialtyDescription}>
          {meta.description}
        </AppText>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <AppText variant="bodyLarge" weight="800" style={styles.sectionTitle}>
          {strings.yearsExperience}
        </AppText>
        <HintText text={strings.yearsExperienceHint} />
        <View style={styles.experienceRow}>
          {YEARS_OPTIONS.map(renderExperienceChip)}
        </View>
        {errors.yearsExperience ? (
          <AppText variant="caption" tone="error" style={styles.errorText}>
            {errors.yearsExperience}
          </AppText>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <MaterialIcons name="child-care" size={22} color={BabyCityPalette.primary} />
          <AppText variant="bodyLarge" weight="800" style={styles.sectionTitle}>
            {strings.ageGroupsLabel}
          </AppText>
        </View>
        <HintText text={strings.ageGroupsHint} />
        <View style={styles.ageRow}>
          {AGE_GROUP_OPTIONS.map(renderAgeChip)}
        </View>
        {errors.ageGroups ? (
          <AppText variant="caption" tone="error" style={styles.errorText}>
            {errors.ageGroups}
          </AppText>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <MaterialIcons name="star-outline" size={22} color={BabyCityPalette.primary} />
          <AppText variant="bodyLarge" weight="800" style={styles.sectionTitle}>
            {strings.step3Title}
          </AppText>
        </View>

        <View style={styles.specialtyGrid}>
          {CERTIFICATION_OPTIONS.map(option =>
            renderSpecialtyCard(
              option,
              data.certifications.includes(option),
              () => toggleMulti(data.certifications, option, 'certifications'),
              CERTIFICATION_META[option]
            )
          )}

          {renderSpecialtyCard(
            strings.specialNeedsExperience,
            data.specialNeeds,
            () => onChange({ specialNeeds: !data.specialNeeds }),
            { icon: 'accessibility-new', description: strings.specialNeedsHint }
          )}

          {SUPERPOWER_OPTIONS.map(option =>
            renderSpecialtyCard(
              option,
              data.superpowers.includes(option),
              () => toggleMulti(data.superpowers, option, 'superpowers'),
              SUPERPOWER_META[option]
            )
          )}
        </View>
      </View>

      <View style={styles.editorialCard}>
        <View style={styles.editorialImage}>
          <MaterialIcons name="auto-awesome" size={28} color={BabyCityPalette.primary} />
        </View>
        <View style={styles.editorialBody}>
          <AppText variant="body" weight="700" style={styles.editorialQuote}>
            {strings.babysitterSkillsQuote}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.editorialAttribution}>
            {strings.babysitterSkillsAttribution}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 22,
  },
  section: {
    gap: 8,
  },
  sectionHeadingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  experienceRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  ageRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  activePill: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAgePill: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
  },
  activePillText: {
    color: '#ffffff',
    textAlign: 'right',
  },
  idlePill: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  idleAgePill: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  idlePillText: {
    textAlign: 'right',
  },
  specialtyGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 14,
  },
  specialtyCard: {
    width: '47%',
    minHeight: 150,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  specialtyCardActive: {
    borderColor: BabyCityPalette.primary,
  },
  specialtyCheck: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  specialtyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: BabyCityPalette.inputRecessedBg,
  },
  specialtyIconWrapActive: {
    backgroundColor: `${BabyCityPalette.primaryContainer}33`,
  },
  specialtyTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    marginBottom: 4,
  },
  specialtyDescription: {
    textAlign: 'right',
    lineHeight: 18,
  },
  editorialCard: {
    marginTop: 6,
    borderRadius: 24,
    backgroundColor: BabyCityPalette.surfaceLow,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  editorialImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: BabyCityPalette.surfaceLowest,
    backgroundColor: BabyCityPalette.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialBody: {
    flex: 1,
    alignItems: 'flex-end',
  },
  editorialQuote: {
    color: BabyCityPalette.primary,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  editorialAttribution: {
    marginTop: 3,
    textAlign: 'right',
  },
  errorText: {
    marginTop: 4,
    textAlign: 'right',
    paddingHorizontal: 2,
  },
});
