export type BabysitterRating = {
  id: string;
  parentId: string;
  babysitterId: string;
  stars: number;
  reviewText: string | null;
  createdAt: string;
  parentName?: string;
};
