import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import BabysitterStatCard from '@/components/babysitter/BabysitterStatCard';
import { useAppState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  BabyCityPalette,
  BabysitterDesignTokens,
  getRoleTheme,
} from '@/constants/theme';
import { strings } from '@/locales';
import {
  formatShiftCurrency,
  formatShiftHours,
  loadBabysitterShifts,
} from '@/lib/babysitterShifts';
import { BabysitterShift } from '@/types/shift';

type ShiftSummary = {
  count: number;
  hours: number;
  amount: number;
  paidAmount: number;
  unpaidAmount: number;
};

type ShiftStatsRange = 'currentMonth' | 'previousMonth' | 'thisWeek' | 'all';

function summarizeShifts(shifts: BabysitterShift[]): ShiftSummary {
  return shifts.reduce<ShiftSummary>(
    (acc, shift) => {
      acc.count += 1;
      acc.hours += shift.hoursWorked;
      acc.amount += shift.totalAmount;
      if (shift.paymentStatus === 'paid') {
        acc.paidAmount += shift.totalAmount;
      } else {
        acc.unpaidAmount += shift.totalAmount;
      }
      return acc;
    },
    { count: 0, hours: 0, amount: 0, paidAmount: 0, unpaidAmount: 0 }
  );
}

function isSameCalendarMonth(dateValue: string, reference: Date) {
  const target = new Date(`${dateValue}T12:00:00`);
  return (
    target.getFullYear() === reference.getFullYear() &&
    target.getMonth() === reference.getMonth()
  );
}

function isWithinCurrentWeek(dateValue: string) {
  const target = new Date(`${dateValue}T12:00:00`);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return target >= startOfWeek && target <= endOfWeek;
}

function buildShiftTimestamp(shift: BabysitterShift) {
  return new Date(`${shift.shiftDate}T${shift.startTime || '00:00'}`).getTime();
}

function formatShiftMeta(shift: BabysitterShift) {
  const dateLabel = new Date(`${shift.shiftDate}T12:00:00`).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
  });
  const timeLabel =
    shift.startTime && shift.endTime
      ? `${shift.startTime} - ${shift.endTime}`
      : shift.startTime || shift.endTime || strings.babysitterCalendarNoTime;

  return `${dateLabel} • ${timeLabel}`;
}

export default function BabysitterStatsScreen() {
  const {
    currentBabysitterProfileId,
    posts,
    savedPostIds,
    incomingRequests,
    chatThreads,
  } = useAppState();
  const { dbUser } = useAuth();
  const theme = getRoleTheme('babysitter');
  const [shifts, setShifts] = useState<BabysitterShift[]>([]);
  const [shiftRange, setShiftRange] = useState<ShiftStatsRange>('currentMonth');

  const pendingCount = incomingRequests.filter(request => request.status === 'pending').length;
  const firstName = dbUser?.name?.trim().split(/\s+/)[0] ?? '';

  useEffect(() => {
    let isMounted = true;

    async function loadShiftSummary(babysitterProfileId: string) {
      const { shifts: nextShifts, error } = await loadBabysitterShifts(babysitterProfileId);

      if (!isMounted || error) {
        return;
      }

      setShifts(nextShifts);
    }

    if (!currentBabysitterProfileId) {
      setShifts([]);
      return () => {
        isMounted = false;
      };
    }

    void loadShiftSummary(currentBabysitterProfileId);

    return () => {
      isMounted = false;
    };
  }, [currentBabysitterProfileId]);

  const sortedShifts = useMemo(
    () => [...shifts].sort((a, b) => buildShiftTimestamp(b) - buildShiftTimestamp(a)),
    [shifts]
  );

  const currentMonthShifts = useMemo(() => {
    const now = new Date();
    return shifts.filter(shift => isSameCalendarMonth(shift.shiftDate, now));
  }, [shifts]);

  const previousMonthShifts = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return shifts.filter(shift => isSameCalendarMonth(shift.shiftDate, previousMonth));
  }, [shifts]);

  const currentMonthSummary = useMemo(
    () => summarizeShifts(currentMonthShifts),
    [currentMonthShifts]
  );

  const previousMonthSummary = useMemo(
    () => summarizeShifts(previousMonthShifts),
    [previousMonthShifts]
  );

  const rangeLabel =
    shiftRange === 'currentMonth'
      ? strings.babysitterStatsRangeCurrentMonth
      : shiftRange === 'previousMonth'
        ? strings.babysitterStatsRangePreviousMonth
        : shiftRange === 'thisWeek'
          ? strings.babysitterStatsRangeThisWeek
          : strings.babysitterStatsRangeAll;

  const filteredShifts = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return shifts.filter(shift => {
      if (shiftRange === 'all') {
        return true;
      }

      if (shiftRange === 'currentMonth') {
        return isSameCalendarMonth(shift.shiftDate, now);
      }

      if (shiftRange === 'previousMonth') {
        return isSameCalendarMonth(shift.shiftDate, previousMonth);
      }

      return isWithinCurrentWeek(shift.shiftDate);
    });
  }, [shiftRange, shifts]);

  const filteredShiftSummary = useMemo(() => {
    const summary = summarizeShifts(filteredShifts);

    return {
      ...summary,
      familiesWorked: new Set(
        filteredShifts
          .map(shift => shift.parentId ?? shift.parentName.trim())
          .filter(Boolean)
      ).size,
      averageHourlyIncome: summary.hours > 0 ? summary.amount / summary.hours : 0,
    };
  }, [filteredShifts]);

  const recentShifts = useMemo(
    () => sortedShifts.slice(0, 3),
    [sortedShifts]
  );

  const monthDeltaLabel = useMemo(() => {
    const currentAmount = currentMonthSummary.amount;
    const previousAmount = previousMonthSummary.amount;

    if (currentAmount <= 0) {
      return null;
    }

    if (previousAmount <= 0) {
      return strings.babysitterStatsMonthChangeNew;
    }

    const deltaPercent = Math.round(((currentAmount - previousAmount) / previousAmount) * 100);

    return deltaPercent >= 0
      ? strings.babysitterStatsMonthChangePositive(deltaPercent)
      : strings.babysitterStatsMonthChangeNegative(deltaPercent);
  }, [currentMonthSummary.amount, previousMonthSummary.amount]);

  return (
    <AppShell
      title={strings.babysitterStatsBrandTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      backButtonVariant="icon"
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace('/my-profile');
      }}
      titleContent={
        <View style={styles.topBrandWrap}>
          <AppText variant="h2" weight="800" style={styles.topBrandText}>
            {strings.babysitterStatsBrandTitle}
          </AppText>
        </View>
      }
      renderHeaderActions={({ openMenu }) => (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={openMenu}
          style={styles.headerMenuButton}
        >
          <MaterialIcons name="menu" size={22} color={BabyCityPalette.textPrimary} />
        </TouchableOpacity>
      )}
      hideHeaderMenuButton
      floatingActionButton={
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.88}
          onPress={() => router.push('/babysitter-shifts')}
          style={styles.floatingActionButton}
        >
          <MaterialIcons name="add" size={30} color="#ffffff" />
        </TouchableOpacity>
      }
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.heroSection}>
          <AppText variant="h1" weight="800" style={styles.heroTitle}>
            {strings.babysitterStatsDashboardTitle}
          </AppText>
          <AppText variant="bodyLarge" tone="muted" style={styles.heroSubtitle}>
            {firstName
              ? strings.babysitterStatsGreeting(firstName)
              : strings.babysitterStatsGreetingFallback}
          </AppText>
        </View>

        <View style={styles.primaryStack}>
          <BabysitterStatCard
            label={strings.babysitterStatsMonthIncome}
            value={formatShiftCurrency(currentMonthSummary.amount)}
            tone="primary"
            layout="stacked"
            fill={false}
            badgeLabel={monthDeltaLabel ?? undefined}
            badgeTone={currentMonthSummary.amount >= previousMonthSummary.amount ? 'success' : 'warning'}
            iconNode={<MaterialIcons name="payments" size={24} color={BabyCityPalette.primary} />}
            style={styles.primaryStatCard}
          />

          <BabysitterStatCard
            label={strings.babysitterStatsHoursThisMonth}
            value={`${formatShiftHours(currentMonthSummary.hours)} ${strings.babysitterShiftManagerSummaryHours}`}
            tone="indigo"
            layout="stacked"
            fill={false}
            iconNode={<MaterialIcons name="schedule" size={24} color="#6366f1" />}
            style={styles.primaryStatCard}
          />

          <BabysitterStatCard
            label={strings.babysitterStatsCompletedThisMonth}
            value={String(currentMonthSummary.count)}
            tone="primary"
            layout="stacked"
            fill={false}
            variant="premium"
            badgeLabel={strings.babysitterStatsRangeCurrentMonth}
            iconNode={<MaterialIcons name="trending-up" size={24} color="#ffffff" />}
            style={styles.primaryStatCard}
          />
        </View>

        <View style={styles.sectionHeaderRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => router.push('/babysitter-shifts')}
            style={styles.sectionAction}
          >
            <AppText variant="caption" weight="700" style={styles.sectionActionText}>
              {strings.babysitterStatsShowAll}
            </AppText>
            <MaterialIcons name="chevron-left" size={16} color={BabyCityPalette.primary} />
          </TouchableOpacity>
          <AppText variant="h3" weight="800" style={styles.sectionTitle}>
            {strings.babysitterStatsRecentShifts}
          </AppText>
        </View>

        <AppCard role="babysitter" style={styles.recentCard}>
          {recentShifts.length === 0 ? (
            <View style={styles.emptyRecentState}>
              <AppText variant="bodyLarge" weight="700">
                {strings.babysitterStatsRecentShiftsEmpty}
              </AppText>
              <AppText variant="body" tone="muted">
                {strings.babysitterShiftManagerEmptyHint}
              </AppText>
            </View>
          ) : (
            recentShifts.map((shift, index) => {
              const paid = shift.paymentStatus === 'paid';

              return (
                <TouchableOpacity
                  key={shift.id}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={() => router.push('/babysitter-shifts')}
                  style={[
                    styles.shiftRow,
                    index !== recentShifts.length - 1 && styles.shiftRowBorder,
                  ]}
                >
                  <View style={styles.shiftMetaWrap}>
                    <View style={styles.shiftAmountWrap}>
                      <AppText variant="bodyLarge" weight="700">
                        {formatShiftCurrency(shift.totalAmount)}
                      </AppText>
                      <View
                        style={[
                          styles.shiftStatusPill,
                          paid ? styles.shiftStatusPaid : styles.shiftStatusUnpaid,
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight="700"
                          style={paid ? styles.shiftStatusPaidText : styles.shiftStatusUnpaidText}
                        >
                          {paid ? strings.babysitterShiftPaid : strings.babysitterShiftUnpaid}
                        </AppText>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-left" size={20} color={BabyCityPalette.outlineVariant} />
                  </View>

                  <View style={styles.shiftMain}>
                    <View style={styles.shiftTextWrap}>
                      <AppText variant="bodyLarge" weight="700">
                        {shift.parentName.trim() || strings.familyFeedAnonymous}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {formatShiftMeta(shift)}
                      </AppText>
                    </View>
                    <View style={styles.shiftIconWrap}>
                      <MaterialIcons name="child-care" size={22} color={BabyCityPalette.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </AppCard>

        <AppCard role="babysitter" variant="panel" style={styles.secondaryPanel}>
          <View style={styles.secondaryHeader}>
            <View style={styles.sectionIconChip}>
              <MaterialIcons name="insights" size={20} color={BabyCityPalette.primary} />
            </View>
            <View style={styles.secondaryHeaderText}>
              <AppText variant="bodyLarge" weight="700">
                {strings.babysitterStatsShiftInsights}
              </AppText>
              <AppText variant="caption" tone="muted">
                {`${strings.babysitterStatsShiftInsightsSubtitle} • ${rangeLabel}`}
              </AppText>
            </View>
          </View>

          <View style={styles.rangeRow}>
            <AppChip
              label={strings.babysitterStatsRangeCurrentMonth}
              tone="primary"
              variant="filter"
              selected={shiftRange === 'currentMonth'}
              onPress={() => setShiftRange('currentMonth')}
              size="sm"
            />
            <AppChip
              label={strings.babysitterStatsRangePreviousMonth}
              tone="accent"
              variant="filter"
              selected={shiftRange === 'previousMonth'}
              onPress={() => setShiftRange('previousMonth')}
              size="sm"
            />
            <AppChip
              label={strings.babysitterStatsRangeThisWeek}
              tone="success"
              variant="filter"
              selected={shiftRange === 'thisWeek'}
              onPress={() => setShiftRange('thisWeek')}
              size="sm"
            />
            <AppChip
              label={strings.babysitterStatsRangeAll}
              tone="muted"
              variant="filter"
              selected={shiftRange === 'all'}
              onPress={() => setShiftRange('all')}
              size="sm"
            />
          </View>

          <View style={styles.secondaryGrid}>
            <BabysitterStatCard
              label={strings.babysitterStatsFamiliesWorked}
              value={String(filteredShiftSummary.familiesWorked)}
              icon="people-outline"
              tone="accent"
              fill={false}
              style={styles.secondaryGridItem}
            />
            <BabysitterStatCard
              label={strings.babysitterStatsAverageHourly}
              value={formatShiftCurrency(filteredShiftSummary.averageHourlyIncome)}
              icon="trending-up-outline"
              tone="primary"
              fill={false}
              style={styles.secondaryGridItem}
            />
            <BabysitterStatCard
              label={strings.babysitterShiftPaid}
              value={formatShiftCurrency(filteredShiftSummary.paidAmount)}
              icon="cash-outline"
              tone="success"
              fill={false}
              style={styles.secondaryGridItem}
            />
            <BabysitterStatCard
              label={strings.babysitterShiftUnpaid}
              value={formatShiftCurrency(filteredShiftSummary.unpaidAmount)}
              icon="wallet-outline"
              tone="warning"
              fill={false}
              style={styles.secondaryGridItem}
            />
          </View>
        </AppCard>

        <View style={styles.sectionHeaderRowSecondary}>
          <View style={styles.sectionIconChip}>
            <MaterialIcons name="bar-chart" size={20} color={BabyCityPalette.primary} />
          </View>
          <AppText variant="bodyLarge" weight="700">
            {strings.babysitterStatsActivityTitle}
          </AppText>
        </View>

        <View style={styles.secondaryGrid}>
          <BabysitterStatCard
            label={strings.babysitterStatsOpenPosts}
            value={String(posts.length)}
            icon="document-text-outline"
            tone="accent"
            fill={false}
            style={styles.secondaryGridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsSavedPosts}
            value={String(savedPostIds.size)}
            icon="bookmark-outline"
            tone="primary"
            fill={false}
            style={styles.secondaryGridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsPendingRequests}
            value={String(pendingCount)}
            icon="mail-unread-outline"
            tone="success"
            fill={false}
            style={styles.secondaryGridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsActiveChats}
            value={String(chatThreads.length)}
            icon="chatbubble-ellipses-outline"
            tone="muted"
            fill={false}
            style={styles.secondaryGridItem}
          />
        </View>
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 152,
  },
  topBrandWrap: {
    alignItems: 'flex-end',
  },
  topBrandText: {
    color: BabyCityPalette.primary,
    letterSpacing: -0.4,
  },
  headerMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf1ff',
  },
  floatingActionButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primary,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  heroSection: {
    marginBottom: 22,
    gap: 6,
    paddingHorizontal: 2,
  },
  heroTitle: {
    textAlign: 'right',
  },
  heroSubtitle: {
    textAlign: 'right',
  },
  primaryStack: {
    gap: 14,
    marginBottom: 26,
  },
  primaryStatCard: {
    minHeight: 142,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionHeaderRowSecondary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    color: BabyCityPalette.textPrimary,
  },
  sectionAction: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  sectionActionText: {
    color: BabyCityPalette.primary,
  },
  recentCard: {
    paddingVertical: 4,
    marginBottom: 18,
  },
  emptyRecentState: {
    gap: 6,
    alignItems: 'flex-end',
    paddingVertical: 12,
  },
  shiftRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 16,
  },
  shiftRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 119, 140, 0.15)',
  },
  shiftMain: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  shiftIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primarySoft,
  },
  shiftTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  shiftMetaWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  shiftAmountWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  shiftStatusPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  shiftStatusPaid: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  shiftStatusUnpaid: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  shiftStatusPaidText: {
    color: '#059669',
  },
  shiftStatusUnpaidText: {
    color: '#c2410c',
  },
  secondaryPanel: {
    marginBottom: 18,
    padding: 16,
  },
  secondaryHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  secondaryHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  sectionIconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  rangeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  secondaryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
  },
  secondaryGridItem: {
    width: '48%',
    marginBottom: 14,
  },
});
