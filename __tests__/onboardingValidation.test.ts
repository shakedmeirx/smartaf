import {
  validateBabysitterBeforeFinish,
  validateBabysitterStep,
  validateParentProfileForm,
} from '@/lib/onboardingValidation';
import { initialOnboardingData } from '@/types/onboarding';
import { initialParentOnboardingData } from '@/types/parent';

describe('parent onboarding validation', () => {
  it('blocks save when required parent profile fields are missing', () => {
    const result = validateParentProfileForm(initialParentOnboardingData);

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.firstName).toBeTruthy();
    expect(result.fieldErrors.lastName).toBeTruthy();
    expect(result.fieldErrors.addressFull).toBeTruthy();
    expect(result.fieldErrors.city).toBeTruthy();
    expect(result.fieldErrors.childrenCount).toBeTruthy();
  });

  it('rejects invalid children count', () => {
    const result = validateParentProfileForm({
      ...initialParentOnboardingData,
      firstName: 'שקד',
      lastName: 'לוי',
      addressFull: 'הרצל 12',
      city: 'תל אביב',
      profilePhotoPath: 'user/profile.jpg',
      childrenCount: '0',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.childrenCount).toBeTruthy();
  });

  it('requires a valid birth date for every child', () => {
    const result = validateParentProfileForm({
      ...initialParentOnboardingData,
      firstName: 'שקד',
      lastName: 'לוי',
      addressFull: 'הרצל 12',
      city: 'תל אביב',
      profilePhotoPath: 'user/profile.jpg',
      childrenCount: '2',
      childBirthDates: ['2020-01-01', ''],
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.childBirthDates).toBeTruthy();
  });

  it('allows a valid parent payload', () => {
    const result = validateParentProfileForm({
      firstName: 'שקד',
      lastName: 'לוי',
      addressFull: 'הרצל 12, דירה 4',
      city: 'תל אביב',
      profilePhotoPath: 'user/profile.jpg',
      profilePhotoUrl: 'https://example.com/photo.jpg',
      childrenCount: '2',
      childNames: ['נועה', 'יואב'],
      childBirthDates: ['2022-01-01', '2019-05-12'],
      pets: ['כלב'],
      hourlyBudget: '',
      familyNote: 'משפחה חמה ואוהבת',
      postDrafts: ['מחפשים עזרה קבועה'],
    });

    expect(result.isValid).toBe(true);
  });

  it('rejects too-long family descriptions', () => {
    const result = validateParentProfileForm({
      ...initialParentOnboardingData,
      firstName: 'שקד',
      lastName: 'לוי',
      addressFull: 'הרצל 12',
      city: 'תל אביב',
      profilePhotoPath: 'user/profile.jpg',
      childrenCount: '1',
      childBirthDates: ['2021-03-01'],
      familyNote: 'א'.repeat(201),
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.familyNote).toBeTruthy();
  });
});

describe('babysitter onboarding validation', () => {
  it('blocks step 1 without languages, name, or city', () => {
    const result = validateBabysitterStep(1, initialOnboardingData);

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.firstName).toBeTruthy();
    expect(result.fieldErrors.city).toBeTruthy();
    expect(result.fieldErrors.languages).toBeTruthy();
  });

  it('rejects too-young birth dates', () => {
    const result = validateBabysitterStep(1, {
      ...initialOnboardingData,
      firstName: 'שקד',
      city: 'תל אביב',
      languages: ['עברית'],
      birthDate: '2015-01-01',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.birthDate).toBeTruthy();
  });

  it('blocks step 2 with a bio that is too short', () => {
    const result = validateBabysitterStep(2, {
      ...initialOnboardingData,
      bio: 'קצר מדי',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.bio).toBeTruthy();
  });

  it('blocks step 3 without experience and age groups', () => {
    const result = validateBabysitterStep(3, initialOnboardingData);

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.yearsExperience).toBeTruthy();
    expect(result.fieldErrors.ageGroups).toBeTruthy();
  });

  it('blocks step 4 without valid rate and availability', () => {
    const result = validateBabysitterStep(4, {
      ...initialOnboardingData,
      hourlyRate: '-5',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.hourlyRate).toBeTruthy();
    expect(result.fieldErrors.availability).toBeTruthy();
  });

  it('allows finishing when required babysitter fields are valid', () => {
    const result = validateBabysitterBeforeFinish({
      ...initialOnboardingData,
      firstName: 'שקד',
      city: 'תל אביב',
      birthDate: '2000-01-01',
      languages: ['עברית'],
      bio: 'אני אוהבת לעבוד עם ילדים ומביאה הרבה סבלנות, רוגע ואנרגיה טובה.',
      yearsExperience: '1–2 שנים',
      ageGroups: ['גיל הגן (3–6)'],
      hourlyRate: '55',
      availability: ['סופי שבוע'],
    });

    expect(result.isValid).toBe(true);
  });
});
