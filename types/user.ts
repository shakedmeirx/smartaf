export type UserRole = 'parent' | 'babysitter';

export type User = {
  id: string;
  role: UserRole;
  name: string;
};
