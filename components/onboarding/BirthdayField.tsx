import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { BabyCityPalette, getRoleTheme } from '@/constants/theme';
import AppText from '@/components/ui/AppText';
import { birthDateToIso, formatBirthDateForDisplay, parseBirthDate } from '@/lib/birthDate';
import { strings } from '@/locales';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  errorText?: string;
};

function defaultBirthdayDate() {
  const today = new Date();
  return new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
}

export default function BirthdayField({ label, value, onChange, errorText }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedDate = useMemo(() => parseBirthDate(value) ?? defaultBirthdayDate(), [value]);
  const displayValue = formatBirthDateForDisplay(value);
  const theme = getRoleTheme('babysitter');

  function handleChange(event: DateTimePickerEvent, nextDate?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type !== 'set' || !nextDate) {
      return;
    }

    onChange(birthDateToIso(nextDate));
  }

  return (
    <View style={styles.container}>
      <AppText weight="700" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <Pressable
        style={[styles.field, showPicker && styles.fieldActive, !!errorText && styles.fieldError]}
        onPress={() => setShowPicker(current => !current)}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.filterAccent} />
        <AppText variant="bodyLarge" style={[styles.value, !displayValue && styles.placeholder]}>
          {displayValue || strings.birthDatePlaceholder}
        </AppText>
      </Pressable>

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={new Date(1940, 0, 1)}
          onChange={handleChange}
        />
      ) : null}

      {showPicker && Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <AppText weight="800" style={styles.modalTitle}>
                {label}
              </AppText>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                minimumDate={new Date(1940, 0, 1)}
                locale="he-IL"
                onChange={handleChange}
                textColor="#183840"
                themeVariant="light"
              />
              <Pressable style={styles.doneChip} onPress={() => setShowPicker(false)}>
                <AppText variant="caption" weight="700" style={styles.doneChipText}>
                  {strings.birthdayPickerDone}
                </AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {errorText ? (
        <AppText variant="caption" tone="error" style={styles.errorText}>
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  label: {
    marginBottom: 10,
  },
  field: {
    minHeight: 62,
    borderWidth: 1.5,
    borderColor: BabyCityPalette.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: BabyCityPalette.surface,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fieldActive: {
    borderColor: BabyCityPalette.accent,
    backgroundColor: BabyCityPalette.accentSoft,
  },
  fieldError: {
    borderColor: BabyCityPalette.error,
    backgroundColor: BabyCityPalette.errorSoft,
  },
  value: {
    flex: 1,
  },
  placeholder: {
    color: BabyCityPalette.textTertiary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 25, 0.22)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: BabyCityPalette.surface,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  modalTitle: {
    marginBottom: 6,
  },
  doneChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.primarySoft,
  },
  doneChipText: {
    color: BabyCityPalette.primary,
  },
  errorText: {
    marginTop: 8,
  },
});
