// ─── Form draft ────────────────────────────────────────────────────────────────
// Used only in the send-request screen for local UI state.
// numChildren stays a string here because the TagSelector works with strings.

export type RequestType = 'quick_message' | 'full_childcare';

export type RequestDraft = {
  requestType: RequestType;
  date: string;
  time: string;
  numChildren: string;  // tag selector value: '1' | '2' | '3' | '4+'
  childAgeRange: string[];
  area: string;
  note: string;
};

export const initialRequestDraft: RequestDraft = {
  requestType: 'quick_message',
  date: '',
  time: '',
  numChildren: '',
  childAgeRange: [],
  area: '',
  note: '',
};

// ─── Stored request ────────────────────────────────────────────────────────────
// Backend-ready shape. Used in shared state and mock data.

export type RequestStatus = 'pending' | 'accepted' | 'declined';
export type RequestInitiator = 'parent' | 'babysitter';

export type Request = {
  id: string;
  parentId: string;      // references User.id
  babysitterId: string;  // references BabysitterProfile.id
  initiatedBy: RequestInitiator;
  requestType: RequestType;
  status: RequestStatus;
  date: string;          // ISO date: 'YYYY-MM-DD'
  time: string;          // 'HH:mm'
  numChildren: number;
  childAgeRange: string[];
  area: string;
  note: string;
  createdAt: string;     // ISO timestamp
  counterpartName?: string; // populated based on the active role that loaded the request
  counterpartPhotoUrl?: string;
  lastMessageText?: string;
  lastMessageCreatedAt?: string;
};
