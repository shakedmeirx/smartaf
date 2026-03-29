import { calculateAgeFromBirthDate } from '@/lib/birthDate';
import { formatAvailabilitySlotLabel } from '@/lib/babysitterAvailability';
import { getBabysitterPhotoUrls } from '@/lib/babysitterPhotos';
import { supabase } from '@/lib/supabase';
import { Babysitter } from '@/types/babysitter';
import { GalleryPhoto, OnboardingData } from '@/types/onboarding';

export const BABYSITTER_PROFILE_SELECT = `
  id, user_id, city, latitude, longitude, bio, hourly_rate, years_experience, age, birth_date,
  has_car, has_first_aid, special_needs, has_references,
  profile_photo_path, extras, preferred_location,
  users!user_id ( name ),
  babysitter_languages ( language ),
  babysitter_age_groups ( age_group ),
  babysitter_certifications ( certification ),
  babysitter_superpowers ( superpower ),
  babysitter_personality_tags ( tag ),
  babysitter_availability ( slot )
`;

type BabysitterProfileResult = {
  babysitter: Babysitter | null;
  galleryPhotoUrls: string[];
  notFound: boolean;
};

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableStringValue(value: unknown): string | null {
  const normalized = stringValue(value);
  return normalized === '' ? null : normalized;
}

function stringArrayValue<T extends string>(
  rows: unknown,
  key: string
): T[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(row => {
      if (!row || typeof row !== 'object') return '';
      if (!(key in row)) return '';
      const value = (row as Record<string, unknown>)[key];
      return typeof value === 'string' ? value.trim() : '';
    })
    .filter((value): value is T => value !== '');
}

export function rowToBabysitter(
  row: Record<string, unknown>,
  profilePhotoUrl?: string
): Babysitter {
  const userRow = row.users as { name?: string } | null;
  const profilePhotoPath = nullableStringValue(row.profile_photo_path);
  const birthDate = nullableStringValue(row.birth_date) ?? undefined;
  const languages = stringArrayValue<string>(row.babysitter_languages, 'language');
  const ageGroups = stringArrayValue<string>(row.babysitter_age_groups, 'age_group');
  const certifications = stringArrayValue<string>(row.babysitter_certifications, 'certification');
  const superpowers = stringArrayValue<string>(row.babysitter_superpowers, 'superpower');
  const personalityTags = stringArrayValue<string>(row.babysitter_personality_tags, 'tag');
  const availability = stringArrayValue<string>(row.babysitter_availability, 'slot').map(slot =>
    formatAvailabilitySlotLabel(slot)
  );

  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: userRow?.name ?? '',
    profilePhotoPath,
    profilePhotoUrl,
    galleryPhotoUrls: [],
    age: calculateAgeFromBirthDate(birthDate) ?? ((row.age as number | null) ?? null),
    birthDate,
    city: stringValue(row.city),
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
    bio: stringValue(row.bio),
    hourlyRate: (row.hourly_rate as number | null) ?? 0,
    languages,
    hasCar: Boolean(row.has_car),
    yearsExperience: stringValue(row.years_experience),
    ageGroups,
    certifications,
    hasFirstAid: Boolean(row.has_first_aid),
    specialNeeds: Boolean(row.special_needs),
    superpowers,
    personalityTags,
    hasReferences: Boolean(row.has_references),
    availability,
    extras: ((row.extras as string[] | null) ?? []).filter(Boolean),
    preferredLocation: stringValue(row.preferred_location),
  };
}

export function galleryRowsToPhotos(
  rows: Record<string, unknown>[],
  urlByPath: Map<string, string> = new Map()
): GalleryPhoto[] {
  return rows.map(row => ({
    id: (row.id as string | null) ?? undefined,
    path: row.storage_path as string,
    url: urlByPath.get(row.storage_path as string) ?? '',
    position: (row.position as number | null) ?? 0,
  }));
}

export function rowToBabysitterPreferenceFields(row: Record<string, unknown>) {
  return {
    hourlyRate:
      row.hourly_rate === null || row.hourly_rate === undefined ? '' : String(row.hourly_rate),
    extras: ((row.extras as string[] | null) ?? []).filter(Boolean),
    preferredLocation: stringValue(row.preferred_location),
    hasCar: Boolean(row.has_car),
    notifications: row.notifications_enabled !== false,
    acceptingRequests: row.is_accepting_requests !== false,
    profileVisible: row.profile_visible !== false,
  };
}

type BabysitterOnboardingHydrationInput = {
  dbUserName?: string;
  languages: string[];
  ageGroups: string[];
  certifications: string[];
  superpowers: string[];
  personalityTags: string[];
  availability: string[];
  galleryPhotos: GalleryPhoto[];
};

export function rowToBabysitterOnboardingData(
  row: Record<string, unknown>,
  input: BabysitterOnboardingHydrationInput,
  profilePhotoUrl = ''
): OnboardingData {
  const profilePhotoPath = nullableStringValue(row.profile_photo_path) ?? '';
  const preferenceFields = rowToBabysitterPreferenceFields(row);

  return {
    firstName: input.dbUserName?.trim() || '',
    city: stringValue(row.city),
    addressFull: stringValue(row.address_full),
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
    birthDate: nullableStringValue(row.birth_date) ?? '',
    languages: input.languages,
    bio: stringValue(row.bio),
    personalityTags: input.personalityTags,
    yearsExperience: stringValue(row.years_experience),
    ageGroups: input.ageGroups,
    certifications: input.certifications,
    specialNeeds: Boolean(row.special_needs),
    superpowers: input.superpowers,
    hourlyRate: preferenceFields.hourlyRate,
    availability: input.availability,
    extras: preferenceFields.extras,
    preferredLocation: preferenceFields.preferredLocation,
    hasCar: preferenceFields.hasCar,
    profilePhotoPath,
    profilePhotoUrl,
    galleryPhotos: input.galleryPhotos,
    hasFirstAid: Boolean(row.has_first_aid),
    hasReferences: Boolean(row.has_references),
    notifications: preferenceFields.notifications,
    acceptingRequests: preferenceFields.acceptingRequests,
    profileVisible: preferenceFields.profileVisible,
  };
}

export async function loadBabysitterProfileById(profileId: string): Promise<BabysitterProfileResult> {
  const [profileRes, galleryRes] = await Promise.all([
    supabase
      .from('babysitter_profiles')
      .select(BABYSITTER_PROFILE_SELECT)
      .eq('id', profileId)
      .single(),
    supabase
      .from('babysitter_gallery_photos')
      .select('storage_path')
      .eq('babysitter_id', profileId)
      .order('position', { ascending: true }),
  ]);

  if (profileRes.error || !profileRes.data) {
    return { babysitter: null, galleryPhotoUrls: [], notFound: true };
  }

  const profilePhotoPath =
    nullableStringValue((profileRes.data as Record<string, unknown>).profile_photo_path) ?? '';
  const galleryPaths = (galleryRes.data ?? []).map(photo => photo.storage_path as string);
  const urlByPath = await getBabysitterPhotoUrls(
    [profilePhotoPath, ...galleryPaths].filter(Boolean)
  );

  return {
    babysitter: rowToBabysitter(
      profileRes.data as Record<string, unknown>,
      profilePhotoPath ? urlByPath.get(profilePhotoPath) : undefined
    ),
    galleryPhotoUrls: galleryPaths
      .map(path => urlByPath.get(path) ?? '')
      .filter(Boolean),
    notFound: false,
  };
}

export async function loadBabysitterProfileByUserId(userId: string): Promise<BabysitterProfileResult> {
  const { data: profile } = await supabase
    .from('babysitter_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile?.id) {
    return { babysitter: null, galleryPhotoUrls: [], notFound: true };
  }

  return loadBabysitterProfileById(profile.id as string);
}

export async function attachBabysitterPhotoUrls(babysitters: Babysitter[]) {
  const urlByPath = await getBabysitterPhotoUrls(
    babysitters.map(babysitter => babysitter.profilePhotoPath ?? '')
  );

  return babysitters.map(babysitter => ({
    ...babysitter,
    profilePhotoUrl: babysitter.profilePhotoPath
      ? urlByPath.get(babysitter.profilePhotoPath) || babysitter.profilePhotoUrl
      : babysitter.profilePhotoUrl,
  }));
}
