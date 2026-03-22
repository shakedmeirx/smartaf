export function normalizeTimeValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const [rawHour, rawMinute] = value.trim().split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value.trim();
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
