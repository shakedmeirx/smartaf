import { User } from '@/types/user';

export const mockUsers: User[] = [
  // Babysitters — ids match userId in mockBabysitters
  { id: 'usr_bbs_01', role: 'babysitter', name: 'שירה לוי' },
  { id: 'usr_bbs_02', role: 'babysitter', name: 'מיכל כהן' },
  { id: 'usr_bbs_03', role: 'babysitter', name: 'נועה אברהם' },
  { id: 'usr_bbs_04', role: 'babysitter', name: 'תמר שמש' },
  { id: 'usr_bbs_05', role: 'babysitter', name: 'אור בן דוד' },

  // Parents — ids match parentId in mockRequests
  { id: 'usr_par_01', role: 'parent', name: 'דנה כהן' },
  { id: 'usr_par_02', role: 'parent', name: 'יואב לוי' },
  { id: 'usr_par_03', role: 'parent', name: 'מיכל אברהם' },
];
