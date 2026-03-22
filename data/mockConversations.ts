import { Conversation } from '@/types/chat';

// Pre-seeded conversation for req_01 (accepted before the demo starts).
// Messages are loaded from Supabase in the chat screen.
export const mockConversations: Conversation[] = [
  {
    id: 'conv_01',
    requestId: 'req_01',
    parentId: 'usr_par_01',
    babysitterId: 'bbs_01',
    createdAt: '2025-06-21T08:00:00Z',
  },
];
