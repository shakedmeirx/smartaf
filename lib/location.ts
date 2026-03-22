export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const RADIUS_OPTIONS_KM = [2, 5, 10, 20] as const;

export function hasCoordinates(
  value: { latitude?: number | null; longitude?: number | null } | null | undefined
): value is Coordinates {
  return typeof value?.latitude === 'number' && typeof value?.longitude === 'number';
}

export function distanceInKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lngDelta = toRadians(to.longitude - from.longitude);

  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
