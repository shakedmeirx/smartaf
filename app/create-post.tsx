import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import AppTextArea from '@/components/ui/AppTextArea';
import TagSelector from '@/components/onboarding/TagSelector';
import AppText from '@/components/ui/AppText';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { BabyCityGeometry, BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { normalizeTimeValue } from '@/lib/time';

const NUM_CHILDREN_OPTIONS = ['1', '2', '3', '4+'];
const AGE_RANGE_VALUES = {
  infants: 'תינוקות (0–1)',
  toddlers: 'פעוטות (1–3)',
  preschool: 'גן (3–6)',
  school: 'גיל בית ספר (6+)',
} as const;

export default function CreatePostScreen() {
  const { addPost, updatePost, myPosts, refreshParentData } = useAppState();
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const theme = getRoleTheme('parent');
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const isEditMode = Boolean(postId);

  const [note, setNote]               = useState('');
  const [area, setArea]               = useState('');
  const [date, setDate]               = useState('');
  const [time, setTime]               = useState('');
  const [numChildren, setNumChildren] = useState<string[]>([]);
  const [ageRange, setAgeRange]       = useState<string[]>([]);

  const [noteError,   setNoteError]   = useState('');
  const [areaError,   setAreaError]   = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const requestedEditPostRef = useRef(false);
  const hydratedPostIdRef = useRef<string | null>(null);

  const areaRef = useRef<TextInput>(null);
  const ageRangeOptions = useMemo(
    () => [
      { label: strings.ageRangeOptionInfants, value: AGE_RANGE_VALUES.infants },
      { label: strings.ageRangeOptionToddlers, value: AGE_RANGE_VALUES.toddlers },
      { label: strings.ageRangeOptionPreschool, value: AGE_RANGE_VALUES.preschool },
      { label: strings.ageRangeOptionSchool, value: AGE_RANGE_VALUES.school },
    ],
    [
      strings.ageRangeOptionInfants,
      strings.ageRangeOptionToddlers,
      strings.ageRangeOptionPreschool,
      strings.ageRangeOptionSchool,
    ]
  );
  const editingPost = useMemo(
    () => (postId ? myPosts.find(post => post.id === postId) ?? null : null),
    [myPosts, postId]
  );

  useEffect(() => {
    if (!postId || editingPost || requestedEditPostRef.current) {
      return;
    }

    requestedEditPostRef.current = true;
    void refreshParentData();
  }, [editingPost, postId, refreshParentData]);

  useEffect(() => {
    if (!editingPost || hydratedPostIdRef.current === editingPost.id) {
      return;
    }

    setNote(editingPost.note);
    setArea(editingPost.area);
    setDate(editingPost.date ?? '');
    setTime(normalizeTimeValue(editingPost.time));
    setNumChildren(editingPost.numChildren !== null ? [String(editingPost.numChildren)] : []);
    setAgeRange(
      editingPost.childAgeRange.map(
        value => ageRangeOptions.find(option => option.value === value)?.label ?? value
      )
    );
    setNoteError('');
    setAreaError('');
    setSubmitError('');
    hydratedPostIdRef.current = editingPost.id;
  }, [ageRangeOptions, editingPost]);

  function validate(): boolean {
    let ok = true;
    if (!note.trim()) { setNoteError(strings.postNoteRequired); ok = false; }
    if (!area.trim()) { setAreaError(strings.postAreaRequired); ok = false; }
    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      setSubmitting(true);
      setSubmitError('');
      const draft = {
        note:          note.trim(),
        area:          area.trim(),
        date:          date.trim() || null,
        time:          time.trim() || null,
        numChildren:   numChildren[0] != null ? parseInt(numChildren[0], 10) : null,
        childAgeRange: ageRange.map(
          option => ageRangeOptions.find(item => item.label === option)?.value ?? option
        ),
      };
      const result =
        isEditMode && postId
          ? await updatePost(postId, draft)
          : await addPost(draft);

      if (!result.success) {
        setSubmitError(
          result.errorMessage ?? (isEditMode ? strings.postUpdateError : strings.postSubmitError)
        );
        return;
      }

      await refreshParentData();
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title={isEditMode ? strings.editPostTitle : strings.createPostTitle}
      activeTab="home"
      backgroundColor={theme.screenBackground}
      showBackButton
      backButtonVariant="icon"
      onBack={() => router.back()}
      bottomOverlay={
        <LinearGradient
          colors={['rgba(248,250,255,0)', 'rgba(248,250,255,0.92)', '#f8faff']}
          locations={[0, 0.35, 1]}
          style={styles.bottomOverlay}
        >
          <AppPrimaryButton
            label={isEditMode ? strings.postUpdate : strings.postSubmit}
            size="lg"
            loading={submitting}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />
        </LinearGradient>
      }
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.screen}>
          <View style={styles.backdropOrbTop} />
          <View style={styles.backdropOrbBottom} />
          <AppScreen
            scrollable
            backgroundColor={theme.screenBackground}
            contentContainerStyle={styles.screenContent}
            scrollProps={{
              keyboardShouldPersistTaps: 'handled',
              showsVerticalScrollIndicator: false,
            }}
          >
            <View style={styles.heroSection}>
              <AppText variant="body" style={[styles.heroSubtitle, { color: theme.subtitle }]}>
                {isEditMode ? strings.editPostHeroSubtitle : strings.postHeroSubtitle}
              </AppText>
            </View>

            <AppCard style={styles.editorialCard}>
              <View style={styles.sectionIconHeader}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="edit-note" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.postDetailsSectionTitle}</AppText>
              </View>

              <AppTextArea
                value={note}
                onChangeText={text => { setNote(text); if (noteError) setNoteError(''); }}
                placeholder={strings.postNotePlaceholder}
                returnKeyType="next"
                onSubmitEditing={() => areaRef.current?.focus()}
                error={noteError}
                containerStyle={styles.fieldBlock}
                inputWrapStyle={styles.editorialTextAreaWrap}
              />
            </AppCard>

            <View style={styles.logisticsRow}>
              <AppCard style={[styles.editorialCard, styles.logisticsCard]}>
                <View style={styles.sectionIconHeader}>
                  <View style={styles.sectionIconChip}>
                    <MaterialIcons name="calendar-today" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="bodyLarge" weight="700">
                    {`${strings.postDate} / ${strings.postTime}`}
                  </AppText>
                </View>

                <DateTimePicker
                  mode="date"
                  label={strings.postDate}
                  value={date}
                  onChange={setDate}
                  optional
                />

                <DateTimePicker
                  mode="time"
                  label={strings.postTime}
                  value={time}
                  onChange={setTime}
                  optional
                />
              </AppCard>

              <AppCard style={[styles.editorialCard, styles.logisticsCard]}>
                <View style={styles.sectionIconHeader}>
                  <View style={styles.sectionIconChip}>
                    <MaterialIcons name="location-on" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="bodyLarge" weight="700">{strings.postArea}</AppText>
                </View>

                <AppInput
                  ref={areaRef}
                  value={area}
                  onChangeText={text => { setArea(text); if (areaError) setAreaError(''); }}
                  placeholder={strings.postAreaPlaceholder}
                  returnKeyType="done"
                  error={areaError}
                  recessed
                  containerStyle={styles.fieldBlock}
                />
              </AppCard>
            </View>

            <AppCard style={styles.editorialCard}>
              <View style={styles.sectionIconHeader}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="child-care" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="700">{strings.postFamilySectionTitle}</AppText>
              </View>

              <View style={styles.fieldBlock}>
                <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                  {strings.postNumChildren}
                </AppText>
                <View style={styles.countSelectorWrap}>
                  {NUM_CHILDREN_OPTIONS.map(option => {
                    const isSelected = numChildren.includes(option);
                    return (
                      <TouchableOpacity
                        key={option}
                        accessibilityRole="button"
                        activeOpacity={0.88}
                        onPress={() => setNumChildren(isSelected ? [] : [option])}
                        style={[
                          styles.countOption,
                          isSelected && styles.countOptionSelected,
                        ]}
                      >
                        <AppText
                          variant="body"
                          weight={isSelected ? '800' : '700'}
                          style={[
                            styles.countOptionText,
                            isSelected && styles.countOptionTextSelected,
                          ]}
                        >
                          {option}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                  {strings.postChildAgeRange}
                </AppText>
                <TagSelector
                  options={ageRangeOptions.map(option => option.label)}
                  selected={ageRange}
                  onChange={setAgeRange}
                  tone="green"
                />
              </View>
            </AppCard>

            {submitError ? (
              <AppText variant="body" tone="error" style={styles.errorText}>
                {submitError}
              </AppText>
            ) : null}
          </AppScreen>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: -32,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${BabyCityPalette.primary}14`,
  },
  backdropOrbBottom: {
    position: 'absolute',
    left: -56,
    bottom: 124,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  screenContent: {
    paddingBottom: 168,
  },
  heroSection: {
    paddingHorizontal: 6,
    paddingTop: 6,
    marginBottom: 18,
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 24,
    color: BabyCityPalette.textSecondary,
  },
  editorialCard: {
    marginBottom: 16,
    gap: 16,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  logisticsRow: {
    gap: 16,
  },
  logisticsCard: {
    width: '100%',
  },
  sectionIconHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionIconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${BabyCityPalette.primary}0d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBlock: {
    marginTop: 2,
  },
  fieldLabel: {
    marginBottom: 10,
    color: BabyCityPalette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editorialTextAreaWrap: {
    minHeight: 140,
    borderRadius: 20,
    backgroundColor: BabyCityPalette.inputRecessedBg,
    borderWidth: 0,
    paddingTop: BabyCityGeometry.spacing.md,
  },
  countSelectorWrap: {
    flexDirection: 'row-reverse',
    gap: 8,
    backgroundColor: BabyCityPalette.inputRecessedBg,
    borderRadius: 22,
    padding: 6,
  },
  countOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countOptionSelected: {
    backgroundColor: BabyCityPalette.primary,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  countOptionText: {
    color: BabyCityPalette.textSecondary,
  },
  countOptionTextSelected: {
    color: '#ffffff',
  },
  errorText: {
    marginBottom: 16,
  },
  bottomOverlay: {
    paddingHorizontal: 2,
    paddingTop: 20,
    paddingBottom: 4,
  },
  submitButton: {
    marginTop: 0,
  },
});
