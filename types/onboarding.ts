export type GalleryPhoto = {
  id?: string;
  path: string;
  url: string;
  position: number;
};

export type OnboardingData = {
  // Step 1 - Basic Info
  firstName: string;
  city: string;
  addressFull: string;
  latitude: number | null;
  longitude: number | null;
  birthDate: string;
  languages: string[];

  // Step 2 - About
  bio: string;
  personalityTags: string[];

  // Step 3 - Experience
  yearsExperience: string;
  ageGroups: string[];
  certifications: string[];
  specialNeeds: boolean;
  superpowers: string[];

  // Step 4 - Preferences
  hourlyRate: string;
  availability: string[];
  extras: string[];
  preferredLocation: string;
  hasCar: boolean;

  // Step 5 - Photos
  profilePhotoPath: string;
  profilePhotoUrl: string;
  galleryPhotos: GalleryPhoto[];

  // Step 6 - Trust
  hasFirstAid: boolean;
  hasReferences: boolean;

  // Step 7 - Visibility
  notifications: boolean;
  acceptingRequests: boolean;
  profileVisible: boolean;
};

export const initialOnboardingData: OnboardingData = {
  firstName: '',
  city: '',
  addressFull: '',
  latitude: null,
  longitude: null,
  birthDate: '',
  languages: [],
  bio: '',
  personalityTags: [],
  yearsExperience: '',
  ageGroups: [],
  certifications: [],
  specialNeeds: false,
  superpowers: [],
  hourlyRate: '',
  availability: [],
  extras: [],
  preferredLocation: '',
  hasCar: false,
  profilePhotoPath: '',
  profilePhotoUrl: '',
  galleryPhotos: [],
  hasFirstAid: false,
  hasReferences: false,
  notifications: true,
  acceptingRequests: true,
  profileVisible: true,
};
