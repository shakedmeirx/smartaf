import { he } from './he';
import { en } from './en';

export type AppLanguage = 'he' | 'en';

// Mutable live binding — all components see the updated value on next render.
// Cast en as typeof he so both share the same shape for type-safety.
export let strings: typeof he = he;

export function setAppLanguage(lang: AppLanguage) {
  strings = lang === 'en' ? (en as unknown as typeof he) : he;
}

export function getAppLanguage(): AppLanguage {
  return strings === he ? 'he' : 'en';
}
