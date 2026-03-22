function isValidCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeRequestDate(input: string): string | null {
  const trimmed = input.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const yearNum = Number(year);
    const monthNum = Number(month);
    const dayNum = Number(day);

    if (isValidCalendarDate(yearNum, monthNum, dayNum)) {
      return `${yearNum.toString().padStart(4, '0')}-${monthNum
        .toString()
        .padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    }

    return null;
  }

  const localMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    const yearNum = Number(year);
    const monthNum = Number(month);
    const dayNum = Number(day);

    if (isValidCalendarDate(yearNum, monthNum, dayNum)) {
      return `${yearNum.toString().padStart(4, '0')}-${monthNum
        .toString()
        .padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

export function normalizeRequestTime(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, hours, minutes] = match;
  const hoursNum = Number(hours);
  const minutesNum = Number(minutes);

  if (hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59) {
    return null;
  }

  return `${hoursNum.toString().padStart(2, '0')}:${minutesNum
    .toString()
    .padStart(2, '0')}`;
}
