import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppChip from '@/components/ui/AppChip';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import AppTextArea from '@/components/ui/AppTextArea';
import DateTimePicker from '@/components/ui/DateTimePicker';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import BabysitterStatCard from '@/components/babysitter/BabysitterStatCard';
import BabysitterShiftEntryCard from '@/components/babysitter/BabysitterShiftEntryCard';
import { useAppState } from '@/context/AppContext';
import {
  BabysitterDesignTokens,
  BabyCityGeometry,
  BabyCityPalette,
  getRoleTheme,
} from '@/constants/theme';
import { strings } from '@/locales';
import {
  calculateShiftHours,
  calculateShiftTotal,
  createBabysitterShift,
  deleteBabysitterShift,
  formatShiftCurrency,
  formatShiftHours,
  loadBabysitterShifts,
  setBabysitterShiftPaymentStatus,
  updateBabysitterShift,
} from '@/lib/babysitterShifts';
import { normalizeTimeValue } from '@/lib/time';
import { BabysitterShift, ShiftPaymentStatus } from '@/types/shift';


type KnownFamily = {
  parentId: string;
  parentName: string;
  requestId: string | null;
};

type ShiftHistoryMonthFilter = 'all' | 'currentMonth' | 'previousMonth';
type ShiftHistoryTypeFilter = 'all' | 'linked' | 'manual';
type ShiftHistoryPaymentFilter = 'all' | ShiftPaymentStatus;
type ShiftHistorySort = 'newest' | 'oldest' | 'amount';

function groupShiftsByMonth(shifts: BabysitterShift[]) {
  const groups: { month: string; shifts: BabysitterShift[] }[] = [];
  for (const shift of shifts) {
    const month = new Date(`${shift.shiftDate}T12:00:00`).toLocaleDateString('he-IL', {
      month: 'long',
      year: 'numeric',
    });
    const existing = groups.find(g => g.month === month);
    if (existing) {
      existing.shifts.push(shift);
    } else {
      groups.push({ month, shifts: [shift] });
    }
  }
  return groups;
}

function isSameCalendarMonth(dateValue: string, reference: Date) {
  const target = new Date(`${dateValue}T12:00:00`);
  return (
    target.getFullYear() === reference.getFullYear() &&
    target.getMonth() === reference.getMonth()
  );
}

function buildShiftTimestamp(shift: BabysitterShift) {
  return new Date(`${shift.shiftDate}T${shift.startTime || '00:00'}`).getTime();
}

export default function BabysitterShiftsScreen() {
  const theme = getRoleTheme('babysitter');
  const scrollRef = useRef<ScrollView | null>(null);
  const params = useLocalSearchParams<{
    parentName?: string;
    parentId?: string;
    requestId?: string;
    date?: string;
    startTime?: string;
  }>();
  const {
    currentBabysitterProfileId,
    incomingRequests,
    sentRequests,
  } = useAppState();

  const [parentName, setParentName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<ShiftPaymentStatus>('unpaid');
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<BabysitterShift[]>([]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [historyMonthFilter, setHistoryMonthFilter] = useState<ShiftHistoryMonthFilter>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<ShiftHistoryTypeFilter>('all');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<ShiftHistoryPaymentFilter>('all');
  const [historySort, setHistorySort] = useState<ShiftHistorySort>('newest');
  const [historyFamilyFilter, setHistoryFamilyFilter] = useState<string | null>(null);
  const [historyFiltersOpen, setHistoryFiltersOpen] = useState(false);
  const [autoOpenedTrackedRequestId, setAutoOpenedTrackedRequestId] = useState<string | null>(null);
  const [paymentUpdatingShiftId, setPaymentUpdatingShiftId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const knownFamilies = useMemo<KnownFamily[]>(() => {
    const map = new Map<string, KnownFamily>();

    [...incomingRequests, ...sentRequests]
      .filter(request => request.status === 'accepted' && request.parentId)
      .forEach(request => {
        if (map.has(request.parentId)) {
          return;
        }

        map.set(request.parentId, {
          parentId: request.parentId,
          parentName: request.counterpartName?.trim() || strings.familyFeedAnonymous,
          requestId: request.id,
        });
      });

    return Array.from(map.values());
  }, [incomingRequests, sentRequests]);

  const hoursWorked = useMemo(
    () => calculateShiftHours(startTime, endTime),
    [startTime, endTime]
  );

  const hourlyRateNumber = useMemo(() => {
    const normalized = hourlyRate.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [hourlyRate]);

  const totalAmount = useMemo(() => {
    if (hoursWorked === null || hourlyRateNumber === null) {
      return null;
    }

    return calculateShiftTotal(hoursWorked, hourlyRateNumber);
  }, [hoursWorked, hourlyRateNumber]);

  const totals = useMemo(() => {
    return shifts.reduce(
      (acc, shift) => {
        acc.amount += shift.totalAmount;
        acc.hours += shift.hoursWorked;
        acc.count += 1;
        if (shift.paymentStatus === 'paid') {
          acc.paidAmount += shift.totalAmount;
        } else {
          acc.unpaidAmount += shift.totalAmount;
        }
        return acc;
      },
      { count: 0, hours: 0, amount: 0, paidAmount: 0, unpaidAmount: 0 }
    );
  }, [shifts]);

  const existingTrackedShift = useMemo(() => {
    if (!selectedRequestId) {
      return null;
    }

    return shifts.find(shift => shift.requestId === selectedRequestId) ?? null;
  }, [selectedRequestId, shifts]);

  const editingShift = useMemo(
    () => shifts.find(shift => shift.id === editingShiftId) ?? null,
    [editingShiftId, shifts]
  );

  const shiftFamilies = useMemo(
    () =>
      Array.from(
        new Set(
          shifts
            .map(shift => shift.parentName.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'he')),
    [shifts]
  );

  const filteredShifts = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const nextShifts = shifts.filter(shift => {
      const matchesMonth =
        historyMonthFilter === 'all'
          ? true
          : historyMonthFilter === 'currentMonth'
            ? isSameCalendarMonth(shift.shiftDate, now)
            : isSameCalendarMonth(shift.shiftDate, previousMonth);

      const matchesType =
        historyTypeFilter === 'all'
          ? true
          : historyTypeFilter === 'linked'
            ? Boolean(shift.requestId)
            : !shift.requestId;

      const matchesPayment =
        historyPaymentFilter === 'all' ? true : shift.paymentStatus === historyPaymentFilter;

      const matchesFamily =
        historyFamilyFilter === null ? true : shift.parentName.trim() === historyFamilyFilter;

      return matchesMonth && matchesType && matchesPayment && matchesFamily;
    });

    return nextShifts.sort((a, b) => {
      if (historySort === 'amount') {
        return b.totalAmount - a.totalAmount;
      }

      const delta = buildShiftTimestamp(b) - buildShiftTimestamp(a);
      return historySort === 'newest' ? delta : -delta;
    });
  }, [historyFamilyFilter, historyMonthFilter, historyPaymentFilter, historySort, historyTypeFilter, shifts]);

  const historyFiltersActive =
    historyMonthFilter !== 'all' ||
    historyTypeFilter !== 'all' ||
    historyPaymentFilter !== 'all' ||
    historySort !== 'newest' ||
    historyFamilyFilter !== null;

  const activeHistoryFilterChips = useMemo(() => {
    const chips: { key: string; label: string; tone: 'primary' | 'accent' | 'success' | 'muted' }[] = [];

    if (historyMonthFilter === 'currentMonth') {
      chips.push({ key: 'month-current', label: strings.babysitterShiftFilterCurrentMonth, tone: 'accent' });
    } else if (historyMonthFilter === 'previousMonth') {
      chips.push({ key: 'month-previous', label: strings.babysitterShiftFilterPreviousMonth, tone: 'muted' });
    }

    if (historyTypeFilter === 'linked') {
      chips.push({ key: 'type-linked', label: strings.babysitterShiftFilterLinked, tone: 'primary' });
    } else if (historyTypeFilter === 'manual') {
      chips.push({ key: 'type-manual', label: strings.babysitterShiftFilterManual, tone: 'muted' });
    }

    if (historyPaymentFilter === 'paid') {
      chips.push({ key: 'payment-paid', label: strings.babysitterShiftPaid, tone: 'success' });
    } else if (historyPaymentFilter === 'unpaid') {
      chips.push({ key: 'payment-unpaid', label: strings.babysitterShiftUnpaid, tone: 'muted' });
    }

    if (historyFamilyFilter) {
      chips.push({ key: 'family', label: historyFamilyFilter, tone: 'accent' });
    }

    if (historySort === 'oldest') {
      chips.push({ key: 'sort-oldest', label: strings.babysitterShiftSortOldest, tone: 'accent' });
    } else if (historySort === 'amount') {
      chips.push({ key: 'sort-amount', label: strings.babysitterShiftSortHighestAmount, tone: 'success' });
    }

    return chips;
  }, [
    historyFamilyFilter,
    historyMonthFilter,
    historyPaymentFilter,
    historySort,
    historyTypeFilter,
  ]);

  useEffect(() => {
    if (!currentBabysitterProfileId) {
      return;
    }

    void fetchShifts(currentBabysitterProfileId);
  }, [currentBabysitterProfileId]);

  useEffect(() => {
    if (!params.parentName && !params.date && !params.startTime && !params.requestId && !params.parentId) {
      return;
    }

    setParentName(previous => previous || (params.parentName ?? ''));
    setSelectedParentId(previous => previous ?? params.parentId ?? null);
    setSelectedRequestId(previous => previous ?? params.requestId ?? null);
    setShiftDate(previous => previous || (params.date ?? ''));
    setStartTime(previous => previous || normalizeTimeValue(params.startTime));
    setFormOpen(true);
  }, [params.date, params.parentId, params.parentName, params.requestId, params.startTime]);

  useEffect(() => {
    if (!params.requestId) {
      setAutoOpenedTrackedRequestId(null);
    }
  }, [params.requestId]);

  useEffect(() => {
    if (
      !params.requestId ||
      !existingTrackedShift ||
      autoOpenedTrackedRequestId === params.requestId
    ) {
      return;
    }

    startEditingShift(existingTrackedShift);
    setAutoOpenedTrackedRequestId(params.requestId);
  }, [autoOpenedTrackedRequestId, existingTrackedShift, params.requestId]);

  async function fetchShifts(babysitterProfileId: string) {
    setLoading(true);
    const { shifts: loadedShifts, error } = await loadBabysitterShifts(babysitterProfileId);
    if (error) {
      setErrorText(error.message);
    } else {
      setShifts(loadedShifts);
    }
    setLoading(false);
  }

  function handleParentNameChange(value: string) {
    setParentName(value);
    const exactMatch = knownFamilies.find(family => family.parentName === value.trim());
    setSelectedParentId(exactMatch?.parentId ?? null);
    setSelectedRequestId(exactMatch?.requestId ?? null);
    setErrorText('');
  }

  function applyKnownFamily(family: KnownFamily) {
    setParentName(family.parentName);
    setSelectedParentId(family.parentId);
    setSelectedRequestId(family.requestId);
    setErrorText('');
  }

  function resetForm() {
    setParentName('');
    setSelectedParentId(null);
    setSelectedRequestId(null);
    setShiftDate('');
    setStartTime('');
    setEndTime('');
    setHourlyRate('');
    setPaymentStatus('unpaid');
    setNotes('');
    setEditingShiftId(null);
    setErrorText('');
    setFormOpen(false);
  }

  function resetHistoryFilters() {
    setHistoryMonthFilter('all');
    setHistoryTypeFilter('all');
    setHistoryPaymentFilter('all');
    setHistorySort('newest');
    setHistoryFamilyFilter(null);
  }

  function startEditingShift(shift: BabysitterShift) {
    setEditingShiftId(shift.id);
    setParentName(shift.parentName);
    setSelectedParentId(shift.parentId);
    setSelectedRequestId(shift.requestId);
    setShiftDate(shift.shiftDate);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setHourlyRate(String(shift.hourlyRate));
    setPaymentStatus(shift.paymentStatus);
    setNotes(shift.notes);
    setErrorText('');
    setFormOpen(true);
    setHistoryFiltersOpen(false);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  async function handleTogglePaymentStatus(shift: BabysitterShift) {
    setPaymentUpdatingShiftId(shift.id);

    const nextStatus: ShiftPaymentStatus =
      shift.paymentStatus === 'paid' ? 'unpaid' : 'paid';

    const { shift: updatedShift, error } = await setBabysitterShiftPaymentStatus(
      shift.id,
      nextStatus,
      shift.paidAt
    );

    setPaymentUpdatingShiftId(null);

    if (error || !updatedShift) {
      setErrorText(strings.babysitterShiftPaymentUpdateError);
      return;
    }

    setShifts(prev => prev.map(item => (item.id === updatedShift.id ? updatedShift : item)));

    if (editingShiftId === updatedShift.id) {
      setPaymentStatus(updatedShift.paymentStatus);
    }
  }

  async function handleDeleteShift(shift: BabysitterShift) {
    Alert.alert(
      strings.babysitterShiftDeleteConfirmTitle,
      strings.babysitterShiftDeleteConfirmBody,
      [
        {
          text: strings.cancel,
          style: 'cancel',
        },
        {
          text: strings.babysitterShiftDelete,
          style: 'destructive',
          onPress: async () => {
            setDeletingShiftId(shift.id);
            const { error } = await deleteBabysitterShift(shift.id);
            setDeletingShiftId(null);

            if (error) {
              setErrorText(strings.babysitterShiftDeleteError);
              return;
            }

            setShifts(prev => prev.filter(item => item.id !== shift.id));

            if (editingShiftId === shift.id) {
              resetForm();
            }
          },
        },
      ]
    );
  }

  async function handleSaveShift() {
    if (!currentBabysitterProfileId) {
      setErrorText(strings.babysitterShiftProfileMissing);
      return;
    }

    if (
      selectedRequestId &&
      shifts.some(
        shift => shift.requestId === selectedRequestId && shift.id !== editingShiftId
      )
    ) {
      setErrorText(strings.babysitterShiftDuplicateError);
      return;
    }

    if (!parentName.trim()) {
      setErrorText(strings.babysitterShiftValidationParent);
      return;
    }

    if (!shiftDate) {
      setErrorText(strings.babysitterShiftValidationDate);
      return;
    }

    if (!startTime) {
      setErrorText(strings.babysitterShiftValidationStart);
      return;
    }

    if (!endTime) {
      setErrorText(strings.babysitterShiftValidationEnd);
      return;
    }

    if (hourlyRateNumber === null) {
      setErrorText(strings.babysitterShiftValidationRate);
      return;
    }

    if (hoursWorked === null || totalAmount === null) {
      setErrorText(strings.babysitterShiftValidationTimeRange);
      return;
    }

    setSaving(true);
    setErrorText('');

    const draft = {
      parentId: selectedParentId,
      requestId: selectedRequestId,
      parentName,
      shiftDate,
      startTime,
      endTime,
      hoursWorked,
      hourlyRate: hourlyRateNumber,
      totalAmount,
      paymentStatus,
      paidAt: editingShift?.paidAt ?? null,
      notes,
    };

    const { shift, error } = editingShiftId
      ? await updateBabysitterShift(editingShiftId, draft)
      : await createBabysitterShift(currentBabysitterProfileId, draft);

    setSaving(false);

    if (error || !shift) {
      setErrorText(
        error?.message ??
          (editingShiftId ? strings.babysitterShiftUpdateError : strings.authErrorGeneric)
      );
      return;
    }

    setShifts(prev => {
      if (editingShiftId) {
        return prev.map(item => (item.id === shift.id ? shift : item));
      }

      return [shift, ...prev];
    });
    resetForm();
  }

  function handleToggleForm() {
    if (formOpen) {
      setErrorText('');
      setFormOpen(false);
      return;
    }

    setFormOpen(true);
  }

  if (!currentBabysitterProfileId && !loading) {
    return (
      <AppShell
        title={strings.babysitterShiftManagerTitle}
        activeTab="settings"
        backgroundColor={theme.screenBackground}
        showBackButton
        onBack={() => router.back()}
      >
        <AppScreen backgroundColor={theme.screenBackground}>
          <ScreenStateCard
            role="babysitter"
            icon="briefcase-outline"
            title={strings.babysitterShiftManagerTitle}
            body={strings.babysitterShiftProfileMissing}
            actionLabel={strings.drawerEditProfile}
            onActionPress={() => router.push('/babysitter-onboarding')}
          />
        </AppScreen>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={strings.babysitterShiftManagerTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        scrollViewRef={scrollRef}
      >
        <View style={styles.heroSection}>
          <AppText variant="caption" weight="700" style={[styles.heroEyebrow, { color: theme.filterAccent }]}>
            {strings.babysitterShiftManagerTitle}
          </AppText>
          <AppText variant="h1" weight="800" style={[styles.heroTitle, { color: theme.title }]}>
            {strings.babysitterShiftManagerTitle}
          </AppText>
          <AppText variant="body" style={styles.heroSubtitle}>
            {strings.babysitterShiftManagerSubtitle}
          </AppText>
          <View style={styles.heroChips}>
            <AppChip
              label={`${totals.count} ${strings.babysitterShiftManagerSummaryShifts}`}
              tone="primary"
              size="sm"
            />
            <AppChip
              label={`${formatShiftHours(totals.hours)} ${strings.babysitterShiftManagerSummaryHours}`}
              tone="accent"
              size="sm"
            />
            <AppChip
              label={formatShiftCurrency(totals.amount)}
              tone="success"
              size="sm"
            />
          </View>
        </View>

        {/* ── Summary tiles ── */}
        <View style={styles.summaryGrid}>
          <BabysitterStatCard
            label={strings.babysitterShiftManagerSummaryShifts}
            value={String(totals.count)}
            icon="briefcase-outline"
            tone="primary"
            fill={false}
            layout="stacked"
            style={styles.gridItemHalf}
          />
          <BabysitterStatCard
            label={strings.babysitterShiftManagerSummaryHours}
            value={formatShiftHours(totals.hours)}
            icon="time-outline"
            tone="accent"
            fill={false}
            layout="stacked"
            style={styles.gridItemHalf}
          />
          <BabysitterStatCard
            label={strings.babysitterShiftPaid}
            value={formatShiftCurrency(totals.paidAmount)}
            icon="cash-outline"
            tone="success"
            fill={false}
            layout="stacked"
            style={styles.gridItemHalf}
          />
          <BabysitterStatCard
            label={strings.babysitterShiftUnpaid}
            value={formatShiftCurrency(totals.unpaidAmount)}
            icon="wallet-outline"
            tone="muted"
            fill={false}
            layout="stacked"
            style={styles.gridItemHalf}
          />
        </View>

        {/* ── Stitch monthly hero summary ── */}
        <View style={styles.stitchHero}>
          <View style={styles.stitchHeroAccentLine} />
          <View style={styles.stitchHeroHeader}>
            <View style={styles.stitchHeroDateChip}>
              <AppText style={styles.stitchHeroDateChipText}>
                {new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
              </AppText>
            </View>
            <AppText variant="bodyLarge" weight="700" style={styles.stitchHeroTitle}>
              {`סיכום חודש • Smartaf`}
            </AppText>
          </View>
          <View style={styles.stitchSummaryRow}>
            {/* Hours tile */}
            <View style={styles.stitchSummaryTile}>
              <AppText style={styles.stitchSummaryLabel}>
                {strings.babysitterShiftManagerSummaryHours}
              </AppText>
              <AppText variant="h2" weight="800" style={styles.stitchSummaryValue}>
                {formatShiftHours(totals.hours)}
              </AppText>
            </View>
            {/* Income tile */}
            <View style={styles.stitchSummaryTile}>
              <AppText style={styles.stitchSummaryLabel}>
                {strings.babysitterShiftManagerSummaryIncome}
              </AppText>
              <AppText variant="h2" weight="800" style={styles.stitchSummaryValue}>
                {formatShiftCurrency(totals.amount)}
              </AppText>
            </View>
          </View>
        </View>

        <AppCard role="babysitter" variant="panel" style={styles.formCard}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleToggleForm}
            style={styles.formToggleButton}
          >
            <View style={styles.formToggleTitleWrap}>
              <AppText variant="bodyLarge" weight="700" style={styles.formToggleTitle}>
                {editingShift ? strings.babysitterShiftEditTitle : strings.babysitterShiftFormTitle}
              </AppText>
              {formOpen ? (
                <AppText variant="caption" tone="muted" style={styles.formToggleSubtitle}>
                  {strings.babysitterShiftFormSubtitle}
                </AppText>
              ) : null}
            </View>
            <View style={styles.formToggleIconWrap}>
              <MaterialIcons
                name={formOpen ? 'close' : editingShift ? 'edit' : 'add'}
                size={22}
                color={BabyCityPalette.primary}
              />
            </View>
          </TouchableOpacity>

          {formOpen ? (
            <>
              {editingShift ? (
                <AppCard role="babysitter" variant="panel" style={styles.editingBanner}>
                  <View style={styles.editingBannerRow}>
                    <AppChip
                      label={strings.babysitterShiftTracked}
                      tone="primary"
                      size="sm"
                    />
                    <View style={styles.editingBannerText}>
                      <AppText variant="bodyLarge" weight="700" style={styles.editingBannerTitle}>
                        {editingShift.parentName}
                      </AppText>
                      <AppText variant="body" tone="muted" style={styles.editingBannerSubtitle}>
                        {strings.babysitterShiftEditSubtitle}
                      </AppText>
                    </View>
                  </View>
                </AppCard>
              ) : null}

              {existingTrackedShift && existingTrackedShift.id !== editingShiftId ? (
                <AppCard role="babysitter" variant="panel" style={styles.duplicateCard}>
                  <View style={styles.formSectionHeader}>
                    <View style={[styles.formSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                      <MaterialIcons name="info-outline" size={20} color={BabyCityPalette.primary} />
                    </View>
                    <View style={styles.duplicateTextWrap}>
                      <AppText variant="bodyLarge" weight="700">{strings.babysitterShiftTrackedTitle}</AppText>
                      <AppText variant="caption" tone="muted" style={styles.duplicateHint}>
                        {strings.babysitterShiftTrackedHint}
                      </AppText>
                    </View>
                  </View>
                  <BabysitterShiftEntryCard
                    shift={existingTrackedShift}
                    onEditPress={startEditingShift}
                  />
                </AppCard>
              ) : null}

              {knownFamilies.length > 0 ? (
                <View style={styles.knownFamiliesWrap}>
                  <AppText variant="caption" weight="700" tone="muted" style={styles.knownFamiliesLabel}>
                    {strings.babysitterShiftKnownFamilies}
                  </AppText>
                  <View style={styles.knownFamiliesRow}>
                    {knownFamilies.map(family => (
                      <AppChip
                        key={family.parentId}
                        label={family.parentName}
                        tone="accent"
                        variant="filter"
                        selected={selectedParentId === family.parentId}
                        onPress={() => applyKnownFamily(family)}
                        size="sm"
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <AppInput
                label={strings.babysitterShiftParentLabel}
                value={parentName}
                onChangeText={handleParentNameChange}
                placeholder={strings.babysitterShiftParentPlaceholder}
                containerStyle={styles.fieldBlock}
              />

              <DateTimePicker
                mode="date"
                label={strings.babysitterShiftDateLabel}
                value={shiftDate}
                onChange={value => {
                  setShiftDate(value);
                  setErrorText('');
                }}
                errorText={!shiftDate && errorText === strings.babysitterShiftValidationDate ? errorText : undefined}
              />

              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <DateTimePicker
                    mode="time"
                    label={strings.babysitterShiftStartLabel}
                    value={startTime}
                    onChange={value => {
                      setStartTime(value);
                      setErrorText('');
                    }}
                    errorText={!startTime && errorText === strings.babysitterShiftValidationStart ? errorText : undefined}
                  />
                </View>
                <View style={styles.timeField}>
                  <DateTimePicker
                    mode="time"
                    label={strings.babysitterShiftEndLabel}
                    value={endTime}
                    onChange={value => {
                      setEndTime(value);
                      setErrorText('');
                    }}
                    errorText={
                      errorText === strings.babysitterShiftValidationEnd ||
                      errorText === strings.babysitterShiftValidationTimeRange
                        ? errorText
                        : undefined
                    }
                  />
                </View>
              </View>

              <AppInput
                label={strings.hourlyRate}
                value={hourlyRate}
                onChangeText={value => {
                  setHourlyRate(value);
                  setErrorText('');
                }}
                placeholder={strings.hourlyRatePlaceholder}
                keyboardType="numeric"
                containerStyle={styles.fieldBlock}
              />

              <View style={styles.filterGroup}>
                <AppText variant="caption" weight="700" tone="muted" style={styles.filterLabel}>
                  {strings.babysitterShiftPaymentLabel}
                </AppText>
                <View style={styles.filterChips}>
                  <AppChip
                    label={strings.babysitterShiftUnpaid}
                    tone="muted"
                    variant="filter"
                    selected={paymentStatus === 'unpaid'}
                    onPress={() => setPaymentStatus('unpaid')}
                    size="sm"
                  />
                  <AppChip
                    label={strings.babysitterShiftPaid}
                    tone="success"
                    variant="filter"
                    selected={paymentStatus === 'paid'}
                    onPress={() => setPaymentStatus('paid')}
                    size="sm"
                  />
                </View>
              </View>

              <View style={styles.shiftSummaryCard}>
                <View style={styles.shiftSummaryLeft}>
                  <AppText variant="caption" weight="700" tone="muted" style={styles.shiftSummaryTotalLabel}>
                    {strings.babysitterShiftTotalLabel}
                  </AppText>
                  <AppText
                    variant="h2"
                    weight="800"
                    style={[
                      styles.shiftSummaryTotalAmount,
                      totalAmount === null && styles.shiftSummaryTotalAmountEmpty,
                    ]}
                  >
                    {totalAmount !== null ? formatShiftCurrency(totalAmount) : '—'}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.shiftSummaryHoursLine}>
                    {hoursWorked !== null
                      ? `${formatShiftHours(hoursWorked)} ${strings.babysitterShiftManagerSummaryHours}`
                      : strings.babysitterShiftHoursAutoHint}
                  </AppText>
                </View>
                <View style={styles.shiftSummaryIconWrap}>
                  <MaterialIcons name="payments" size={24} color={BabyCityPalette.primary} />
                </View>
              </View>

              <AppTextArea
                label={strings.babysitterShiftNotesLabel}
                value={notes}
                onChangeText={value => {
                  setNotes(value);
                  setErrorText('');
                }}
                placeholder={strings.babysitterShiftNotesPlaceholder}
                containerStyle={styles.notesField}
              />

              {errorText ? (
                <AppText variant="body" tone="error" style={styles.errorText}>
                  {errorText}
                </AppText>
              ) : null}

              <AppPrimaryButton
                label={
                  saving
                    ? editingShift
                      ? strings.babysitterShiftUpdating
                      : strings.babysitterShiftSaving
                    : editingShift
                      ? strings.babysitterShiftUpdate
                      : strings.babysitterShiftSave
                }
                loading={saving}
                onPress={handleSaveShift}
                style={styles.saveButton}
              />

              {editingShift ? (
                <AppPrimaryButton
                  label={strings.cancel}
                  onPress={resetForm}
                  style={styles.cancelButton}
                  backgroundColor={BabyCityPalette.surface}
                  borderColor={BabyCityPalette.border}
                  textColor={BabyCityPalette.textPrimary}
                />
              ) : null}
            </>
          ) : null}
        </AppCard>

        <View style={[styles.formSectionHeader, styles.recentHeader]}>
          <View style={[styles.formSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
            <MaterialIcons name="history" size={20} color={BabyCityPalette.primary} />
          </View>
          <View style={styles.recentHeaderText}>
            <AppText variant="bodyLarge" weight="700">{strings.babysitterShiftRecentTitle}</AppText>
            {shifts.length > 0 ? (
              <AppText variant="caption" tone="muted">
                {strings.babysitterShiftHistoryFilteredSummary(filteredShifts.length, shifts.length)}
              </AppText>
            ) : null}
          </View>
        </View>

        {shifts.length > 0 ? (
          <>
            <View style={styles.historyToolbar}>
              <View style={styles.historyToolbarActions}>
                {historyFiltersActive ? (
                  <AppButton
                    label={strings.babysitterShiftFilterReset}
                    variant="ghost"
                    fullWidth={false}
                    style={styles.resetFiltersButton}
                    onPress={resetHistoryFilters}
                  />
                ) : null}
                <AppButton
                  label={
                    activeHistoryFilterChips.length > 0
                      ? `${strings.filterButton} (${activeHistoryFilterChips.length})`
                      : strings.filterButton
                  }
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => setHistoryFiltersOpen(prev => !prev)}
                />
              </View>
              <AppText variant="bodyLarge" weight="700" style={{ textAlign: 'right' }}>
                {strings.babysitterShiftHistoryFilters}
              </AppText>
            </View>

            {!historyFiltersOpen && activeHistoryFilterChips.length > 0 ? (
              <View style={styles.activeFiltersPreview}>
                {activeHistoryFilterChips.map(chip => (
                  <AppChip
                    key={chip.key}
                    label={chip.label}
                    tone={chip.tone}
                    size="sm"
                  />
                ))}
              </View>
            ) : null}

            {historyFiltersOpen ? (
              <AppCard role="babysitter" variant="panel" style={styles.historyFiltersCard}>
                <View style={[styles.formSectionHeader, { marginBottom: 14 }]}>
                  <View style={[styles.formSectionIconChip, { backgroundColor: `${BabyCityPalette.primary}0d` }]}>
                    <MaterialIcons name="tune" size={20} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="bodyLarge" weight="700">{strings.babysitterShiftHistoryFilters}</AppText>
                </View>

                <View style={styles.filterGroup}>
                  <AppText variant="caption" weight="700" tone="muted" style={styles.filterLabel}>
                    {strings.babysitterShiftFilterMonth}
                  </AppText>
                  <View style={styles.filterChips}>
                    <AppChip
                      label={strings.babysitterShiftFilterAll}
                      tone="primary"
                      variant="filter"
                      selected={historyMonthFilter === 'all'}
                      onPress={() => setHistoryMonthFilter('all')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftFilterCurrentMonth}
                      tone="accent"
                      variant="filter"
                      selected={historyMonthFilter === 'currentMonth'}
                      onPress={() => setHistoryMonthFilter('currentMonth')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftFilterPreviousMonth}
                      tone="muted"
                      variant="filter"
                      selected={historyMonthFilter === 'previousMonth'}
                      onPress={() => setHistoryMonthFilter('previousMonth')}
                      size="sm"
                    />
                  </View>
                </View>

                <View style={styles.filterGroup}>
                  <AppText variant="caption" weight="700" tone="muted" style={styles.filterLabel}>
                    {strings.babysitterShiftFilterType}
                  </AppText>
                  <View style={styles.filterChips}>
                    <AppChip
                      label={strings.babysitterShiftFilterAll}
                      tone="primary"
                      variant="filter"
                      selected={historyTypeFilter === 'all'}
                      onPress={() => setHistoryTypeFilter('all')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftFilterLinked}
                      tone="accent"
                      variant="filter"
                      selected={historyTypeFilter === 'linked'}
                      onPress={() => setHistoryTypeFilter('linked')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftFilterManual}
                      tone="muted"
                      variant="filter"
                      selected={historyTypeFilter === 'manual'}
                      onPress={() => setHistoryTypeFilter('manual')}
                      size="sm"
                    />
                  </View>
                </View>

                <View style={styles.filterGroup}>
                  <AppText variant="caption" weight="700" tone="muted" style={styles.filterLabel}>
                    {strings.babysitterShiftPaymentLabel}
                  </AppText>
                  <View style={styles.filterChips}>
                    <AppChip
                      label={strings.babysitterShiftFilterAll}
                      tone="primary"
                      variant="filter"
                      selected={historyPaymentFilter === 'all'}
                      onPress={() => setHistoryPaymentFilter('all')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftPaid}
                      tone="success"
                      variant="filter"
                      selected={historyPaymentFilter === 'paid'}
                      onPress={() => setHistoryPaymentFilter('paid')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftUnpaid}
                      tone="muted"
                      variant="filter"
                      selected={historyPaymentFilter === 'unpaid'}
                      onPress={() => setHistoryPaymentFilter('unpaid')}
                      size="sm"
                    />
                  </View>
                </View>

                {shiftFamilies.length > 0 ? (
                  <View style={styles.filterGroup}>
                    <AppText variant="caption" weight="700" tone="muted" style={styles.filterLabel}>
                      {strings.babysitterShiftFilterFamily}
                    </AppText>
                    <View style={styles.filterChips}>
                      <AppChip
                        label={strings.babysitterShiftFilterAll}
                        tone="primary"
                        variant="filter"
                        selected={historyFamilyFilter === null}
                        onPress={() => setHistoryFamilyFilter(null)}
                        size="sm"
                      />
                      {shiftFamilies.map(family => (
                        <AppChip
                          key={family}
                          label={family}
                          tone="accent"
                          variant="filter"
                          selected={historyFamilyFilter === family}
                          onPress={() => setHistoryFamilyFilter(family)}
                          size="sm"
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.filterGroup}>
                  <AppText variant="caption" weight="700" tone="muted" style={styles.filterLabel}>
                    {strings.babysitterShiftFilterSort}
                  </AppText>
                  <View style={styles.filterChips}>
                    <AppChip
                      label={strings.babysitterShiftSortNewest}
                      tone="primary"
                      variant="filter"
                      selected={historySort === 'newest'}
                      onPress={() => setHistorySort('newest')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftSortOldest}
                      tone="accent"
                      variant="filter"
                      selected={historySort === 'oldest'}
                      onPress={() => setHistorySort('oldest')}
                      size="sm"
                    />
                    <AppChip
                      label={strings.babysitterShiftSortHighestAmount}
                      tone="success"
                      variant="filter"
                      selected={historySort === 'amount'}
                      onPress={() => setHistorySort('amount')}
                      size="sm"
                    />
                  </View>
                </View>
              </AppCard>
            ) : null}
          </>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={theme.filterAccent} />
          </View>
        ) : shifts.length === 0 ? (
          <ScreenStateCard
            role="babysitter"
            icon="cash-outline"
            title={strings.babysitterShiftManagerEmpty}
            body={strings.babysitterShiftManagerEmptyHint}
          />
        ) : filteredShifts.length === 0 ? (
          <ScreenStateCard
            role="babysitter"
            icon="options-outline"
            title={strings.babysitterShiftHistoryEmpty}
            body={strings.babysitterShiftHistoryEmptyHint}
            actionLabel={strings.babysitterShiftFilterReset}
            onActionPress={resetHistoryFilters}
          />
        ) : (
          (() => {
            const groups = groupShiftsByMonth(filteredShifts);
            return groups.map(({ month, shifts: monthShifts }, groupIndex) => {
              const isOlderMonth = groupIndex > 0;
              return (
                <View key={month} style={isOlderMonth ? styles.olderMonthGroup : undefined}>
                  <AppText
                    variant="bodyLarge"
                    weight="800"
                    style={[styles.monthHeader, isOlderMonth && styles.monthHeaderDimmed]}
                  >
                    {month}
                  </AppText>
                  {monthShifts.map(shift => {
                    return (
                      <BabysitterShiftEntryCard
                        key={shift.id}
                        shift={shift}
                        onEditPress={startEditingShift}
                        onDeletePress={handleDeleteShift}
                        onTogglePaymentPress={handleTogglePaymentStatus}
                        deleting={deletingShiftId === shift.id}
                        paymentUpdating={paymentUpdatingShiftId === shift.id}
                        editing={editingShiftId === shift.id}
                        dimmed={isOlderMonth}
                      />
                    );
                  })}
                </View>
              );
            });
          })()
        )}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: 4,
    marginBottom: 20,
    gap: 6,
  },
  heroEyebrow: {},
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'right',
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 22,
    color: BabyCityPalette.textSecondary,
  },
  heroChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  formSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  formSectionIconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  // Stitch monthly hero
  stitchHero: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}0d`,
    shadowColor: '#7c3aed',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  stitchHeroAccentLine: {
    height: 4,
    backgroundColor: BabyCityPalette.primary,
    opacity: 0.65,
    marginHorizontal: -24,
    marginBottom: 20,
  },
  stitchHeroHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stitchHeroTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  stitchHeroDateChip: {
    backgroundColor: `${BabyCityPalette.primary}0d`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stitchHeroDateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: BabyCityPalette.primary,
    letterSpacing: 0.5,
  },
  // Stitch 2-tile summary row
  stitchSummaryRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  stitchSummaryTile: {
    flex: 1,
    backgroundColor: `${BabyCityPalette.primary}0d`,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.primary}1a`,
  },
  stitchSummaryValue: {
    textAlign: 'right',
    color: BabyCityPalette.primary,
    fontSize: 24,
  },
  stitchSummaryLabel: {
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
    color: BabyCityPalette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Month header for grouped shift list
  monthHeader: {
    textAlign: 'right',
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 8,
    color: BabyCityPalette.textSecondary,
  },
  monthHeaderDimmed: {
    opacity: 0.6,
  },
  olderMonthGroup: {
    marginTop: 8,
  },
  summaryHeader: {
    gap: BabyCityGeometry.spacing.sm,
    marginBottom: BabyCityGeometry.spacing.md,
  },
  summaryAmountPill: {
    alignSelf: 'flex-end',
    minWidth: 132,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BabyCityGeometry.radius.control,
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
    alignItems: 'flex-end',
  },
  summaryAmountLabel: {
    marginBottom: 4,
    textAlign: 'right',
  },
  summaryAmountValue: {
    color: BabyCityPalette.success,
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  gridItemHalf: {
    width: '48.4%',
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  formCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  formToggleButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.md,
  },
  formToggleTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  formToggleTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  formToggleSubtitle: {
    textAlign: 'right',
    lineHeight: 18,
  },
  formToggleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}0d`,
  },
  duplicateCard: {
    marginBottom: BabyCityGeometry.spacing.md,
  },
  duplicateTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  duplicateHint: {
    textAlign: 'right',
  },
  editingBanner: {
    marginBottom: BabyCityGeometry.spacing.md,
  },
  editingBannerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: BabyCityGeometry.spacing.sm,
  },
  editingBannerText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  editingBannerTitle: {
    textAlign: 'right',
  },
  editingBannerSubtitle: {
    textAlign: 'right',
    marginTop: 2,
  },
  knownFamiliesWrap: {
    marginBottom: BabyCityGeometry.spacing.md,
  },
  knownFamiliesLabel: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  knownFamiliesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
  },
  fieldBlock: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  timeRow: {
    gap: BabyCityGeometry.spacing.md,
  },
  timeField: {
    flex: 1,
  },
  shiftSummaryCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${BabyCityPalette.primary}2e`,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  shiftSummaryLeft: {
    alignItems: 'flex-end',
    gap: 2,
  },
  shiftSummaryTotalLabel: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  shiftSummaryTotalAmount: {
    color: BabyCityPalette.primary,
    fontSize: 28,
    lineHeight: 34,
  },
  shiftSummaryTotalAmountEmpty: {
    opacity: 0.35,
  },
  shiftSummaryHoursLine: {
    marginTop: 2,
  },
  shiftSummaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${BabyCityPalette.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesField: {
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  errorText: {
    marginTop: 4,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: BabyCityGeometry.spacing.sm,
  },
  cancelButton: {
    marginTop: BabyCityGeometry.spacing.sm,
    marginBottom: BabyCityGeometry.spacing.xl,
  },
  recentHeader: {
    marginBottom: 12,
  },
  historyToolbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  historyToolbarActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
  },
  activeFiltersPreview: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  historyFiltersCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  filterGroup: {
    marginTop: BabyCityGeometry.spacing.sm,
    paddingTop: BabyCityGeometry.spacing.sm,
  },
  filterLabel: {
    marginBottom: BabyCityGeometry.spacing.xs,
  },
  filterChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
  },
  resetFiltersButton: {
  },
  loadingWrap: {
    paddingVertical: BabyCityGeometry.spacing.xl,
    alignItems: 'center',
  },
});
