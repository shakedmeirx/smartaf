import type { ParentPost } from '@/types/post';

export type ParentOnboardingData = {
  firstName: string;
  lastName: string;
  addressFull: string;
  city: string;
  profilePhotoPath: string;
  profilePhotoUrl: string;
  childrenCount: string;
  childBirthDates: string[];
  pets: string[];
  hourlyBudget: string;
  familyNote: string;
  postDrafts: string[];
};

export type ParentProfileSummary = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  addressFull: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  profilePhotoPath: string | null;
  profilePhotoUrl?: string;
  childrenCount: number | null;
  childBirthDates: string[];
  childAges: number[];
  childAgeGroups: string[];
  pets: string[];
  hourlyBudget: number | null;
  familyNote: string;
};

export type ParentProfileDetails = ParentProfileSummary & {
  posts: ParentPost[];
};

export const initialParentOnboardingData: ParentOnboardingData = {
  firstName: '',
  lastName: '',
  addressFull: '',
  city: '',
  profilePhotoPath: '',
  profilePhotoUrl: '',
  childrenCount: '',
  childBirthDates: [],
  pets: [],
  hourlyBudget: '',
  familyNote: '',
  postDrafts: [],
};
