import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import SectionHeader from '@/components/ui/SectionHeader';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import BabysitterScheduleCard from '@/components/babysitter/BabysitterScheduleCard';
import { useAppState } from '@/context/AppContext';
import { BabysitterDesignTokens, getRoleTheme } from '@/constants/theme';
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

  return (
    <AppShell
      title={strings.babysitterCalendarTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      <AppScreen scrollable backgroundColor={theme.screenBackground}>
        <AppCard
          role="babysitter"
          variant="hero"
          backgroundColor={theme.highlightedSurface}
          borderColor="transparent"
          style={styles.heroCard}
        >
          <SectionHeader
            title={strings.babysitterCalendarTitle}
            subtitle={strings.babysitterCalendarSubtitle}
          />
          <AppCard role="babysitter" variant="panel" style={styles.summaryCard}>
            <View style={styles.summaryChips}>
              <AppChip
                label={`${todayCount} ${strings.babysitterCalendarToday}`}
                tone="success"
                size="sm"
              />
              <AppChip
                label={`${upcomingCount} ${strings.babysitterCalendarUpcoming}`}
                tone="accent"
                size="sm"
              />
              <AppChip
                label={`${completedCount} ${strings.babysitterCalendarCompleted}`}
                tone="muted"
                size="sm"
              />
              <AppChip
                label={`${datedItems.length} ${strings.babysitterCalendarCountSuffix}`}
                tone="primary"
                size="sm"
              />
            </View>
          </AppCard>
        </AppCard>

        {undatedItems.length > 0 ? (
          <AppCard role="babysitter" variant="panel" style={styles.undatedCard}>
            <SectionHeader
              title={strings.babysitterCalendarUndatedTitle}
              subtitle={strings.babysitterCalendarUndatedHint}
            />
            <View style={styles.undatedChips}>
              {undatedItems.map(item => (
                <AppChip
                  key={item.id}
                  label={item.counterpartName ?? strings.familyFeedAnonymous}
                  tone="warning"
                  size="sm"
                />
              ))}
            </View>
          </AppCard>
        ) : null}

        {datedItems.length === 0 ? (
          <ScreenStateCard
            role="babysitter"
            icon="calendar-outline"
            title={strings.babysitterCalendarEmpty}
            body={strings.babysitterCalendarEmptyHint}
            actionLabel={strings.postFeedTitle}
            onActionPress={() => router.replace('/babysitter')}
          />
        ) : (
          <>
            <View style={styles.filterRow}>
              <AppChip
                label={strings.babysitterCalendarAll}
                tone="primary"
                variant="filter"
                selected={activeFilter === 'all'}
                onPress={() => setActiveFilter('all')}
              />
              <AppChip
                label={strings.babysitterCalendarToday}
                tone="success"
                variant="filter"
                selected={activeFilter === 'active'}
                onPress={() => setActiveFilter('active')}
              />
              <AppChip
                label={strings.babysitterCalendarUpcoming}
                tone="accent"
                variant="filter"
                selected={activeFilter === 'upcoming'}
                onPress={() => setActiveFilter('upcoming')}
              />
              <AppChip
                label={strings.babysitterCalendarCompleted}
                tone="muted"
                variant="filter"
                selected={activeFilter === 'completed'}
                onPress={() => setActiveFilter('completed')}
              />
            </View>

            {groupedItems.length === 0 ? (
              <ScreenStateCard
                role="babysitter"
                icon="calendar-clear-outline"
                title={strings.babysitterCalendarNoMatches}
                body={strings.babysitterCalendarNoMatchesHint}
                actionLabel={strings.babysitterCalendarAll}
                onActionPress={() => setActiveFilter('all')}
              />
            ) : (
              groupedItems.map(group => (
                <View key={group.key} style={styles.groupSection}>
                  <SectionHeader
                    title={group.title}
                    subtitle={`${group.items.length} ${strings.babysitterCalendarCountSuffix}`}
                    style={styles.groupHeader}
                  />

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
              ))
            )}
          </>
        )}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  summaryCard: {
    marginTop: 14,
  },
  summaryChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  undatedCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  undatedChips: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  groupSection: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  groupHeader: {
    marginBottom: 12,
  },
});
