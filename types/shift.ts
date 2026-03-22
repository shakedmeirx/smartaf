export type ShiftPaymentStatus = 'paid' | 'unpaid';

export type BabysitterShift = {
  id: string;
  babysitterId: string;
  parentId: string | null;
  requestId: string | null;
  parentName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  hourlyRate: number;
  totalAmount: number;
  paymentStatus: ShiftPaymentStatus;
  paidAt: string | null;
  notes: string;
  createdAt: string;
};

export type BabysitterShiftDraft = {
  parentId?: string | null;
  requestId?: string | null;
  parentName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  hourlyRate: number;
  totalAmount: number;
  paymentStatus: ShiftPaymentStatus;
  paidAt?: string | null;
  notes: string;
};
