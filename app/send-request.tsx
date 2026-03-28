import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import AvatarCircle from '@/components/ui/AvatarCircle';
import LabeledInput from '@/components/onboarding/LabeledInput';
import TagSelector from '@/components/onboarding/TagSelector';
import AppButton from '@/components/ui/AppButton';
import AppText from '@/components/ui/AppText';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { recordPositiveEvent } from '@/lib/reviewPrompt';
import { findPendingPairRequest, requestToDraft } from '@/lib/requestLookup';
import { BabyCityChipTones, BabyCityGeometry, BabyCityPalette, getRoleTheme } from '@/constants/theme';

const NUM_CHILDREN_OPTIONS = ['1', '2', '3', '4+'];

export default function SendRequestScreen() {
  const { id, name, targetRole } = useLocalSearchParams<{
    id: string;
    name: string;
    targetRole?: string;
  }>();
  const {
    addRequest,
    babysitters,
    conversations,
    currentUserId,
    currentBabysitterProfileId,
    isUserExcluded,
    posts,
    sentRequests,
    refreshParentData,
    refreshBabysitterData,
  } = useAppState();
  const { activeRole } = useAuth();

  const roleName: UserRole = activeRole === 'babysitter' ? 'babysitter' : 'parent';
  const isParent = roleName === 'parent';
  const roleTheme = getRoleTheme(roleName);
  const shellBackground = roleTheme.screenBackground;
  const normalizedTargetRole: UserRole = targetRole === 'parent' ? 'parent' : 'babysitter';
  const useStitchParentRequestLayout = isParent && normalizedTargetRole === 'babysitter';

  const [data, setData] = useState<RequestDraft>({ ...initialRequestDraft, requestType: 'quick_message' });
  const [expanded, setExpanded] = useState(false); // parent-only: full childcare fields
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RequestDraft, string>>>({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockedReason, setBlockedReason] = useState<'conversation-exists' | 'user-blocked' | null>(null);

  const areaRef = useRef<TextInput>(null);
  const selectedBabysitter = useMemo(
    () => (
      normalizedTargetRole === 'babysitter' && typeof id === 'string'
        ? babysitters.find(item => item.id === id) ?? null
        : null
    ),
    [babysitters, id, normalizedTargetRole]
  );
  const selectedParentPost = useMemo(
    () => (
      normalizedTargetRole === 'parent' && typeof id === 'string'
        ? posts.find(post => post.parentId === id) ?? null
        : null
    ),
    [id, normalizedTargetRole, posts]
  );
  const recipientName =
    selectedBabysitter?.name ??
    selectedParentPost?.parentName ??
    (typeof name === 'string' && name.trim() !== '' ? name : strings.notFilled);
  const recipientCity = selectedBabysitter?.city ?? selectedParentPost?.parentCity ?? '';
  const recipientPhotoUrl = selectedBabysitter?.profilePhotoUrl ?? selectedParentPost?.parentProfilePhotoUrl;
  const recipientHourlyRate = selectedBabysitter?.hourlyRate ?? null;
  const recipientHasVerification = Boolean(selectedBabysitter?.isVerified);
  const targetUserId =
    normalizedTargetRole === 'babysitter'
      ? selectedBabysitter?.userId ?? ''
      : selectedParentPost?.parentId ?? (typeof id === 'string' ? id : '');
  const isTargetExcluded = targetUserId !== '' && isUserExcluded(targetUserId);

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
    isTargetExcluded
      ? 'user-blocked'
      : existingConversation
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
  const formHeaderTitle = isEditingRequest ? strings.requestEditTitle : strings.sendRequestTitle;

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
    if (effectiveBlockedReason === 'user-blocked') {
      setBlockedReason('user-blocked');
      return;
    }

    if (!validate()) return;

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
      if (result.errorMessage === 'user-blocked') {
        setBlockedReason('user-blocked');
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

  if (effectiveBlockedReason) {
    const isConversationBlocked = effectiveBlockedReason === 'conversation-exists';

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
                {isConversationBlocked ? strings.alreadyChattingTitle : strings.userBlockedTitle}
              </AppText>
              <AppText style={[styles.centeredSubtitle, { color: roleTheme.subtitle }]}>
                {isConversationBlocked ? strings.alreadyChattingBody : strings.userBlockedBody}
              </AppText>
              {isConversationBlocked && name ? (
                <AppText style={[styles.centeredName, { color: roleTheme.subtitle }]}>
                  {name}
                </AppText>
              ) : null}
              {isConversationBlocked && existingRequestId ? (
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
      title={useStitchParentRequestLayout ? formHeaderTitle : shellTitle}
      subtitle={null}
      activeTab="chats"
      backgroundColor={shellBackground}
      showBackButton
      onBack={handleBack}
      hideHeaderMenuButton={useStitchParentRequestLayout}
      backButtonVariant={useStitchParentRequestLayout ? 'icon' : 'pill'}
      swapHeaderEdgeControls={useStitchParentRequestLayout}
      bottomOverlay={
        useStitchParentRequestLayout ? (
          <LinearGradient
            colors={['rgba(244,246,255,0)', 'rgba(244,246,255,0.92)', '#f4f6ff']}
            locations={[0, 0.3, 1]}
            style={styles.bottomOverlay}
          >
            <AppButton
              label={isEditingRequest ? strings.requestEditSubmit : strings.requestSubmit}
              size="lg"
              loading={submitting}
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.bottomPrimaryButton}
            />
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={handleBack}
              style={styles.cancelAction}
            >
              <AppText variant="body" weight="600" style={styles.cancelActionText}>
                {strings.cancel}
              </AppText>
            </TouchableOpacity>
          </LinearGradient>
        ) : undefined
      }
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={useStitchParentRequestLayout ? 88 : 0}
      >
        <View style={styles.flex}>
          {useStitchParentRequestLayout ? <View style={styles.backdropOrbTop} /> : null}
          {useStitchParentRequestLayout ? <View style={styles.backdropOrbBottom} /> : null}

          <AppScreen
            scrollable
            backgroundColor={shellBackground}
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              useStitchParentRequestLayout && styles.stitchContent,
            ]}
            scrollProps={{
              keyboardShouldPersistTaps: 'handled',
              showsVerticalScrollIndicator: false,
            }}
          >
            {useStitchParentRequestLayout ? (
              <>
                <AppCard style={styles.recipientCard}>
                  <View style={styles.recipientRow}>
                    <View style={styles.recipientAvatarWrap}>
                      <AvatarCircle
                        name={recipientName || strings.appName}
                        photoUrl={recipientPhotoUrl}
                        size={64}
                        tone="muted"
                      />
                      {recipientHasVerification ? (
                        <View style={styles.recipientBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#ffffff" />
                          <AppText variant="caption" weight="700" style={styles.recipientBadgeText}>
                            {strings.verifiedBadge}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.recipientDetails}>
                      <AppText variant="bodyLarge" weight="800" style={styles.recipientName}>
                        {recipientName || strings.notFilled}
                      </AppText>
                      {recipientCity ? (
                        <View style={styles.recipientMetaRow}>
                          <Ionicons name="location-outline" size={15} color={BabyCityPalette.textSecondary} />
                          <AppText variant="caption" tone="muted" style={styles.recipientMetaText}>
                            {recipientCity}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    {recipientHourlyRate != null ? (
                      <View style={styles.rateBlock}>
                        <AppText variant="h3" weight="800" style={styles.rateValue}>
                          ₪{recipientHourlyRate}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={styles.rateLabel}>
                          {strings.perHourSuffix}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </AppCard>

                {isQuick ? (
                  <AppCard style={styles.detailsToggleCard}>
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={handleExpand}
                      style={styles.detailsToggleButton}
                    >
                      <View style={styles.detailsToggleIcon}>
                        <Ionicons name="add" size={20} color={BabyCityPalette.primary} />
                      </View>
                      <View style={styles.detailsToggleCopy}>
                        <AppText variant="bodyLarge" weight="700" style={styles.detailsToggleLabel}>
                          {strings.expandToFullRequest}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={styles.detailsToggleHint}>
                          {`${strings.requestDate} • ${strings.requestTime} • ${strings.requestNumChildren} • ${strings.requestArea}`}
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  </AppCard>
                ) : null}

                {!isQuick ? (
                  <AppCard style={styles.stitchSectionCard}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleCollapse}
                      style={styles.inlineCollapseAction}
                    >
                      <Ionicons name="remove-circle-outline" size={16} color={BabyCityPalette.textSecondary} />
                      <AppText variant="caption" weight="700" tone="muted" style={styles.inlineCollapseText}>
                        {strings.collapseRequest}
                      </AppText>
                    </TouchableOpacity>

                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="calendar-outline" size={18} color={BabyCityPalette.primary} />
                      <AppText variant="bodyLarge" weight="700" style={styles.sectionHeaderText}>
                        {strings.requestScheduleTitle}
                      </AppText>
                    </View>

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
                  </AppCard>
                ) : null}

                {!isQuick ? (
                  <AppCard style={styles.stitchSectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="people-outline" size={18} color={BabyCityPalette.primary} />
                      <AppText variant="bodyLarge" weight="700" style={styles.sectionHeaderText}>
                        {strings.requestForWhom}
                      </AppText>
                    </View>

                    <View style={styles.selectorBlock}>
                      <AppText variant="body" weight="700" tone="muted" style={styles.selectorLabel}>
                        {strings.requestNumChildren + ' *'}
                      </AppText>
                      <TagSelector
                        options={NUM_CHILDREN_OPTIONS}
                        selected={data.numChildren ? [data.numChildren] : []}
                        onChange={v => update({ numChildren: v[0] ?? '' })}
                        singleSelect
                        errorText={fieldErrors.numChildren}
                      />
                    </View>

                    <View style={styles.selectorBlock}>
                      <AppText variant="body" weight="700" tone="muted" style={styles.selectorLabel}>
                        {strings.requestChildAgeRange + ' *'}
                      </AppText>
                      <TagSelector
                        options={[
                          strings.ageRangeOptionInfants,
                          strings.ageRangeOptionToddlers,
                          strings.ageRangeOptionPreschool,
                          strings.ageRangeOptionSchool,
                        ]}
                        selected={data.childAgeRange}
                        onChange={v => update({ childAgeRange: v })}
                        errorText={fieldErrors.childAgeRange}
                      />
                    </View>

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
                ) : null}

                <AppCard style={styles.stitchSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="create-outline" size={18} color={BabyCityPalette.primary} />
                    <AppText variant="bodyLarge" weight="700" style={styles.sectionHeaderText}>
                      {isParent ? strings.quickMessageLabel : strings.introNoteLabel}
                    </AppText>
                  </View>

                  <LabeledInput
                    label={isParent ? `${strings.quickMessageLabel} *` : `${strings.introNoteLabel} *`}
                    value={data.note}
                    onChange={v => update({ note: v })}
                    placeholder={isQuick ? strings.quickMessagePlaceholder : strings.requestNotePlaceholder}
                    multiline
                    errorText={fieldErrors.note}
                  />
                </AppCard>

                {error !== '' ? (
                  <AppText variant="body" tone="error" style={[styles.errorText, { color: BabyCityPalette.error }]}>
                    {error}
                  </AppText>
                ) : null}

                <View style={styles.stitchBottomSpacer} />
              </>
            ) : (
              <>
                <View style={styles.heroSection}>
                  <AppText variant="h1" weight="800" style={[styles.heroTitle, { color: roleTheme.title }]}>
                    {isParent ? strings.quickMessageLabel : strings.introNoteLabel}
                  </AppText>
                  <AppText variant="body" style={styles.heroSubtitle}>
                    {isParent ? strings.quickMessagePlaceholder : strings.introNotePlaceholder}
                  </AppText>
                </View>

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

                    <AppText variant="body" weight="700" tone="muted" style={styles.selectorLabel}>
                      {strings.requestNumChildren + ' *'}
                    </AppText>
                    <TagSelector
                      options={NUM_CHILDREN_OPTIONS}
                      selected={data.numChildren ? [data.numChildren] : []}
                      onChange={v => update({ numChildren: v[0] ?? '' })}
                      singleSelect
                      errorText={fieldErrors.numChildren}
                    />

                    <AppText variant="body" weight="700" tone="muted" style={styles.selectorLabel}>
                      {strings.requestChildAgeRange + ' *'}
                    </AppText>
                    <TagSelector
                      options={[strings.ageRangeOptionInfants, strings.ageRangeOptionToddlers, strings.ageRangeOptionPreschool, strings.ageRangeOptionSchool]}
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
              </>
            )}
          </AppScreen>
        </View>
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
  bottomOverlay: {
    paddingTop: 24,
    paddingBottom: 6,
    paddingHorizontal: 6,
  },
  bottomPrimaryButton: {
    width: '100%',
  },
  cancelAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  cancelActionText: {
    color: BabyCityPalette.textSecondary,
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
  stitchContent: {
    paddingTop: 18,
    paddingBottom: 180,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: 6,
    right: -44,
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: 'rgba(112,42,225,0.06)',
  },
  backdropOrbBottom: {
    position: 'absolute',
    bottom: 38,
    left: -36,
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: 'rgba(233,222,245,0.48)',
  },
  recipientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  recipientRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  recipientAvatarWrap: {
    position: 'relative',
  },
  recipientBadge: {
    position: 'absolute',
    bottom: -6,
    left: -6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: BabyCityPalette.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  recipientBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 12,
  },
  recipientDetails: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  recipientName: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  recipientMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  recipientMetaText: {
    textAlign: 'right',
  },
  rateBlock: {
    alignItems: 'flex-start',
    minWidth: 70,
  },
  rateValue: {
    color: BabyCityPalette.primary,
    textAlign: 'left',
  },
  rateLabel: {
    textAlign: 'left',
  },
  detailsToggleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderText: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  detailsToggleButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  detailsToggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BabyCityPalette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsToggleCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailsToggleLabel: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  detailsToggleHint: {
    textAlign: 'right',
    marginTop: 2,
  },
  inlineCollapseAction: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginBottom: 14,
  },
  inlineCollapseText: {
    textAlign: 'right',
  },
  stitchSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    marginBottom: 16,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  selectorBlock: {
    marginBottom: 4,
  },
  selectorLabel: {
    marginBottom: 10,
    textAlign: 'right',
  },
  stitchBottomSpacer: {
    height: 24,
  },
  formTitle: {
    marginBottom: 14,
  },
  heroSection: {
    paddingHorizontal: 4,
    marginBottom: 20,
    gap: 6,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'right',
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 22,
    color: BabyCityPalette.textSecondary,
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
