import { supabase } from '@/lib/supabase';
import { rowToBabysitterPreferenceFields } from '@/lib/babysitterProfile';

const WEEK_DAY_SLOT_PREFIX = 'day:';

export type BabysitterAvailabilitySettings = {
  hourlyRate: string;
  availability: string[];
  weekDays: string[];
  extras: string[];
  preferredLocation: string;
  hasCar: boolean;
  acceptingRequests: boolean;
  notifications: boolean;
  profileVisible: boolean;
};

export const initialBabysitterAvailabilitySettings: BabysitterAvailabilitySettings = {
  hourlyRate: '',
  availability: [],
  weekDays: [],
  extras: [],
  preferredLocation: '',
  hasCar: false,
  acceptingRequests: true,
  notifications: true,
  profileVisible: true,
};

type WeekDayOption = {
  key: string;
  label: string;
  isoDate: string;
};

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const HEBREW_WEEKDAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export function isWeekDaySlot(slot: string) {
  return slot.startsWith(WEEK_DAY_SLOT_PREFIX);
}

export function getCurrentWeekDayOptions(referenceDate = new Date()): WeekDayOption[] {
  const startOfWeek = new Date(referenceDate);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    const isoDate = formatIsoDate(date);
    const label = `${HEBREW_WEEKDAY_SHORT[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`;

    return {
      key: `${WEEK_DAY_SLOT_PREFIX}${isoDate}`,
      label,
      isoDate,
    };
  });
}

export function formatAvailabilitySlotLabel(slot: string) {
  if (!isWeekDaySlot(slot)) {
    return slot;
  }

  const isoDate = slot.slice(WEEK_DAY_SLOT_PREFIX.length);
  const option = getCurrentWeekDayOptions().find(day => day.key === `${WEEK_DAY_SLOT_PREFIX}${isoDate}`);
  if (option) {
    return option.label;
  }

  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return slot;
  }

  return `${HEBREW_WEEKDAY_SHORT[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`;
}

function splitAvailabilitySlots(slots: string[]) {
  return {
    availability: slots.filter(slot => !isWeekDaySlot(slot)),
    weekDays: slots.filter(isWeekDaySlot),
  };
}

export async function loadBabysitterAvailabilitySettings(babysitterProfileId: string) {
  const [{ data: profile, error: profileError }, { data: availabilityRows, error: availabilityError }] =
    await Promise.all([
      supabase
        .from('babysitter_profiles')
        .select(`
          hourly_rate,
          has_car,
          preferred_location,
          extras,
          is_accepting_requests,
          notifications_enabled,
          profile_visible
        `)
        .eq('id', babysitterProfileId)
        .single(),
      supabase
        .from('babysitter_availability')
        .select('slot')
        .eq('babysitter_id', babysitterProfileId),
    ]);

  if (profileError) {
    return { settings: null, error: profileError };
  }

  if (availabilityError) {
    return { settings: null, error: availabilityError };
  }

  const availabilitySlots = (availabilityRows ?? []).map(row => row.slot as string);
  const { availability, weekDays } = splitAvailabilitySlots(availabilitySlots);
  const preferenceFields = rowToBabysitterPreferenceFields(profile as Record<string, unknown>);

  return {
    settings: {
      hourlyRate: preferenceFields.hourlyRate,
      availability,
      weekDays,
      extras: preferenceFields.extras,
      preferredLocation: preferenceFields.preferredLocation,
      hasCar: preferenceFields.hasCar,
      acceptingRequests: preferenceFields.acceptingRequests,
      notifications: preferenceFields.notifications,
      profileVisible: preferenceFields.profileVisible,
    } satisfies BabysitterAvailabilitySettings,
    error: null,
  };
}

export async function saveBabysitterAvailabilitySettings(
  babysitterProfileId: string,
  settings: BabysitterAvailabilitySettings
) {
  const parsedHourlyRate = Number.parseInt(settings.hourlyRate.trim(), 10);

  const { error: profileError } = await supabase
    .from('babysitter_profiles')
    .update({
      hourly_rate: parsedHourlyRate,
      has_car: settings.hasCar,
      preferred_location: settings.preferredLocation,
      extras: settings.extras,
      is_accepting_requests: settings.acceptingRequests,
      notifications_enabled: settings.notifications,
      profile_visible: settings.profileVisible,
    })
    .eq('id', babysitterProfileId);

  if (profileError) {
    return { error: profileError };
  }

  const { error: deleteError } = await supabase
    .from('babysitter_availability')
    .delete()
    .eq('babysitter_id', babysitterProfileId);

  if (deleteError) {
    return { error: deleteError };
  }

  const slotsToSave = [...settings.availability, ...settings.weekDays];

  if (slotsToSave.length > 0) {
    const rows = slotsToSave.map(slot => ({
      babysitter_id: babysitterProfileId,
      slot,
    }));

    const { error: insertError } = await supabase
      .from('babysitter_availability')
      .insert(rows);

    if (insertError) {
      return { error: insertError };
    }
  }

  return { error: null };
}
