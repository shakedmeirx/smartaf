import React, { useMemo } from 'react';
import { router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import SectionHeader from '@/components/ui/SectionHeader';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import BookingHistoryCard from '@/components/parent/BookingHistoryCard';
import { useAppState } from '@/context/AppContext';
import { ParentDesignTokens, getRoleTheme } from '@/constants/theme';
import { strings } from '@/locales';
import { Request } from '@/types/request';

function buildAcceptedHistory(incomingRequests: Request[], sentRequests: Request[]) {
  const seen = new Set<string>();

  return [...incomingRequests, ...sentRequests]
    .filter(request => {
      if (request.status !== 'accepted' || seen.has(request.id)) {
        return false;
      }

      seen.add(request.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.date ? new Date(b.date).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
}

function buildDateLabel(request: Request) {
  if (!request.date) {
    return strings.myPostsNoDate;
  }

  return request.time ? `${request.date} · ${request.time}` : request.date;
}

function resolveStatus(request: Request) {
  if (!request.date) {
    return 'completed' as const;
  }

  const requestDate = new Date(request.date);
  const today = new Date();
  requestDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return requestDate.getTime() >= today.getTime() ? ('upcoming' as const) : ('completed' as const);
}

export default function BookingHistoryScreen() {
  const { incomingRequests, sentRequests } = useAppState();
  const theme = getRoleTheme('parent');

  const historyItems = useMemo(
    () => buildAcceptedHistory(incomingRequests, sentRequests),
    [incomingRequests, sentRequests]
  );
  const upcomingCount = useMemo(
    () => historyItems.filter(item => resolveStatus(item) === 'upcoming').length,
    [historyItems]
  );

  return (
    <AppShell
      title={strings.bookingHistoryTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      <AppScreen scrollable backgroundColor={theme.screenBackground}>
        <AppCard
          role="parent"
          variant="hero"
          backgroundColor={theme.highlightedSurface}
          borderColor="transparent"
          style={{ marginBottom: ParentDesignTokens.spacing.cardGap }}
        >
          <SectionHeader
            title={strings.bookingHistoryTitle}
            subtitle={
              historyItems.length > 0
                ? strings.bookingHistorySubtitle
                : strings.bookingHistoryEmptyHint
            }
          />
          {historyItems.length > 0 ? (
            <AppCard
              variant="panel"
              style={{ marginTop: 14, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}
            >
              <AppChip
                label={`${historyItems.length} ${strings.bookingHistoryCountSuffix}`}
                tone="muted"
                size="sm"
              />
              <AppChip
                label={`${strings.bookingHistoryUpcoming} ${upcomingCount}`}
                tone="accent"
                size="sm"
              />
            </AppCard>
          ) : null}
        </AppCard>

        {historyItems.length === 0 ? (
          <ScreenStateCard
            role="parent"
            icon="calendar-outline"
            title={strings.bookingHistoryEmpty}
            body={strings.bookingHistoryEmptyHint}
            actionLabel={strings.navChats}
            onActionPress={() => router.push('/parent-requests')}
          />
        ) : (
          historyItems.map(request => {
            const counterpartName = request.counterpartName ?? strings.notFilled;
            const status = resolveStatus(request);

            return (
              <BookingHistoryCard
                key={request.id}
                counterpartName={counterpartName}
                counterpartPhotoUrl={request.counterpartPhotoUrl}
                status={status}
                statusLabel={
                  status === 'upcoming'
                    ? strings.bookingHistoryUpcoming
                    : strings.bookingHistoryCompleted
                }
                dateLabel={buildDateLabel(request)}
                locationLabel={request.area || undefined}
                onPress={() =>
                  router.push(
                    `/chat?requestId=${request.id}&name=${encodeURIComponent(counterpartName)}`
                  )
                }
              />
            );
          })
        )}
      </AppScreen>
    </AppShell>
  );
}
