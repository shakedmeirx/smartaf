export type Babysitter = {
  id: string;
  userId: string;   // references User.id
  name: string;
  profilePhotoPath?: string | null;
  profilePhotoUrl?: string;
  galleryPhotoUrls?: string[];
  age: number | null;
  birthDate?: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  bio: string;
  hourlyRate: number;
  languages: string[];
  hasCar: boolean;
  yearsExperience: string;
  ageGroups: string[];
  certifications: string[];
  hasFirstAid: boolean;
  specialNeeds: boolean;
  superpowers: string[];
  personalityTags: string[];
  hasReferences: boolean;
  availability: string[];
  extras: string[];
  preferredLocation: string;
};
