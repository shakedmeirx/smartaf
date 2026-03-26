import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppText from '@/components/ui/AppText';
import BookingHistoryCard from '@/components/parent/BookingHistoryCard';
import { useAppState } from '@/context/AppContext';
import { BabyCityGeometry, BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { strings } from '@/locales';
import { Request } from '@/types/request';

type BookingHistoryGroup = {
  key: string;
  label: string;
  items: Request[];
};

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
    .sort((a, b) => buildRequestTimestamp(b) - buildRequestTimestamp(a));
}

function buildRequestTimestamp(request: Request) {
  if (request.date) {
    const timestamp = new Date(`${request.date}T${request.time || '12:00'}:00`).getTime();
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return new Date(request.createdAt).getTime();
}

function buildMonthLabel(request: Request) {
  if (!request.date) {
    return strings.bookingHistoryUndated;
  }

  const date = new Date(`${request.date}T12:00:00`);
  return new Intl.DateTimeFormat('he-IL', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function groupHistoryByMonth(requests: Request[]) {
  const groups = new Map<string, BookingHistoryGroup>();

  requests.forEach(request => {
    const key = request.date ? request.date.slice(0, 7) : 'undated';
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(request);
      return;
    }

    groups.set(key, {
      key,
      label: buildMonthLabel(request),
      items: [request],
    });
  });

  return Array.from(groups.values());
}

function buildDateLabel(request: Request) {
  if (!request.date) {
    return strings.bookingHistoryUndated;
  }

  const date = new Date(`${request.date}T12:00:00`);
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function resolveStatus(request: Request) {
  if (!request.date) {
    return 'completed' as const;
  }

  const requestDate = new Date(`${request.date}T00:00:00`);
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
  const bookingGroups = useMemo(
    () => groupHistoryByMonth(historyItems),
    [historyItems]
  );
  const upcomingCount = useMemo(
    () => historyItems.filter(item => resolveStatus(item) === 'upcoming').length,
    [historyItems]
  );

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/settings');
  }

  return (
    <AppShell
      title={strings.bookingHistoryTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={handleBack}
      hideHeaderMenuButton
      backButtonVariant="icon"
    >
      <View style={styles.screen}>
        <View style={styles.backdropOrbTop} />
        <View style={styles.backdropOrbBottom} />

        <AppScreen
          scrollable
          backgroundColor={theme.screenBackground}
          contentContainerStyle={[
            styles.content,
            historyItems.length === 0 && styles.contentEmpty,
          ]}
          scrollProps={{ showsVerticalScrollIndicator: false }}
        >
          {historyItems.length === 0 ? (
            <View style={styles.emptyStateWrap}>
              <View style={styles.emptyIllustrationWrap}>
                <View style={styles.emptyGlow} />
                <View style={styles.emptyDashedRing} />

                <View style={styles.emptyMainCircle}>
                  <View style={styles.emptyInnerCircle}>
                    <Ionicons name="time-outline" size={58} color={BabyCityPalette.primary} />
                  </View>

                  <View style={styles.emptyFloatingChipRight}>
                    <Ionicons name="calendar-outline" size={24} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.emptyFloatingChipLeft}>
                    <Ionicons name="checkmark-circle" size={26} color={BabyCityPalette.primary} />
                  </View>
                </View>
              </View>

              <View style={styles.emptyCopyWrap}>
                <AppText variant="h1" weight="800" style={styles.emptyTitle}>
                  {strings.bookingHistoryEmpty}
                </AppText>
                <AppText variant="bodyLarge" tone="muted" style={styles.emptyBody}>
                  {strings.bookingHistoryEmptyHint}
                </AppText>
              </View>

              <View style={styles.emptyActions}>
                <AppButton
                  label={strings.bookingHistoryPrimaryAction}
                  size="lg"
                  onPress={() => router.replace('/parent')}
                  style={styles.emptyPrimaryButton}
                />
                <AppButton
                  label={strings.bookingHistorySecondaryAction}
                  variant="secondary"
                  size="lg"
                  onPress={() => router.push('/parent-requests')}
                  textColor={BabyCityPalette.onSecondaryContainer}
                  backgroundColor={BabyCityPalette.secondaryContainer}
                  style={styles.emptySecondaryButton}
                />
              </View>
            </View>
          ) : (
            <>
              <AppCard style={styles.summaryCard}>
                <View style={styles.summaryMetric}>
                  <AppText variant="caption" tone="muted" style={styles.summaryLabel}>
                    {strings.bookingHistorySummaryUpcoming}
                  </AppText>
                  <AppText variant="h1" weight="800" style={styles.summaryValue}>
                    {upcomingCount}
                  </AppText>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryMetric}>
                  <AppText variant="caption" tone="muted" style={styles.summaryLabel}>
                    {strings.bookingHistorySummaryTotal}
                  </AppText>
                  <AppText variant="h1" weight="800" style={styles.summaryValue}>
                    {historyItems.length}
                  </AppText>
                </View>
              </AppCard>

              {bookingGroups.map((group, groupIndex) => (
                <View
                  key={group.key}
                  style={[
                    styles.monthSection,
                    groupIndex > 0 && styles.monthSectionMuted,
                  ]}
                >
                  <AppText variant="h2" weight="800" style={styles.monthTitle}>
                    {group.label}
                  </AppText>

                  {group.items.map(request => {
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
                        timeLabel={request.time || undefined}
                        locationLabel={request.area || undefined}
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
        </AppScreen>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: 8,
    right: -42,
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: 'rgba(112,42,225,0.06)',
  },
  backdropOrbBottom: {
    position: 'absolute',
    bottom: 42,
    left: -32,
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: 'rgba(233,222,245,0.48)',
  },
  content: {
    paddingBottom: 34,
    paddingTop: 18,
  },
  contentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    color: BabyCityPalette.primary,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: 'rgba(162,173,196,0.22)',
    marginHorizontal: 12,
  },
  monthSection: {
    marginBottom: 30,
  },
  monthSectionMuted: {
    opacity: 0.82,
  },
  monthTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  emptyStateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIllustrationWrap: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  emptyGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(178,140,255,0.16)',
    opacity: 0.65,
  },
  emptyDashedRing: {
    position: 'absolute',
    width: 194,
    height: 194,
    borderRadius: 97,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(166,122,255,0.42)',
  },
  emptyMainCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  emptyInnerCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  emptyFloatingChipRight: {
    position: 'absolute',
    top: 8,
    right: -4,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  emptyFloatingChipLeft: {
    position: 'absolute',
    bottom: 26,
    left: -18,
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceContainer,
    transform: [{ rotate: '-12deg' }],
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  emptyCopyWrap: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    maxWidth: 288,
  },
  emptyTitle: {
    textAlign: 'center',
    color: BabyCityPalette.textPrimary,
    fontSize: 30,
    lineHeight: 38,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 28,
  },
  emptyActions: {
    width: '100%',
    gap: 14,
  },
  emptyPrimaryButton: {
    width: '100%',
  },
  emptySecondaryButton: {
    width: '100%',
    borderWidth: 0,
  },
});
