import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import RNDateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { BabyCityPalette } from '@/constants/theme';
import AppText from './AppText';
import { strings } from '@/locales';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a Date as the ISO date string the DB expects: "YYYY-MM-DD"
 */
export function formatDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date as the time string the DB expects: "HH:mm"
 */
export function formatTimeValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/**
 * Human-readable Hebrew date label shown on the row button:  "יום ג׳, 20 במרץ 2026"
 */
function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Human-readable time label: "17:00"
 */
function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Mode = 'date' | 'time';

type Props = {
  mode: Mode;
  /** ISO date string "YYYY-MM-DD" or time string "HH:mm", or empty string for unset */
  value: string;
  /** Called with the new ISO value string whenever the user confirms a selection */
  onChange: (value: string) => void;
  label: string;
  /** If true, shows a "(אופציונלי)" hint and allows clearing the value */
  optional?: boolean;
  errorText?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DateTimePicker({
  mode,
  value,
  onChange,
  label,
  optional = false,
  errorText,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [iosDraftValue, setIosDraftValue] = useState<Date | null>(null);

  // Derive a Date from the current value string, defaulting to now.
  const derivedDate = React.useMemo<Date>(() => {
    if (!value) return new Date();
    if (mode === 'date') {
      // value is "YYYY-MM-DD"
      const [y, m, d] = value.split('-').map(Number);
      if (y && m && d) {
        const dt = new Date();
        dt.setFullYear(y, m - 1, d);
        return dt;
      }
    } else {
      // mode === 'time', value is "HH:mm"
      const [h, min] = value.split(':').map(Number);
      const dt = new Date();
      if (!Number.isNaN(h) && !Number.isNaN(min)) {
        dt.setHours(h, min, 0, 0);
        return dt;
      }
    }
    return new Date();
  }, [value, mode]);

  const hasValue = value.trim() !== '';
  const displayText = hasValue
    ? mode === 'date'
      ? formatDateDisplay(derivedDate)
      : formatTimeDisplay(derivedDate)
    : null;

  // ── Android: picker is inline, shown/hidden. ───────────────────────────────
  // ── iOS: picker is shown in a modal sheet. ────────────────────────────────

  function handleChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate) {
        onChange(mode === 'date' ? formatDateValue(selectedDate) : formatTimeValue(selectedDate));
      }
    } else {
      if (selectedDate) {
        setIosDraftValue(selectedDate);
      }
    }
  }

  function handleIOSConfirm() {
    const nextDate = iosDraftValue ?? derivedDate;
    onChange(
      mode === 'date'
        ? formatDateValue(nextDate)
        : formatTimeValue(nextDate)
    );
    setShowPicker(false);
  }

  function handleIOSCancel() {
    setIosDraftValue(derivedDate);
    setShowPicker(false);
  }

  function handleClear() {
    onChange('');
    setIosDraftValue(null);
    setShowPicker(false);
  }

  // ── Trigger row ─────────────────────────────────────────────────────────

  return (
    <View style={styles.wrapper}>
      <AppText variant="body" weight="700" tone="muted" style={styles.label}>
        {label}
        {optional ? <AppText variant="caption" tone="muted"> ({strings.optionalSuffix})</AppText> : null}
      </AppText>

      <TouchableOpacity
        style={[styles.row, errorText ? styles.rowError : null] as unknown as ViewStyle[]}
        onPress={() => {
          setIosDraftValue(derivedDate);
          setShowPicker(true);
        }}
        activeOpacity={0.75}
      >
        {/* Icon on the left side (RTL flip: visually right) */}
        <View style={styles.iconWrap}>
          <Ionicons
            name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
            size={18}
            color={hasValue ? BabyCityPalette.primary : BabyCityPalette.textTertiary}
          />
        </View>

        <AppText
          variant="bodyLarge"
          tone={hasValue ? 'default' : 'muted'}
          style={styles.rowText as unknown as TextStyle[]}
          numberOfLines={1}
        >
          {displayText ?? (mode === 'date' ? strings.datePickerSelectDate : strings.datePickerSelectTime)}
        </AppText>

        {hasValue && optional ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={BabyCityPalette.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {errorText ? <AppText variant="caption" tone="error" style={styles.errorText}>{errorText}</AppText> : null}

      {/* Android: render inline when shown */}
      {Platform.OS === 'android' && showPicker ? (
        <RNDateTimePicker
          value={derivedDate}
          mode={mode}
          display={mode === 'date' ? 'calendar' : 'spinner'}
          onChange={handleChange}
          minimumDate={mode === 'date' ? new Date() : undefined}
        />
      ) : null}

      {Platform.OS === 'ios' && showPicker ? (
        <View style={styles.iosPickerCard}>
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity onPress={handleIOSCancel}>
              <AppText variant="body" tone="muted">
                {strings.pickerCancel}
              </AppText>
            </TouchableOpacity>
            <AppText variant="bodyLarge" weight="700">
              {label}
            </AppText>
            <TouchableOpacity onPress={handleIOSConfirm}>
              <AppText variant="body" weight="800" style={styles.confirmText}>
                {strings.pickerConfirm}
              </AppText>
            </TouchableOpacity>
          </View>

          <RNDateTimePicker
            value={iosDraftValue ?? derivedDate}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            onChange={handleChange}
            minimumDate={mode === 'date' ? new Date() : undefined}
            locale="he-IL"
            themeVariant="light"
            textColor={BabyCityPalette.textPrimary}
            style={mode === 'time' ? styles.iosTimePicker : styles.iosDatePicker}
          />
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: BabyCityPalette.border,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: BabyCityPalette.surface,
  },
  rowError: {
    borderColor: BabyCityPalette.error,
    backgroundColor: BabyCityPalette.errorSoft,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  errorText: {
    marginTop: 5,
  },
  iosPickerCard: {
    marginTop: 10,
    backgroundColor: BabyCityPalette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmText: {
    color: BabyCityPalette.primary,
  },
  iosDatePicker: {
    alignSelf: 'stretch',
    backgroundColor: BabyCityPalette.surface,
  },
  iosTimePicker: {
    alignSelf: 'stretch',
    height: 180,
    backgroundColor: BabyCityPalette.surface,
  },
});
