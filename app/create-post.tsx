import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import AppTextArea from '@/components/ui/AppTextArea';
import SectionLabel from '@/components/onboarding/SectionLabel';
import TagSelector from '@/components/onboarding/TagSelector';
import AppText from '@/components/ui/AppText';
import DateTimePicker from '@/components/ui/DateTimePicker';
import SectionHeader from '@/components/ui/SectionHeader';
import { BabyCityGeometry, BabyCityPalette, ParentDesignTokens, getRoleTheme } from '@/constants/theme';
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
  const ageRangeOptions = [
    { label: strings.ageRangeOptionInfants, value: AGE_RANGE_VALUES.infants },
    { label: strings.ageRangeOptionToddlers, value: AGE_RANGE_VALUES.toddlers },
    { label: strings.ageRangeOptionPreschool, value: AGE_RANGE_VALUES.preschool },
    { label: strings.ageRangeOptionSchool, value: AGE_RANGE_VALUES.school },
  ];
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
      onBack={() => router.back()}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <AppScreen
          scrollable
          backgroundColor={theme.screenBackground}
          scrollProps={{
            keyboardShouldPersistTaps: 'handled',
            showsVerticalScrollIndicator: false,
          }}
        >
          <AppCard
            role="parent"
            variant="hero"
            backgroundColor={theme.highlightedSurface}
            borderColor="transparent"
            style={styles.heroCard}
          >
            <AppText variant="caption" weight="700" style={[styles.heroEyebrow, { color: theme.filterAccent }]}>
              {isEditMode ? strings.editPostHeroEyebrow : strings.postHeroEyebrow}
            </AppText>
            <AppText variant="h1" weight="800" style={[styles.heroTitle, { color: theme.title }]}>
              {isEditMode ? strings.editPostHeroTitle : strings.postHeroTitle}
            </AppText>
            <AppText style={[styles.heroSubtitle, { color: theme.subtitle }]}>
              {isEditMode ? strings.editPostHeroSubtitle : strings.postHeroSubtitle}
            </AppText>
          </AppCard>

          <AppCard style={styles.sectionCard}>
            <SectionHeader title={strings.postDetailsSectionTitle} />

            <AppTextArea
              label={strings.postNote}
              value={note}
              onChangeText={text => { setNote(text); if (noteError) setNoteError(''); }}
              placeholder={strings.postNotePlaceholder}
              returnKeyType="next"
              onSubmitEditing={() => areaRef.current?.focus()}
              error={noteError}
              inputWrapStyle={{ backgroundColor: BabyCityPalette.inputRecessedBg, borderWidth: 0, borderRadius: BabyCityGeometry.radius.control }}
            />

            <AppInput
              ref={areaRef}
              label={strings.postArea}
              value={area}
              onChangeText={text => { setArea(text); if (areaError) setAreaError(''); }}
              placeholder={strings.postAreaPlaceholder}
              returnKeyType="done"
              error={areaError}
              recessed
            />

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

          <AppCard style={styles.sectionCard}>
            <SectionHeader
              title={strings.postFamilySectionTitle}
              subtitle={strings.postOptionalHint}
            />

            <SectionLabel text={strings.postNumChildren} />
            <TagSelector
              options={NUM_CHILDREN_OPTIONS}
              selected={numChildren}
              onChange={setNumChildren}
              singleSelect
              tone="lavender"
            />

            <SectionLabel text={strings.postChildAgeRange} />
            <TagSelector
              options={ageRangeOptions.map(option => option.label)}
              selected={ageRange}
              onChange={setAgeRange}
              tone="green"
            />
          </AppCard>

          {submitError ? (
            <AppText variant="body" tone="error" style={styles.errorText}>
              {submitError}
            </AppText>
          ) : null}

          <AppPrimaryButton
            label={isEditMode ? strings.postUpdate : strings.postSubmit}
            size="lg"
            loading={submitting}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />
        </AppScreen>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroEyebrow: {
    marginBottom: 8,
  },
  heroTitle: {
    marginBottom: 8,
  },
  heroSubtitle: {
    lineHeight: 21,
  },
  sectionCard: {
    marginBottom: 14,
    gap: 14,
  },
  sectionTitle: {
    color: BabyCityPalette.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: ParentDesignTokens.spacing.pageVertical,
  },
});
