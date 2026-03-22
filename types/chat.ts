export type Message = {
  id: string;
  conversationId: string;  // references Conversation.id
  senderId: string;        // references User.id
  text: string;
  createdAt: string;       // ISO timestamp
  senderName?: string;     // joined from users table
};

export type Conversation = {
  id: string;
  requestId: string;     // references Request.id
  parentId: string;      // references User.id
  babysitterId: string;  // references BabysitterProfile.id
  createdAt: string;     // ISO timestamp
  closedAt?: string | null;
  closedByUserId?: string | null;
  // Denormalised last-message snapshot (updated by DB trigger on messages INSERT)
  lastMessageAt?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageText?: string | null;
};

export type ChatThread = {
  requestId: string;
  conversationId?: string;
  parentId: string;
  babysitterId: string;
  counterpartName: string;
  counterpartPhotoUrl?: string;
  previewText: string;
  previewCreatedAt: string;
  counterpartRole: 'parent' | 'babysitter';
  state: 'pending' | 'active';
  requestStatus: 'pending' | 'accepted' | 'declined';
  isAwaitingApproval: boolean;
};
