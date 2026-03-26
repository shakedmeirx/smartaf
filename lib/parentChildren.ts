import { calculateAgeFromBirthDate } from '@/lib/birthDate';

type ParentChildAgeGroup = 'תינוקות' | 'פעוטות' | 'גן' | 'גיל בית ספר';

export function resizeChildBirthDates(count: number, current: string[] = []) {
  const safeCount = Math.max(0, count);
  const next = current.slice(0, safeCount);

  while (next.length < safeCount) {
    next.push('');
  }

  return next;
}

export function resizeChildNames(count: number, current: string[] = []) {
  const safeCount = Math.max(0, count);
  const next = current.slice(0, safeCount);

  while (next.length < safeCount) {
    next.push('');
  }

  return next;
}

function ageGroupForBirthDate(value: string): ParentChildAgeGroup | null {
  const age = calculateAgeFromBirthDate(value);
  if (age === null) return null;

  if (age <= 1) return 'תינוקות';
  if (age <= 3) return 'פעוטות';
  if (age <= 6) return 'גן';
  return 'גיל בית ספר';
}

export function deriveChildAgeGroupsFromBirthDates(childBirthDates: string[]) {
  const groups = childBirthDates
    .map(ageGroupForBirthDate)
    .filter((value): value is ParentChildAgeGroup => value !== null);

  return [...new Set(groups)];
}

export function deriveChildAgesFromBirthDates(childBirthDates: string[]) {
  return childBirthDates
    .map(value => calculateAgeFromBirthDate(value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
}
