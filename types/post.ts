export type ParentPost = {
  id: string;
  parentId: string;        // users.id
  parentProfileId: string | null; // parent_profiles.id — needed to open family-profile screen
  parentName: string;      // joined from users
  parentCity: string;      // joined from parent_profiles (may be empty)
  parentProfilePhotoUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  area: string;
  date: string | null;    // 'YYYY-MM-DD'
  time: string | null;    // 'HH:mm'
  numChildren: number | null;
  childAgeRange: string[];
  note: string;
  isActive: boolean;
  createdAt: string;
};

// Fields the parent fills in when creating a post
export type PostDraft = {
  note: string;
  area: string;
  date: string | null;
  time: string | null;
  numChildren: number | null;
  childAgeRange: string[];
};
