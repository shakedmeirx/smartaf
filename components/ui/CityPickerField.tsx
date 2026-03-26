import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { useAuth } from '@/context/AuthContext';
import { israeliCities } from '@/data/israeliCities';
import { strings } from '@/locales';
import {
  BabyCityGeometry,
  BabyCityPalette,
  BabyCityShadows,
  getRoleTheme,
} from '@/constants/theme';

export type CityPickerFieldHandle = {
  focus: () => void;
  blur: () => void;
};

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  errorText?: string;
  helperText?: string;
};

function normalizeCityQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/["'׳״\s־-]/g, '');
}

const CityPickerField = forwardRef<CityPickerFieldHandle, Props>(function CityPickerField(
  {
    label,
    value,
    onChange,
    placeholder = strings.cityPlaceholder,
    errorText,
    helperText,
  },
  ref
) {
  const { activeRole } = useAuth();
  const theme = getRoleTheme(activeRole ?? 'parent');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      Keyboard.dismiss();
      setOpen(true);
    },
    blur: () => {
      setOpen(false);
      setIsFocused(false);
    },
  }));

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setIsFocused(true);

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeCityQuery(trimmedQuery);
  const filteredCities = useMemo(() => {
    if (!normalizedQuery) {
      return israeliCities;
    }

    return israeliCities.filter(city =>
      normalizeCityQuery(city).includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const hasExactMatch = useMemo(
    () => israeliCities.some(city => normalizeCityQuery(city) === normalizedQuery),
    [normalizedQuery]
  );

  function closePicker() {
    setOpen(false);
    setIsFocused(false);
  }

  function handleSelect(nextCity: string) {
    onChange(nextCity.trim());
    closePicker();
  }

  return (
    <View style={styles.container}>
      {label ? (
        <AppText
          variant="body"
          weight="700"
          tone={isFocused ? 'accent' : 'muted'}
          style={styles.label}
        >
          {label}
        </AppText>
      ) : null}

      <Pressable
        style={[
          styles.field,
          isFocused && { borderColor: theme.filterAccent, backgroundColor: BabyCityPalette.surfaceLowest },
          !!errorText && styles.fieldError,
        ]}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
      >
        <View style={styles.valueRow}>
          <Ionicons name="location-outline" size={18} color={theme.filterAccent} />
          <AppText
            variant="bodyLarge"
            style={[styles.value, !value && styles.placeholder]}
          >
            {value || placeholder}
          </AppText>
        </View>
      </Pressable>

      {helperText ? (
        <AppText variant="caption" tone="muted" style={styles.helperText}>
          {helperText}
        </AppText>
      ) : null}

      {errorText ? (
        <AppText variant="caption" tone="error" style={styles.errorText}>
          {errorText}
        </AppText>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={closePicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <View style={styles.modalHeader}>
                <Pressable onPress={closePicker} hitSlop={10}>
                  <AppText variant="body" weight="700" color={theme.filterAccent}>
                    {strings.done}
                  </AppText>
                </Pressable>
                <AppText variant="h3" weight="800" style={styles.modalTitle}>
                  {strings.cityPickerTitle}
                </AppText>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={BabyCityPalette.textSecondary} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={strings.citySearchPlaceholder}
                  placeholderTextColor={BabyCityPalette.textTertiary}
                  textAlign="right"
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </View>

              {trimmedQuery && !hasExactMatch ? (
                <Pressable
                  style={[
                    styles.optionRow,
                    styles.manualOptionRow,
                    { borderColor: theme.filterAccent, backgroundColor: theme.activeBackground },
                  ]}
                  onPress={() => handleSelect(trimmedQuery)}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={theme.filterAccent}
                  />
                  <AppText
                    variant="body"
                    weight="700"
                    style={[styles.manualOptionText, { color: theme.filterAccent }]}
                  >
                    {strings.cityUseTypedValue(trimmedQuery)}
                  </AppText>
                </Pressable>
              ) : null}

              <FlatList
                data={filteredCities}
                keyExtractor={item => item}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <AppText variant="body" tone="muted">
                      {strings.cityPickerNoResults}
                    </AppText>
                  </View>
                }
                renderItem={({ item }) => {
                  const selected = normalizeCityQuery(item) === normalizeCityQuery(value);

                  return (
                    <Pressable
                      style={[
                        styles.optionRow,
                        selected && {
                          borderColor: theme.filterAccent,
                          backgroundColor: theme.activeBackground,
                        },
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={theme.filterAccent}
                        />
                      ) : (
                        <View style={styles.optionBullet} />
                      )}
                      <AppText
                        variant="bodyLarge"
                        weight={selected ? '700' : '500'}
                        style={styles.optionText}
                      >
                        {item}
                      </AppText>
                    </Pressable>
                  );
                }}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
});

export default CityPickerField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  label: {
    marginBottom: 10,
  },
  field: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 24,
    paddingHorizontal: 18,
    backgroundColor: BabyCityPalette.surfaceContainer,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  fieldError: {
    borderColor: BabyCityPalette.error,
    backgroundColor: BabyCityPalette.errorSoft,
  },
  value: {
    flex: 1,
  },
  valueRow: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  placeholder: {
    color: BabyCityPalette.textTertiary,
  },
  helperText: {
    marginTop: 8,
  },
  errorText: {
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 25, 0.18)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalWrap: {
    width: '100%',
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: BabyCityPalette.surface,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 16,
    maxHeight: '78%',
    ...BabyCityShadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'right',
  },
  searchWrap: {
    minHeight: BabyCityGeometry.controlHeights.search,
    borderRadius: BabyCityGeometry.radius.control,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: BabyCityPalette.surfaceMuted,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 24,
    fontSize: 15,
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  manualOptionRow: {
    marginBottom: 8,
    borderColor: BabyCityPalette.primarySoft,
    backgroundColor: BabyCityPalette.primarySoft,
  },
  manualOptionText: {
    color: BabyCityPalette.primary,
  },
  list: {
    flexGrow: 0,
  },
  optionRow: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    backgroundColor: BabyCityPalette.surface,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BabyCityPalette.border,
  },
  emptyState: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
