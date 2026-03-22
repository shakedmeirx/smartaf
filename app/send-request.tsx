import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { RequestDraft, initialRequestDraft } from '@/types/request';
import { useAppState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppScreen from '@/components/ui/AppScreen';
import LabeledInput from '@/components/onboarding/LabeledInput';
import SectionLabel from '@/components/onboarding/SectionLabel';
import TagSelector from '@/components/onboarding/TagSelector';
import AppButton from '@/components/ui/AppButton';
import AppText from '@/components/ui/AppText';
import DateTimePicker from '@/components/ui/DateTimePicker';
import SectionHeader from '@/components/ui/SectionHeader';
import { recordPositiveEvent } from '@/lib/reviewPrompt';
import { findPendingPairRequest, requestToDraft } from '@/lib/requestLookup';
import { BabyCityChipTones, BabyCityGeometry, BabyCityPalette, getRoleTheme } from '@/constants/theme';

const NUM_CHILDREN_OPTIONS = ['1', '2', '3', '4+'];
const AGE_RANGE_OPTIONS = ['תינוקות (0–1)', 'פעוטות (1–3)', 'גן (3–6)', 'גיל בית ספר (6+)'];

export default function SendRequestScreen() {
  const { id, name, targetRole } = useLocalSearchParams<{
    id: string;
    name: string;
    targetRole?: string;
  }>();
  const {
    addRequest,
    conversations,
    currentUserId,
    currentBabysitterProfileId,
    sentRequests,
    refreshParentData,
    refreshBabysitterData,
  } = useAppState();
  const { activeRole } = useAuth();

  const roleName: UserRole = activeRole === 'babysitter' ? 'babysitter' : 'parent';
  const isParent = roleName === 'parent';
  const roleTheme = getRoleTheme(roleName);
  const shellBackground = roleTheme.screenBackground;

  const [data, setData] = useState<RequestDraft>({ ...initialRequestDraft, requestType: 'quick_message' });
  const [expanded, setExpanded] = useState(false); // parent-only: full childcare fields
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RequestDraft, string>>>({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockedReason, setBlockedReason] = useState<'conversation-exists' | null>(null);

  const areaRef = useRef<TextInput>(null);

  const pairParentId = isParent ? currentUserId : (typeof id === 'string' ? id : '');
  const pairBabysitterId = isParent
    ? (typeof id === 'string' ? id : '')
    : (currentBabysitterProfileId ?? '');
  const canEvaluatePair = pairParentId !== '' && pairBabysitterId !== '';

  const existingConversation = useMemo(() => {
    if (!canEvaluatePair) return null;

    return (
      conversations.find(
        conv =>
          conv.parentId === pairParentId &&
          conv.babysitterId === pairBabysitterId &&
          !conv.closedAt
      ) ?? null
    );
  }, [canEvaluatePair, conversations, pairBabysitterId, pairParentId]);

  const pendingRequestByCurrentSender = useMemo(() => {
    if (!canEvaluatePair) return null;

    return findPendingPairRequest(
      sentRequests,
      pairParentId,
      pairBabysitterId,
      roleName
    );
  }, [canEvaluatePair, pairBabysitterId, pairParentId, roleName, sentRequests]);

  const isEditingRequest = pendingRequestByCurrentSender !== null;

  // Find the requestId for the existing conversation so we can open the chat
  const existingRequestId = existingConversation?.requestId ?? null;
  const effectiveBlockedReason =
    existingConversation
      ? 'conversation-exists'
      : blockedReason;

  const isQuick = data.requestType === 'quick_message';
  const shellTitle = submitted
    ? isEditingRequest
      ? strings.requestUpdatedTitle
      : isQuick
        ? strings.introSuccessTitle
        : strings.requestSuccessTitle
    : isEditingRequest
      ? strings.requestEditTitle
      : isParent
        ? `${expanded ? strings.fullRequestTitle : strings.sendMessageTo}${name ? ` ${name}` : ''}`
        : strings.introContactTitle;

  useEffect(() => {
    if (!pendingRequestByCurrentSender) {
      return;
    }

    const draft = requestToDraft(pendingRequestByCurrentSender);
    setData(draft);
    setExpanded(draft.requestType === 'full_childcare');
    setFieldErrors({});
    setError('');
    if (existingConversation) {
      setBlockedReason('conversation-exists');
    } else {
      setBlockedReason(null);
    }
  }, [pendingRequestByCurrentSender?.id]);

  function update(fields: Partial<RequestDraft>) {
    setData(prev => ({ ...prev, ...fields }));
    if (error) setError('');
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(prev => {
        const next = { ...prev };
        Object.keys(fields).forEach(key => { delete next[key as keyof RequestDraft]; });
        return next;
      });
    }
  }

  function handleExpand() {
    setExpanded(true);
    update({ requestType: 'full_childcare' });
  }

  function handleCollapse() {
    setExpanded(false);
    setData(prev => ({
      ...prev,
      requestType: 'quick_message',
      date: '',
      time: '',
      numChildren: '',
      childAgeRange: [],
      area: '',
    }));
    setFieldErrors({});
    setError('');
  }

  function validate() {
    const nextErrors: Partial<Record<keyof RequestDraft, string>> = {};

    if (data.note.trim() === '') {
      nextErrors.note = isParent ? strings.quickMessageRequired : strings.introNoteRequired;
    }

    if (!isQuick) {
      if (data.date.trim() === '') {
        nextErrors.date = strings.requestDateRequired;
      }

      if (data.time.trim() === '') {
        nextErrors.time = strings.requestTimeRequired;
      }

      if (data.numChildren === '') {
        nextErrors.numChildren = strings.requestNumChildrenRequired;
      }

      if (data.childAgeRange.length === 0) {
        nextErrors.childAgeRange = strings.requestChildAgeRangeRequired;
      }

      if (data.area.trim() === '') {
        nextErrors.area = strings.requestAreaRequired;
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const normalizedTargetRole: UserRole = targetRole === 'parent' ? 'parent' : 'babysitter';

    setSubmitting(true);
    const result = await addRequest(data, id, normalizedTargetRole);
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      recordPositiveEvent();
    } else {
      if (result.errorMessage === 'invalid-date') {
        setFieldErrors(prev => ({ ...prev, date: strings.requestDateInvalid }));
        return;
      }
      if (result.errorMessage === 'invalid-time') {
        setFieldErrors(prev => ({ ...prev, time: strings.requestTimeInvalid }));
        return;
      }
      if (result.errorMessage === 'invalid-target') {
        setError(strings.requestSubmitError);
        return;
      }
      if (result.errorMessage === 'daily-limit') {
        setError(strings.dailyLimitReached);
        return;
      }
      if (
        result.errorMessage === 'conversation-exists'
      ) {
        if (roleName === 'parent') {
          await refreshParentData();
        } else {
          await refreshBabysitterData();
        }
        setBlockedReason(result.errorMessage);
        return;
      }
      setError(result.errorMessage === 'missing-user' ? strings.authErrorGeneric : strings.requestSubmitError);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(isParent ? '/parent' : '/babysitter');
  }

  async function handleOpenExistingChat() {
    if (!existingRequestId) {
      handleBack();
      return;
    }

    router.replace(
      `/chat?requestId=${existingRequestId}&name=${encodeURIComponent(name ?? '')}`
    );
  }

  if (effectiveBlockedReason === 'conversation-exists') {
    return (
      <AppShell
        title={name ?? ''}
        subtitle={null}
        activeTab="home"
        backgroundColor={shellBackground}
        showBackButton
        onBack={handleBack}
      >
        <AppScreen backgroundColor={shellBackground} style={styles.flex}>
          <View style={styles.centeredState}>
            <AppCard
              role={roleName}
              variant="hero"
              backgroundColor={roleTheme.highlightedSurface}
              borderColor="transparent"
              style={styles.centeredCard}
            >
              <Ionicons name="chatbubbles-outline" size={56} color={roleTheme.filterAccent} />
              <AppText variant="h2" weight="800" style={[styles.centeredTitle, { color: roleTheme.title }]}>
                {strings.alreadyChattingTitle}
              </AppText>
              <AppText style={[styles.centeredSubtitle, { color: roleTheme.subtitle }]}>
                {strings.alreadyChattingBody}
              </AppText>
              {name ? (
                <AppText style={[styles.centeredName, { color: roleTheme.subtitle }]}>
                  {name}
                </AppText>
              ) : null}
              {existingRequestId ? (
                <AppButton
                  label={strings.alreadyChattingCta}
                  size="lg"
                  backgroundColor={roleTheme.filterAccent}
                  onPress={handleOpenExistingChat}
                  style={styles.primaryButton}
                />
              ) : (
                <AppButton
                  label={strings.requestBlockedBack}
                  size="lg"
                  backgroundColor={roleTheme.filterAccent}
                  onPress={handleBack}
                  style={styles.primaryButton}
                />
              )}
            </AppCard>
          </View>
        </AppScreen>
      </AppShell>
    );
  }

  // ─── Success screen ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <AppShell
        title={shellTitle}
        subtitle={null}
        activeTab="home"
        backgroundColor={shellBackground}
        showBackButton
        onBack={handleBack}
      >
        <AppScreen
          scrollable
          backgroundColor={shellBackground}
          contentContainerStyle={styles.successContent}
        >
          <AppCard
            role={roleName}
            variant="hero"
            backgroundColor={roleTheme.highlightedSurface}
            borderColor="transparent"
            style={styles.successHeader}
          >
            <View
              style={[
                styles.successIconCircle,
                {
                  backgroundColor: BabyCityChipTones.primary.background,
                  borderColor: BabyCityChipTones.primary.border,
                },
              ]}
            >
              <AppText variant="h1" weight="700" style={[styles.successIcon, { color: BabyCityPalette.primary }]}>✓</AppText>
            </View>
            <AppText variant="h2" weight="700" style={[styles.successTitle, { color: roleTheme.title }]}>
              {isEditingRequest
                ? strings.requestUpdatedTitle
                : isQuick
                  ? strings.introSuccessTitle
                  : strings.requestSuccessTitle}
            </AppText>
            <AppText style={[styles.successBody, { color: roleTheme.subtitle }]}>
              {isEditingRequest
                ? strings.requestUpdatedBody
                : isParent
                  ? strings.requestSuccessBody
                  : strings.introSuccessBody}
            </AppText>
          </AppCard>

          {!isQuick && (
            <AppCard role={roleName} variant="panel" style={styles.summaryCard}>
              <AppText variant="caption" weight="700" style={[styles.summaryCardLabel, { color: roleTheme.filterAccent, borderBottomColor: BabyCityPalette.borderSoft }]}>
                {strings.requestSummaryLabel}
              </AppText>
              {name ? <SummaryRow label={strings.requestFor} value={name} theme={roleTheme} /> : null}
              <SummaryRow label={strings.requestDate} value={data.date} theme={roleTheme} />
              <SummaryRow label={strings.requestTime} value={data.time} theme={roleTheme} />
              <SummaryRow label={strings.requestNumChildren} value={data.numChildren} theme={roleTheme} />
              <SummaryRow label={strings.requestChildAgeRange} value={data.childAgeRange.join(', ')} theme={roleTheme} />
              <SummaryRow label={strings.requestArea} value={data.area} theme={roleTheme} />
              {data.note.trim() !== '' && (
                <SummaryRow label={strings.requestNote} value={data.note} theme={roleTheme} isLast />
              )}
            </AppCard>
          )}

          <AppButton
            label={strings.requestSuccessBack}
            size="lg"
            onPress={() => router.replace(isParent ? '/parent-requests' : '/babysitter-inbox')}
            style={styles.primaryButton}
          />
          <AppButton
            label={strings.requestSuccessToList}
            variant="secondary"
            onPress={handleBack}
            textColor={roleTheme.title}
            style={styles.secondaryButton}
          />
        </AppScreen>
      </AppShell>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────

  return (
    <AppShell
      title={shellTitle}
      subtitle={null}
      activeTab="home"
      backgroundColor={shellBackground}
      showBackButton
      onBack={handleBack}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppScreen
          scrollable
          backgroundColor={shellBackground}
          style={styles.flex}
          contentContainerStyle={styles.content}
          scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
        >
          <AppCard
            role={roleName}
            variant="hero"
            backgroundColor={roleTheme.highlightedSurface}
            borderColor="transparent"
            style={styles.heroCard}
          >
            <SectionHeader
              title={isParent ? strings.quickMessageLabel : strings.introNoteLabel}
              subtitle={isParent ? strings.quickMessagePlaceholder : strings.introNotePlaceholder}
            />
          </AppCard>

          {/* Note / message field — always shown */}
          <AppCard role={roleName} variant="panel" style={styles.formSectionCard}>
            <AppText variant="bodyLarge" weight="800" style={[styles.formTitle, { color: roleTheme.title }]}>
              {isParent ? strings.quickMessageLabel : strings.introNoteLabel}
            </AppText>
            <LabeledInput
              label={isParent ? strings.quickMessageLabel + ' *' : strings.introNoteLabel + ' *'}
              value={data.note}
              onChange={v => update({ note: v })}
              placeholder={isParent ? strings.quickMessagePlaceholder : strings.introNotePlaceholder}
              multiline
              errorText={fieldErrors.note}
            />
          </AppCard>

          {/* Expand button (parent only, when collapsed) */}
          {isParent && !expanded && (
            <TouchableOpacity
              style={[styles.expandButtonCard, { backgroundColor: roleTheme.highlightedSurface }]}
              onPress={handleExpand}
            >
              <AppText variant="body" weight="700" style={[styles.expandButtonText, { color: roleTheme.title }]}>
                {strings.expandToFullRequest}
              </AppText>
              <View style={[styles.expandIconCircle, { backgroundColor: BabyCityPalette.primarySoft }]}>
                <Ionicons name="add-circle-outline" size={18} color={BabyCityPalette.primary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Full childcare fields (parent only, when expanded) */}
          {isParent && expanded && (
            <AppCard
              role={roleName}
              variant="panel"
              backgroundColor={roleTheme.highlightedSurface}
              borderColor="transparent"
              style={styles.expandedSection}
            >
              <TouchableOpacity style={styles.collapseButton} onPress={handleCollapse}>
                <AppText variant="caption" style={[styles.collapseButtonText, { color: roleTheme.subtitle }]}>
                  {strings.collapseRequest}
                </AppText>
                <Ionicons name="remove-circle-outline" size={16} color={roleTheme.subtitle} />
              </TouchableOpacity>

              <DateTimePicker
                mode="date"
                label={strings.requestDate + ' *'}
                value={data.date}
                onChange={v => update({ date: v })}
                errorText={fieldErrors.date}
              />

              <DateTimePicker
                mode="time"
                label={strings.requestTime + ' *'}
                value={data.time}
                onChange={v => update({ time: v })}
                errorText={fieldErrors.time}
              />

              <SectionLabel text={strings.requestNumChildren + ' *'} />
              <TagSelector
                options={NUM_CHILDREN_OPTIONS}
                selected={data.numChildren ? [data.numChildren] : []}
                onChange={v => update({ numChildren: v[0] ?? '' })}
                singleSelect
                errorText={fieldErrors.numChildren}
              />

              <SectionLabel text={strings.requestChildAgeRange + ' *'} />
              <TagSelector
                options={AGE_RANGE_OPTIONS}
                selected={data.childAgeRange}
                onChange={v => update({ childAgeRange: v })}
                errorText={fieldErrors.childAgeRange}
              />

              <LabeledInput
                ref={areaRef}
                label={strings.requestArea + ' *'}
                value={data.area}
                onChange={v => update({ area: v })}
                placeholder={strings.requestAreaPlaceholder}
                returnKeyType="done"
                errorText={fieldErrors.area}
              />
            </AppCard>
          )}

          {error !== '' && (
            <AppText variant="body" tone="error" style={[styles.errorText, { color: BabyCityPalette.error }]}>
              {error}
            </AppText>
          )}

          <AppButton
            label={isEditingRequest ? strings.requestEditSubmit : strings.requestSubmit}
            size="lg"
            loading={submitting}
            onPress={handleSubmit}
            style={styles.primaryButton}
          />
        </AppScreen>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

// ─── Small components ────────────────────────────────────────────────────────

type SummaryRowProps = {
  label: string;
  value: string;
  theme: ReturnType<typeof getRoleTheme>;
  isLast?: boolean;
};

function SummaryRow({ label, value, theme, isLast = false }: SummaryRowProps) {
  return (
    <View style={[summaryRowStyles.row, !isLast && summaryRowStyles.rowBorder]}>
      <AppText style={[summaryRowStyles.value, { color: BabyCityPalette.textPrimary }]}>{value}</AppText>
      <AppText variant="caption" style={[summaryRowStyles.label, { color: theme.subtitle }]}>{label}</AppText>
    </View>
  );
}

const summaryRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 8,
  },
  rowBorder: {
  },
  label: {
    flexShrink: 0,
  },
  value: {
    textAlign: 'right',
    flex: 1,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  centeredCard: {
    width: '100%',
    alignItems: 'center',
  },
  centeredTitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  centeredSubtitle: {
    textAlign: 'center',
  },
  centeredName: {
    textAlign: 'center',
  },
  content: {
    paddingBottom: 48,
  },
  formTitle: {
    marginBottom: 14,
  },
  heroCard: {
    borderRadius: BabyCityGeometry.radius.hero,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
  },
  formSectionCard: {
    borderRadius: BabyCityGeometry.radius.hero,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    marginBottom: 14,
  },
  expandButtonCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: BabyCityGeometry.radius.card,
    marginBottom: 4,
  },
  expandIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonText: {
  },

  expandedSection: {
    marginTop: 12,
    borderRadius: BabyCityGeometry.radius.hero,
    padding: 18,
  },
  collapseButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  collapseButtonText: {
  },

  errorText: {
    textAlign: 'right',
    marginBottom: 12,
    marginTop: 4,
  },

  primaryButton: {
    marginTop: 16,
  },
  secondaryButton: {
    marginTop: 10,
  },

  successContent: {
    paddingBottom: 48,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 32,
    fontWeight: '700',
  },
  successTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  successBody: {
    textAlign: 'center',
    lineHeight: 21,
  },
  summaryCard: {
    borderRadius: BabyCityGeometry.radius.control,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    marginBottom: 24,
  },
  summaryCardLabel: {
    textAlign: 'right',
    paddingTop: 12,
    paddingBottom: 8,
  },
});
