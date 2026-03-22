import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import SectionHeader from '@/components/ui/SectionHeader';
import SettingsListCard from '@/components/parent/SettingsListCard';
import BabysitterStatCard from '@/components/babysitter/BabysitterStatCard';
import { useAppState } from '@/context/AppContext';
import {
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

export default function BabysitterStatsScreen() {
  const {
    currentBabysitterProfileId,
    posts,
    savedPostIds,
    incomingRequests,
    chatThreads,
  } = useAppState();
  const theme = getRoleTheme('babysitter');
  const [shifts, setShifts] = useState<BabysitterShift[]>([]);
  const [shiftRange, setShiftRange] = useState<ShiftStatsRange>('currentMonth');

  const pendingCount = incomingRequests.filter(request => request.status === 'pending').length;

  useEffect(() => {
    let isMounted = true;

    async function loadShiftSummary(babysitterProfileId: string) {
      const { shifts, error } = await loadBabysitterShifts(babysitterProfileId);

      if (!isMounted || error) {
        return;
      }

      setShifts(shifts);
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

  const overallShiftSummary = useMemo(
    () =>
      shifts.reduce<ShiftSummary>(
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
      ),
    [shifts]
  );

  const rangeLabel =
    shiftRange === 'currentMonth'
      ? strings.babysitterStatsRangeCurrentMonth
      : shiftRange === 'previousMonth'
        ? strings.babysitterStatsRangePreviousMonth
        : shiftRange === 'thisWeek'
          ? strings.babysitterStatsRangeThisWeek
          : strings.babysitterStatsRangeAll;

  const filteredShiftSummary = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const filteredShifts = shifts.filter(shift => {
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

    const summary = filteredShifts.reduce<ShiftSummary>(
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

    return {
      ...summary,
      familiesWorked: new Set(
        filteredShifts
          .map(shift => shift.parentId ?? shift.parentName.trim())
          .filter(Boolean)
      ).size,
      averageHourlyIncome: summary.hours > 0 ? summary.amount / summary.hours : 0,
    };
  }, [shiftRange, shifts]);

  return (
    <AppShell
      title={strings.babysitterStatsTitle}
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
            title={strings.babysitterStatsTitle}
            subtitle={strings.babysitterStatsSubtitle}
          />
          <View style={styles.heroChips}>
            <AppChip
              label={`${pendingCount} ${strings.babysitterStatsPendingRequests}`}
              tone="success"
              size="sm"
            />
            <AppChip
              label={`${posts.length} ${strings.babysitterStatsOpenPosts}`}
              tone="accent"
              size="sm"
            />
            <AppChip
              label={`${overallShiftSummary.count} ${strings.babysitterShiftManagerSummaryShifts}`}
              tone="primary"
              size="sm"
            />
          </View>
        </AppCard>

        <AppCard role="babysitter" variant="panel" style={styles.summaryCard}>
          <SectionHeader
            title={strings.babysitterStatsShiftInsights}
            subtitle={rangeLabel}
          />
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
          <View style={styles.summaryHighlights}>
            <AppChip
              label={`${filteredShiftSummary.count} ${strings.babysitterShiftManagerSummaryShifts}`}
              tone="primary"
              size="sm"
            />
            <AppChip
              label={`${formatShiftHours(filteredShiftSummary.hours)} ${strings.babysitterShiftManagerSummaryHours}`}
              tone="accent"
              size="sm"
            />
            <AppChip
              label={`${formatShiftCurrency(filteredShiftSummary.amount)} ${strings.babysitterShiftManagerSummaryIncome}`}
              tone="success"
              size="sm"
            />
          </View>
        </AppCard>

        <View style={styles.grid}>
          <BabysitterStatCard
            label={strings.babysitterShiftManagerSummaryShifts}
            value={String(filteredShiftSummary.count)}
            icon="briefcase-outline"
            tone="primary"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsFamiliesWorked}
            value={String(filteredShiftSummary.familiesWorked)}
            icon="people-outline"
            tone="accent"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterShiftManagerSummaryHours}
            value={formatShiftHours(filteredShiftSummary.hours)}
            icon="time-outline"
            tone="success"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsAverageHourly}
            value={formatShiftCurrency(filteredShiftSummary.averageHourlyIncome)}
            icon="trending-up-outline"
            tone="muted"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterShiftPaid}
            value={formatShiftCurrency(filteredShiftSummary.paidAmount)}
            icon="cash-outline"
            tone="success"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterShiftUnpaid}
            value={formatShiftCurrency(filteredShiftSummary.unpaidAmount)}
            icon="wallet-outline"
            tone="muted"
            fill={false}
            style={styles.gridItem}
          />
        </View>

        <SectionHeader
          title={strings.babysitterStatsActivityTitle}
          style={styles.gridHeader}
        />

        <View style={styles.grid}>
          <BabysitterStatCard
            label={strings.babysitterStatsOpenPosts}
            value={String(posts.length)}
            icon="document-text-outline"
            tone="accent"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsSavedPosts}
            value={String(savedPostIds.size)}
            icon="bookmark-outline"
            tone="primary"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsPendingRequests}
            value={String(pendingCount)}
            icon="mail-unread-outline"
            tone="success"
            fill={false}
            style={styles.gridItem}
          />
          <BabysitterStatCard
            label={strings.babysitterStatsActiveChats}
            value={String(chatThreads.length)}
            icon="chatbubble-ellipses-outline"
            tone="muted"
            fill={false}
            style={styles.gridItem}
          />
        </View>

        <SectionHeader
          title={strings.babysitterStatsShortcuts}
          style={styles.shortcutsHeader}
        />

        <SettingsListCard
          role="babysitter"
          items={[
            {
              key: 'availability',
              label: strings.drawerAvailability,
              icon: 'calendar-outline',
              onPress: () => router.push('/babysitter-availability'),
            },
            {
              key: 'shift-manager',
              label: strings.drawerShiftManager,
              icon: 'cash-outline',
              onPress: () => router.push('/babysitter-shifts'),
            },
            {
              key: 'calendar',
              label: strings.drawerCalendar,
              icon: 'calendar-number-outline',
              onPress: () => router.push('/babysitter-calendar'),
            },
          ]}
        />
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  heroChips: {
    marginTop: 14,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  rangeRow: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryHighlights: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridHeader: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  gridItem: {
    width: '48.3%',
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  gridItemWide: {
    width: '100%',
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  shortcutsHeader: {
    marginBottom: 12,
  },
});
