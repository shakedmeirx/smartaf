import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import { MaterialIcons } from '@expo/vector-icons';
import BabysitterScheduleCard from '@/components/babysitter/BabysitterScheduleCard';
import { useAppState } from '@/context/AppContext';
import {
  BabyCityGeometry,
  BabyCityPalette,
  BabysitterDesignTokens,
  getRoleTheme,
} from '@/constants/theme';
import { strings } from '@/locales';
import { loadBabysitterShifts } from '@/lib/babysitterShifts';
import { normalizeTimeValue } from '@/lib/time';
import { Request } from '@/types/request';
import { BabysitterShift } from '@/types/shift';

type ScheduleFilter = 'all' | 'active' | 'upcoming' | 'completed';

type ScheduleGroup = {
  key: string;
  title: string;
  items: Request[];
};

type SummaryTileTone = 'primary' | 'success' | 'accent' | 'muted';

const SUMMARY_TILE_PALETTE: Record<
  SummaryTileTone,
  {
    backgroundColor: string;
    iconColor: string;
    iconBackground: string;
    valueColor: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }
> = {
  primary: {
    backgroundColor: `${BabyCityPalette.primary}0b`,
    iconColor: BabyCityPalette.primary,
    iconBackground: `${BabyCityPalette.primary}14`,
    valueColor: BabyCityPalette.primary,
    icon: 'calendar-month',
  },
  success: {
    backgroundColor: BabyCityPalette.successSoft,
    iconColor: BabyCityPalette.success,
    iconBackground: `${BabyCityPalette.success}18`,
    valueColor: BabyCityPalette.success,
    icon: 'today',
  },
  accent: {
    backgroundColor: BabyCityPalette.accentSoft,
    iconColor: '#2f7de1',
    iconBackground: `${BabyCityPalette.accent}22`,
    valueColor: '#2f7de1',
    icon: 'schedule',
  },
  muted: {
    backgroundColor: BabyCityPalette.surfaceLow,
    iconColor: BabyCityPalette.textSecondary,
    iconBackground: '#ffffff',
    valueColor: BabyCityPalette.textPrimary,
    icon: 'done-all',
  },
};

type SummaryTileProps = {
  label: string;
  value: string;
  tone: SummaryTileTone;
};

function SummaryTile({ label, value, tone }: SummaryTileProps) {
  const palette = SUMMARY_TILE_PALETTE[tone];

  return (
    <View style={[styles.summaryTile, { backgroundColor: palette.backgroundColor }]}>
      <View style={[styles.summaryTileIconWrap, { backgroundColor: palette.iconBackground }]}>
        <MaterialIcons name={palette.icon} size={18} color={palette.iconColor} />
      </View>
      <View style={styles.summaryTileText}>
        <AppText variant="caption" weight="700" style={styles.summaryTileLabel}>
          {label}
        </AppText>
        <AppText variant="h3" weight="800" style={[styles.summaryTileValue, { color: palette.valueColor }]}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function buildScheduleRequests(incomingRequests: Request[], sentRequests: Request[]) {
  const seen = new Set<string>();

  return [...incomingRequests, ...sentRequests]
    .filter(request => {
      if (
        request.status !== 'accepted' ||
        request.requestType === 'quick_message' ||
        seen.has(request.id)
      ) {
        return false;
      }

      seen.add(request.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.date ? new Date(`${a.date}T${a.time || '00:00'}`).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.date ? new Date(`${b.date}T${b.time || '00:00'}`).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

function formatDateHeading(dateValue: string) {
  const target = new Date(`${dateValue}T12:00:00`);
  return target.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function buildDateLabel(request: Request) {
  if (!request.date) {
    return strings.babysitterCalendarDateUnknown;
  }

  return formatDateHeading(request.date);
}

function resolveStatus(request: Request) {
  if (!request.date) {
    return 'active' as const;
  }

  const requestMoment = new Date(`${request.date}T${request.time || '00:00'}`);
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  if (requestMoment >= startOfToday && requestMoment <= endOfToday) {
    return 'active' as const;
  }

  return requestMoment > now ? ('upcoming' as const) : ('completed' as const);
}

function buildGroups(requests: Request[]): ScheduleGroup[] {
  const groups = new Map<string, ScheduleGroup>();

  requests.forEach(request => {
    const key = request.date;

    if (!key) {
      return;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.items.push(request);
      return;
    }

    groups.set(key, {
      key,
      title: formatDateHeading(key),
      items: [request],
    });
  });

  return Array.from(groups.values()).sort((a, b) => {
    return new Date(`${a.key}T00:00:00`).getTime() - new Date(`${b.key}T00:00:00`).getTime();
  });
}

export default function BabysitterCalendarScreen() {
  const { currentBabysitterProfileId, incomingRequests, sentRequests } = useAppState();
  const theme = getRoleTheme('babysitter');
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>('all');
  const [trackedShiftsByRequestId, setTrackedShiftsByRequestId] = useState<Map<string, BabysitterShift>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadTrackedShifts(babysitterProfileId: string) {
      const { shifts, error } = await loadBabysitterShifts(babysitterProfileId);

      if (cancelled || error) {
        return;
      }

      setTrackedShiftsByRequestId(
        new Map(
          shifts
            .filter((shift): shift is BabysitterShift & { requestId: string } => Boolean(shift.requestId))
            .map(shift => [shift.requestId, shift])
        )
      );
    }

    if (!currentBabysitterProfileId) {
      setTrackedShiftsByRequestId(new Map());
      return () => {
        cancelled = true;
      };
    }

    void loadTrackedShifts(currentBabysitterProfileId);

    return () => {
      cancelled = true;
    };
  }, [currentBabysitterProfileId]);

  const scheduleItems = useMemo(
    () => buildScheduleRequests(incomingRequests, sentRequests),
    [incomingRequests, sentRequests]
  );

  const datedItems = useMemo(
    () => scheduleItems.filter(item => Boolean(item.date)),
    [scheduleItems]
  );

  const undatedItems = useMemo(
    () => scheduleItems.filter(item => !item.date),
    [scheduleItems]
  );

  const todayCount = useMemo(
    () => datedItems.filter(item => resolveStatus(item) === 'active').length,
    [datedItems]
  );

  const upcomingCount = useMemo(
    () => datedItems.filter(item => resolveStatus(item) === 'upcoming').length,
    [datedItems]
  );

  const completedCount = useMemo(
    () => datedItems.filter(item => resolveStatus(item) === 'completed').length,
    [datedItems]
  );

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') {
      return datedItems;
    }

    return datedItems.filter(item => resolveStatus(item) === activeFilter);
  }, [activeFilter, datedItems]);

  const groupedItems = useMemo(
    () => buildGroups(filteredItems),
    [filteredItems]
  );
  const totalAcceptedCount = scheduleItems.length;
  const filterOptions = useMemo(
    () => [
      { key: 'all' as const, label: strings.babysitterCalendarAll },
      { key: 'active' as const, label: strings.babysitterCalendarToday },
      { key: 'upcoming' as const, label: strings.babysitterCalendarUpcoming },
      { key: 'completed' as const, label: strings.babysitterCalendarCompleted },
    ],
    [
      strings.babysitterCalendarAll,
      strings.babysitterCalendarToday,
      strings.babysitterCalendarUpcoming,
      strings.babysitterCalendarCompleted,
    ]
  );

  return (
    <AppShell
      title={strings.babysitterCalendarTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      backButtonVariant="icon"
      onBack={() => router.back()}
      renderHeaderActions={() => (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.84}
          onPress={() => router.push('/babysitter-shifts')}
          style={styles.headerActionButton}
        >
          <AppText variant="body" weight="800" style={styles.headerActionText}>
            {strings.babysitterCalendarHeaderAction}
          </AppText>
        </TouchableOpacity>
      )}
      bottomOverlay={
        <LinearGradient
          colors={['rgba(244,246,255,0)', 'rgba(244,246,255,0.94)', '#f4f6ff']}
          locations={[0, 0.34, 1]}
          style={styles.bottomOverlay}
        >
          <AppPrimaryButton
            label={strings.babysitterShiftManagerTitle}
            size="lg"
            onPress={() => router.push('/babysitter-shifts')}
            style={styles.bottomButton}
          />
        </LinearGradient>
      }
    >
      <View style={styles.screen}>
        <View style={styles.backdropOrbTop} />
        <View style={styles.backdropOrbBottom} />
        <AppScreen
          scrollable
          backgroundColor={theme.screenBackground}
          contentContainerStyle={styles.screenContent}
          scrollProps={{ showsVerticalScrollIndicator: false }}
        >
          <View style={styles.heroSection}>
            <AppText variant="h1" weight="800" style={[styles.heroTitle, { color: theme.title }]}>
              {strings.babysitterCalendarTitle}
            </AppText>
            <AppText variant="body" style={[styles.heroSubtitle, { color: theme.subtitle }]}>
              {strings.babysitterCalendarSubtitle}
            </AppText>
          </View>

          <AppCard style={styles.editorialCard}>
            <View style={styles.totalCard}>
              <View style={styles.totalCardIcon}>
                <MaterialIcons name="calendar-month" size={26} color={BabyCityPalette.primary} />
              </View>
              <View style={styles.totalCardText}>
                <AppText variant="caption" weight="700" style={styles.totalCardLabel}>
                  {strings.babysitterCalendarAcceptedSectionTitle}
                </AppText>
                <AppText variant="h1" weight="800" style={styles.totalCardValue}>
                  {String(totalAcceptedCount)}
                </AppText>
                <AppText variant="body" tone="muted" style={styles.totalCardHint}>
                  {strings.babysitterCalendarCountSuffix}
                </AppText>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryTile
                label={strings.babysitterCalendarAll}
                value={String(totalAcceptedCount)}
                tone="primary"
              />
              <SummaryTile
                label={strings.babysitterCalendarToday}
                value={String(todayCount)}
                tone="success"
              />
              <SummaryTile
                label={strings.babysitterCalendarUpcoming}
                value={String(upcomingCount)}
                tone="accent"
              />
              <SummaryTile
                label={strings.babysitterCalendarCompleted}
                value={String(completedCount)}
                tone="muted"
              />
            </View>

            <View style={styles.fieldBlock}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                {strings.babysitterCalendarFilterLabel}
              </AppText>
              <View style={styles.segmentedWrap}>
                {filterOptions.map(option => {
                  const isActive = activeFilter === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      accessibilityRole="button"
                      activeOpacity={0.88}
                      onPress={() => setActiveFilter(option.key)}
                      style={[
                        styles.segmentedOption,
                        isActive && styles.segmentedOptionActive,
                      ]}
                    >
                      <AppText
                        variant="body"
                        weight={isActive ? '800' : '700'}
                        style={[
                          styles.segmentedOptionText,
                          isActive && styles.segmentedOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {undatedItems.length > 0 ? (
              <View style={styles.undatedSection}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupIconWrap}>
                    <MaterialIcons name="schedule" size={18} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.groupHeaderText}>
                    <AppText variant="bodyLarge" weight="700">
                      {strings.babysitterCalendarUndatedTitle}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={styles.groupHeaderHint}>
                      {strings.babysitterCalendarUndatedHint}
                    </AppText>
                  </View>
                </View>
                <View style={styles.inlineChipRow}>
                  {undatedItems.map(item => (
                    <View key={item.id} style={styles.inlineChip}>
                      <AppText variant="caption" weight="700" style={styles.inlineChipText}>
                        {item.counterpartName ?? strings.familyFeedAnonymous}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {datedItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons name="calendar-month" size={26} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="h3" weight="800" align="center">
                  {strings.babysitterCalendarEmpty}
                </AppText>
                <AppText variant="body" tone="muted" align="center" style={styles.emptyBody}>
                  {strings.babysitterCalendarEmptyHint}
                </AppText>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.88}
                  onPress={() => router.replace('/babysitter')}
                  style={styles.inlineActionButton}
                >
                  <AppText variant="body" weight="800" style={styles.inlineActionButtonText}>
                    {strings.postFeedTitle}
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {groupedItems.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                      <MaterialIcons name="filter-alt-off" size={24} color={BabyCityPalette.primary} />
                    </View>
                    <AppText variant="h3" weight="800" align="center">
                      {strings.babysitterCalendarNoMatches}
                    </AppText>
                    <AppText variant="body" tone="muted" align="center" style={styles.emptyBody}>
                      {strings.babysitterCalendarNoMatchesHint}
                    </AppText>
                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.88}
                      onPress={() => setActiveFilter('all')}
                      style={styles.inlineActionButton}
                    >
                      <AppText variant="body" weight="800" style={styles.inlineActionButtonText}>
                        {strings.babysitterCalendarAll}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {groupedItems.map(group => (
                  <View key={group.key} style={styles.groupSection}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupIconWrap}>
                        <MaterialIcons name="calendar-today" size={18} color={BabyCityPalette.primary} />
                      </View>
                      <View style={styles.groupHeaderText}>
                        <AppText variant="bodyLarge" weight="700">
                          {group.title}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {`${group.items.length} ${strings.babysitterCalendarCountSuffix}`}
                        </AppText>
                      </View>
                    </View>

                    {group.items.map(request => {
                      const counterpartName = request.counterpartName ?? strings.familyFeedAnonymous;
                      const status = resolveStatus(request);
                      const hasTrackedShift = trackedShiftsByRequestId.has(request.id);
                      const childrenLabel =
                        request.numChildren > 0
                          ? `${request.numChildren} ${strings.familyFeedChildrenSuffix}`
                          : undefined;

                      return (
                        <BabysitterScheduleCard
                          key={request.id}
                          variant="registration"
                          counterpartName={counterpartName}
                          counterpartPhotoUrl={request.counterpartPhotoUrl}
                          status={status}
                          statusLabel={
                            status === 'active'
                              ? strings.babysitterCalendarToday
                              : status === 'upcoming'
                                ? strings.babysitterCalendarUpcoming
                                : strings.babysitterCalendarCompleted
                          }
                          dateLabel={buildDateLabel(request)}
                          timeLabel={normalizeTimeValue(request.time) || strings.babysitterCalendarNoTime}
                          areaLabel={request.area || undefined}
                          childrenLabel={childrenLabel}
                          notePreview={request.note || undefined}
                          actionLabel={
                            status === 'completed'
                              ? hasTrackedShift
                                ? strings.babysitterShiftOpenExisting
                                : strings.babysitterCalendarTrackShift
                              : undefined
                          }
                          onActionPress={
                            status === 'completed'
                              ? () =>
                                  router.push({
                                    pathname: '/babysitter-shifts',
                                    params: {
                                      parentName: counterpartName,
                                      parentId: request.parentId,
                                      requestId: request.id,
                                      date: request.date,
                                      startTime: normalizeTimeValue(request.time),
                                    },
                                  })
                              : undefined
                          }
                          onPress={() =>
                            router.push(
                              `/chat?requestId=${request.id}&name=${encodeURIComponent(counterpartName)}`
                            )
                          }
                        />
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </AppCard>

          <AppCard backgroundColor={BabyCityPalette.surfaceLow} style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <MaterialIcons name="lightbulb" size={22} color="#d49b11" />
            </View>
            <View style={styles.tipCopy}>
              <AppText variant="bodyLarge" weight="700">
                {strings.babysitterCalendarProfessionalTipTitle}
              </AppText>
              <AppText variant="body" tone="muted" style={styles.tipBody}>
                {strings.babysitterCalendarProfessionalTipBody}
              </AppText>
            </View>
          </AppCard>
        </AppScreen>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: -42,
    left: -54,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: `${BabyCityPalette.primary}10`,
  },
  backdropOrbBottom: {
    position: 'absolute',
    right: -60,
    bottom: 140,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: `${BabyCityPalette.primary}10`,
  },
  screenContent: {
    paddingBottom: 176,
  },
  headerActionButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: `${BabyCityPalette.primary}0d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    color: BabyCityPalette.primary,
  },
  heroSection: {
    paddingHorizontal: 4,
    marginBottom: 22,
    gap: 8,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'right',
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 22,
    color: BabyCityPalette.textSecondary,
  },
  editorialCard: {
    marginBottom: 18,
    borderRadius: 40,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  totalCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${BabyCityPalette.primary}30`,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    backgroundColor: '#ffffff',
  },
  totalCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}0f`,
  },
  totalCardText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  totalCardLabel: {
    color: BabyCityPalette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalCardValue: {
    color: BabyCityPalette.primary,
  },
  totalCardHint: {
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 18,
  },
  summaryTile: {
    width: '48.4%',
    minHeight: 96,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  summaryTileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTileText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  summaryTileLabel: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
  },
  summaryTileValue: {
    textAlign: 'right',
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabel: {
    marginBottom: 10,
    color: BabyCityPalette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'right',
  },
  segmentedWrap: {
    flexDirection: 'row-reverse',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    padding: 6,
  },
  segmentedOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  segmentedOptionText: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'center',
  },
  segmentedOptionTextActive: {
    color: BabyCityPalette.primary,
  },
  undatedSection: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
  },
  inlineChipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineChip: {
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}16`,
  },
  inlineChipText: {
    color: BabyCityPalette.textPrimary,
  },
  groupSection: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  groupHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  groupIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${BabyCityPalette.primary}0d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  groupHeaderHint: {
    textAlign: 'right',
  },
  emptyCard: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    marginBottom: 4,
  },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyBody: {
    marginTop: 8,
    marginBottom: 18,
    maxWidth: 280,
  },
  inlineActionButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: `${BabyCityPalette.primary}0d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionButtonText: {
    color: BabyCityPalette.primary,
  },
  tipCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 8,
  },
  tipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  tipCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tipBody: {
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 22,
  },
  bottomOverlay: {
    paddingHorizontal: 2,
    paddingTop: 18,
    paddingBottom: 4,
  },
  bottomButton: {
    marginTop: 0,
  },
});
