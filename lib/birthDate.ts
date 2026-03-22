function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function parseBirthDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatBirthDateForDisplay(value: string | null | undefined): string {
  const parsed = parseBirthDate(value);
  if (!parsed) {
    return '';
  }

  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

export function birthDateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function calculateAgeFromBirthDate(
  value: string | null | undefined,
  today = new Date()
): number | null {
  const parsed = parseBirthDate(value);
  if (!parsed) {
    return null;
  }

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birthDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

  if (birthDate.getTime() > todayDate.getTime()) {
    return null;
  }

  let age = todayDate.getFullYear() - birthDate.getFullYear();
  const monthDelta = todayDate.getMonth() - birthDate.getMonth();
  const dayDelta = todayDate.getDate() - birthDate.getDate();

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
