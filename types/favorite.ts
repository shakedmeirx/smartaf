export type Favorite = {
  id: string;
  parentId: string;      // references User.id
  babysitterId: string;  // references BabysitterProfile.id
  createdAt: string;     // ISO timestamp
};
