export type FamilyPreview = {
  id: string;
  userId: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  childrenCount: number | null;
  hourlyBudget: number | null;
  childAgeGroups: string[];
  familyNote: string;
};
