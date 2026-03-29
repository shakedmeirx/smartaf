import { deriveChildAgesFromBirthDates } from '@/lib/parentChildren';
import { getParentPhotoUrl, getParentPhotoUrls } from '@/lib/parentPhotos';
import type { FamilyPreview } from '@/types/family';
import type { ParentOnboardingData } from '@/types/parent';
import type { ParentProfileDetails, ParentProfileSummary } from '@/types/parent';
import type { ParentPost } from '@/types/post';

function joinedName(value: unknown): string {
  if (!value || typeof value !== 'object') return '';

  if ('name' in value && typeof value.name === 'string') {
    return value.name.trim();
  }

  return '';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableStringValue(value: unknown): string | null {
  const normalized = stringValue(value);
  return normalized === '' ? null : normalized;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];
}

export function buildParentFullName(
  firstName: string,
  lastName: string,
  fallbackName = ''
) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || fallbackName.trim();
}

export async function resolveParentPhotoUrl(profilePhotoPath?: string | null) {
  return profilePhotoPath ? getParentPhotoUrl(profilePhotoPath) : undefined;
}

export function rowToParentProfileSummary(
  row: Record<string, unknown>,
  profilePhotoUrl?: string
): ParentProfileSummary {
  const firstName = stringValue(row.first_name);
  const lastName = stringValue(row.last_name);
  const fallbackName = joinedName(row.users ?? row.user);
  const profilePhotoPath = nullableStringValue(row.profile_photo_path);
  const childNames = Array.isArray(row.child_names)
    ? row.child_names.map(value => stringValue(value))
    : [];
  const childBirthDates = stringArrayValue(row.child_birth_dates);

  return {
    id: stringValue(row.id),
    userId: stringValue(row.user_id),
    firstName,
    lastName,
    fullName: buildParentFullName(firstName, lastName, fallbackName),
    addressFull: stringValue(row.address_full),
    city: stringValue(row.city),
    latitude: numberValue(row.latitude),
    longitude: numberValue(row.longitude),
    profilePhotoPath,
    profilePhotoUrl,
    childrenCount: numberValue(row.children_count),
    childNames,
    childBirthDates,
    childAges: deriveChildAgesFromBirthDates(childBirthDates),
    childAgeGroups: stringArrayValue(row.child_age_groups),
    pets: stringArrayValue(row.pets),
    hourlyBudget: numberValue(row.hourly_budget),
    familyNote: stringValue(row.family_note),
  };
}

export function rowToParentProfileDetails(
  row: Record<string, unknown>,
  posts: ParentPost[] = [],
  profilePhotoUrl?: string
): ParentProfileDetails {
  return {
    ...rowToParentProfileSummary(row, profilePhotoUrl),
    posts,
  };
}

export function rowToFamilyPreview(row: Record<string, unknown>): FamilyPreview {
  const profile = rowToParentProfileSummary(row);

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.fullName,
    city: profile.city,
    latitude: profile.latitude,
    longitude: profile.longitude,
    childrenCount: profile.childrenCount,
    hourlyBudget: profile.hourlyBudget,
    childAgeGroups: profile.childAgeGroups,
    familyNote: profile.familyNote,
  };
}

export function rowToParentPost(
  row: Record<string, unknown>,
  parentProfile?: Pick<
    ParentProfileSummary,
    'id' | 'fullName' | 'city' | 'profilePhotoUrl' | 'latitude' | 'longitude'
  >
): ParentPost {
  return {
    id: stringValue(row.id),
    parentId: stringValue(row.parent_id),
    parentProfileId: parentProfile?.id ?? null,
    parentName: parentProfile?.fullName || joinedName(row.users ?? row.user),
    parentCity: parentProfile?.city ?? '',
    parentProfilePhotoUrl: parentProfile?.profilePhotoUrl,
    latitude: parentProfile?.latitude ?? null,
    longitude: parentProfile?.longitude ?? null,
    area: stringValue(row.area),
    date: nullableStringValue(row.date),
    time: nullableStringValue(row.time),
    numChildren: numberValue(row.num_children),
    childAgeRange: stringArrayValue(row.child_age_range),
    note: stringValue(row.note),
    isActive: typeof row.is_active === 'boolean' ? row.is_active : true,
    createdAt: stringValue(row.created_at),
  };
}

export function normalizeParentOnboardingDraft(
  value: Partial<ParentOnboardingData>,
  fallbackName: string
): ParentOnboardingData {
  const nameParts = fallbackName.trim().split(/\s+/).filter(Boolean);
  const fallbackFirstName = nameParts[0] ?? '';
  const fallbackLastName = nameParts.slice(1).join(' ');

  return {
    firstName: stringValue(value.firstName) || fallbackFirstName,
    lastName: stringValue(value.lastName) || fallbackLastName,
    addressFull: stringValue(value.addressFull),
    city: stringValue(value.city),
    profilePhotoPath: stringValue(value.profilePhotoPath),
    profilePhotoUrl:
      stringValue(value.profilePhotoUrl) || '',
    childrenCount: stringValue(value.childrenCount),
    childNames: Array.isArray(value.childNames)
      ? value.childNames.map(item => stringValue(item))
      : [],
    childBirthDates: Array.isArray(value.childBirthDates)
      ? value.childBirthDates.map(item => stringValue(item))
      : [],
    pets: stringArrayValue(value.pets),
    hourlyBudget: stringValue(value.hourlyBudget),
    familyNote: stringValue(value.familyNote),
    postDrafts: Array.isArray(value.postDrafts)
      ? value.postDrafts.map(item => stringValue(item))
      : [],
  };
}

export async function attachParentProfilePhotoUrls<
  T extends { profilePhotoPath?: string | null; profilePhotoUrl?: string }
>(profiles: T[]): Promise<T[]> {
  const urlByPath = await getParentPhotoUrls(
    profiles.map(profile => profile.profilePhotoPath ?? '')
  );

  return profiles.map(profile => ({
    ...profile,
    profilePhotoUrl: profile.profilePhotoPath
      ? urlByPath.get(profile.profilePhotoPath) || profile.profilePhotoUrl
      : profile.profilePhotoUrl,
  }));
}
