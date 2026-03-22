import { strings } from '@/locales';
import { calculateAgeFromBirthDate } from '@/lib/birthDate';
import { OnboardingData } from '@/types/onboarding';
import { ParentOnboardingData } from '@/types/parent';

type ValidationResult<TField extends string> = {
  isValid: boolean;
  fieldErrors: Partial<Record<TField, string>>;
};

type ParentField =
  | 'firstName'
  | 'lastName'
  | 'addressFull'
  | 'city'
  | 'childrenCount'
  | 'childBirthDates'
  | 'familyNote';
type BabysitterField =
  | 'firstName'
  | 'city'
  | 'birthDate'
  | 'languages'
  | 'bio'
  | 'yearsExperience'
  | 'ageGroups'
  | 'hourlyRate'
  | 'availability';

const MIN_BIO_LENGTH = 30;
const MIN_ADULT_AGE = 16;
const MAX_REASONABLE_AGE = 80;
const MAX_REASONABLE_CHILDREN = 12;
const MAX_PARENT_DESCRIPTION_LENGTH = 200;

function isPositiveInteger(value: string) {
  return /^[0-9]+$/.test(value) && Number.parseInt(value, 10) > 0;
}

export function validateParentProfileForm(
  data: ParentOnboardingData
): ValidationResult<ParentField> {
  const fieldErrors: Partial<Record<ParentField, string>> = {};
  const parsedChildrenCount = Number.parseInt(data.childrenCount.trim(), 10);

  if (data.firstName.trim() === '') {
    fieldErrors.firstName = strings.validationFirstNameRequired;
  }

  if (data.lastName.trim() === '') {
    fieldErrors.lastName = strings.validationLastNameRequired;
  }

  if (data.addressFull.trim() === '') {
    fieldErrors.addressFull = strings.validationAddressRequired;
  }

  if (data.city.trim() === '') {
    fieldErrors.city = strings.validationCityRequired;
  }

  if (data.childrenCount.trim() === '') {
    fieldErrors.childrenCount = strings.validationChildrenCountRequired;
  } else if (!isPositiveInteger(data.childrenCount.trim())) {
    fieldErrors.childrenCount = strings.validationChildrenCountInvalid;
  } else if (parsedChildrenCount > MAX_REASONABLE_CHILDREN) {
    fieldErrors.childrenCount = strings.validationChildrenCountTooHigh;
  }

  if (!fieldErrors.childrenCount) {
    if (data.childBirthDates.length !== parsedChildrenCount) {
      fieldErrors.childBirthDates = strings.validationChildBirthDatesRequired;
    } else if (data.childBirthDates.some(value => calculateAgeFromBirthDate(value) === null)) {
      fieldErrors.childBirthDates = strings.validationChildBirthDatesRequired;
    }
  }

  if (data.familyNote.trim().length > MAX_PARENT_DESCRIPTION_LENGTH) {
    fieldErrors.familyNote = strings.validationParentFamilyNoteTooLong;
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

export function validateBabysitterStep(
  step: number,
  data: OnboardingData
): ValidationResult<BabysitterField> {
  const fieldErrors: Partial<Record<BabysitterField, string>> = {};

  if (step === 1) {
    if (data.firstName.trim() === '') {
      fieldErrors.firstName = strings.validationFirstNameRequired;
    }
    if (data.city.trim() === '') {
      fieldErrors.city = strings.validationCityRequired;
    }
    if (data.languages.length === 0) {
      fieldErrors.languages = strings.validationLanguagesRequired;
    }
    if (data.birthDate.trim() === '') {
      fieldErrors.birthDate = strings.validationBirthDateRequired;
    } else {
      const age = calculateAgeFromBirthDate(data.birthDate.trim());
      if (age === null) {
        fieldErrors.birthDate = strings.validationBirthDateInvalid;
      } else if (age < MIN_ADULT_AGE || age > MAX_REASONABLE_AGE) {
        fieldErrors.birthDate = strings.validationBirthDateRange;
      }
    }
  }

  if (step === 2) {
    if (data.bio.trim() === '') {
      fieldErrors.bio = strings.validationBioRequired;
    } else if (data.bio.trim().length < MIN_BIO_LENGTH) {
      fieldErrors.bio = strings.validationBioTooShort;
    }
  }

  if (step === 3) {
    if (data.yearsExperience.trim() === '') {
      fieldErrors.yearsExperience = strings.validationExperienceRequired;
    }
    if (data.ageGroups.length === 0) {
      fieldErrors.ageGroups = strings.validationBabysitterAgeGroupsRequired;
    }
  }

  if (step === 4) {
    if (data.hourlyRate.trim() === '') {
      fieldErrors.hourlyRate = strings.validationHourlyRateRequired;
    } else if (!isPositiveInteger(data.hourlyRate.trim())) {
      fieldErrors.hourlyRate = strings.validationHourlyRateInvalid;
    }
    if (data.availability.length === 0) {
      fieldErrors.availability = strings.validationAvailabilityRequired;
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

export function validateBabysitterBeforeFinish(data: OnboardingData) {
  const merged: Partial<Record<BabysitterField, string>> = {};

  for (const step of [1, 2, 3, 4]) {
    Object.assign(merged, validateBabysitterStep(step, data).fieldErrors);
  }

  return {
    isValid: Object.keys(merged).length === 0,
    fieldErrors: merged,
  };
}

export function formatBabysitterSaveError(error: unknown) {
  if (!(error instanceof Error)) {
    return strings.babysitterSaveError;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('birth_date') ||
    message.includes('preferred_location') ||
    message.includes('extras') ||
    message.includes('notifications_enabled') ||
    message.includes('profile_visible') ||
    message.includes('profile_photo_path') ||
    message.includes('schema cache')
  ) {
    return strings.babysitterSaveMigrationNeeded;
  }

  if (message.includes('users update failed')) {
    return strings.babysitterSaveUserError;
  }

  if (message.includes('profile save failed')) {
    return strings.babysitterSaveProfileError;
  }

  if (message.includes('join table sync failed')) {
    return strings.babysitterSaveJoinError;
  }

  if (message.includes('gallery sync failed')) {
    return strings.babysitterSaveGalleryError;
  }

  return `${strings.babysitterSaveError} ${error.message}`;
}
