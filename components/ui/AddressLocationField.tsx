import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import LabeledInput from '@/components/onboarding/LabeledInput';
import AppText from '@/components/ui/AppText';
import { BabyCityGeometry, AppRole, getRoleTheme } from '@/constants/theme';
import { strings } from '@/locales';

type Props = {
  value: string;
  onChange: (address: string) => void;
  onCoordinatesObtained?: (lat: number, lng: number) => void;
  onCityChange?: (city: string) => void; // set silently from GPS, no UI
  role?: AppRole;
  errorText?: string;
};

export default function AddressLocationField({
  value,
  onChange,
  onCoordinatesObtained,
  onCityChange,
  role = 'parent',
  errorText,
}: Props) {
  const theme = getRoleTheme(role);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  async function handleUseLocation() {
    setLocating(true);
    setLocationError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(strings.locationPermissionDenied);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      onCoordinatesObtained?.(latitude, longitude);

      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          const street = [place.streetNumber, place.street].filter(Boolean).join(' ');
          const address = [street || place.name, place.city].filter(Boolean).join(', ');
          if (address) onChange(address);
          if (place.city) onCityChange?.(place.city);
        }
      } catch {
        // non-fatal
      }
    } catch {
      setLocationError(strings.locationError);
    } finally {
      setLocating(false);
    }
  }

  return (
    <View>
      <LabeledInput
        label={strings.addressLabel}
        value={value}
        onChange={v => { onChange(v); if (locationError) setLocationError(''); }}
        placeholder={strings.addressPlaceholder}
        returnKeyType="next"
        errorText={errorText}
      />

      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.locationButton,
            { backgroundColor: theme.highlightedSurface },
            locating && styles.locationButtonDisabled,
          ]}
          onPress={handleUseLocation}
          disabled={locating}
          activeOpacity={0.75}
        >
          {locating ? (
            <ActivityIndicator size="small" color={theme.filterAccent} style={styles.icon} />
          ) : (
            <Ionicons name="location-outline" size={16} color={theme.filterAccent} style={styles.icon} />
          )}
          <AppText variant="caption" weight="700" style={[styles.buttonLabel, { color: theme.filterAccent }]}>
            {locating ? strings.locationLoading : strings.useMyLocation}
          </AppText>
        </TouchableOpacity>
      </View>

      {locationError ? (
        <AppText variant="caption" tone="error" style={styles.locationErrorText}>
          {locationError}
        </AppText>
      ) : null}

      <AppText variant="caption" tone="muted" style={styles.hint}>
        {strings.addressPrivacyHint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    marginTop: -12,
    marginBottom: 22,
  },
  locationButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.xs,
    paddingHorizontal: BabyCityGeometry.spacing.md,
    paddingVertical: BabyCityGeometry.spacing.sm,
    borderRadius: BabyCityGeometry.radius.chip,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  icon: {},
  buttonLabel: {},
  locationErrorText: {
    marginTop: -14,
    marginBottom: 12,
    textAlign: 'right',
  },
  hint: {
    marginTop: -14,
    marginBottom: 22,
    lineHeight: 18,
    textAlign: 'right',
  },
});
