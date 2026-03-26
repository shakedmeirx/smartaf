import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import LabeledInput from '@/components/onboarding/LabeledInput';
import AppText from '@/components/ui/AppText';
import { israeliCities } from '@/data/israeliCities';
import {
  BabyCityGeometry,
  BabyCityPalette,
  AppRole,
  getRoleTheme,
} from '@/constants/theme';
import { strings } from '@/locales';

type Props = {
  value: string;
  city?: string;
  onChange: (address: string) => void;
  onCoordinatesObtained?: (lat: number, lng: number) => void;
  onCityChange?: (city: string) => void;
  role?: AppRole;
  errorText?: string;
  cityErrorText?: string;
};

export default function AddressLocationField({
  value,
  city: _city = '',
  onChange,
  onCoordinatesObtained,
  onCityChange,
  role = 'parent',
  errorText,
  cityErrorText,
}: Props) {
  const theme = getRoleTheme(role);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const combinedErrorText = errorText || cityErrorText;

  function normalizeCityQuery(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/["'׳״\s־-]/g, '');
  }

  function extractCityFromAddress(address: string) {
    const trimmed = address.trim();
    if (!trimmed) {
      return '';
    }

    const segments = trimmed
      .split(',')
      .map(segment => segment.trim())
      .filter(Boolean);

    for (const segment of [...segments].reverse()) {
      const normalizedSegment = normalizeCityQuery(segment);
      const exactMatch = israeliCities.find(
        cityName => normalizeCityQuery(cityName) === normalizedSegment
      );

      if (exactMatch) {
        return exactMatch;
      }
    }

    const normalizedAddress = normalizeCityQuery(trimmed);
    const partialMatches = israeliCities.filter(cityName =>
      normalizedAddress.includes(normalizeCityQuery(cityName))
    );

    if (partialMatches.length > 0) {
      return partialMatches.sort((a, b) => b.length - a.length)[0] ?? '';
    }

    return segments.at(-1) ?? '';
  }

  function handleAddressChange(nextAddress: string) {
    onChange(nextAddress);
    onCityChange?.(extractCityFromAddress(nextAddress));
    if (locationError) setLocationError('');
  }

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
        onChange={handleAddressChange}
        placeholder={strings.addressPlaceholder}
        returnKeyType="next"
        errorText={combinedErrorText}
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
    marginTop: -10,
    marginBottom: 22,
  },
  locationButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.xs,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingHorizontal: 4,
  },
  hint: {
    marginTop: -14,
    marginBottom: 22,
    lineHeight: 18,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
});
