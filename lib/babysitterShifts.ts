import { supabase } from '@/lib/supabase';
import { normalizeTimeValue } from '@/lib/time';
import { BabysitterShift, BabysitterShiftDraft, ShiftPaymentStatus } from '@/types/shift';

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function rowToShift(row: Record<string, unknown>): BabysitterShift {
  return {
    id: row.id as string,
    babysitterId: row.babysitter_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    requestId: (row.request_id as string | null) ?? null,
    parentName: (row.parent_name as string | null) ?? '',
    shiftDate: row.shift_date as string,
    startTime: normalizeTimeValue(row.start_time as string),
    endTime: normalizeTimeValue(row.end_time as string),
    hoursWorked: Number(row.hours_worked ?? 0),
    hourlyRate: Number(row.hourly_rate ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    paymentStatus: (row.payment_status as ShiftPaymentStatus | null) ?? 'unpaid',
    paidAt: (row.paid_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? '',
    createdAt: row.created_at as string,
  };
}

function resolvePaidAtValue(paymentStatus: ShiftPaymentStatus, paidAt?: string | null) {
  if (paymentStatus === 'paid') {
    return paidAt ?? new Date().toISOString();
  }

  return null;
}

export function calculateShiftHours(startTime: string, endTime: string): number | null {
  if (!startTime || !endTime) {
    return null;
  }

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return null;
  }

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  if (endTotalMinutes <= startTotalMinutes) {
    return null;
  }

  return roundMoney((endTotalMinutes - startTotalMinutes) / 60);
}

export function calculateShiftTotal(hoursWorked: number, hourlyRate: number): number {
  return roundMoney(hoursWorked * hourlyRate);
}

export function formatShiftCurrency(amount: number) {
  return `₪${roundMoney(amount).toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

export function formatShiftHours(hoursWorked: number) {
  const rounded = roundMoney(hoursWorked);

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(2).replace(/0$/, '').replace(/\.00$/, '');
}

export async function loadBabysitterShifts(babysitterProfileId: string) {
  const { data, error } = await supabase
    .from('babysitter_shifts')
    .select('*')
    .eq('babysitter_id', babysitterProfileId)
    .order('shift_date', { ascending: false })
    .order('created_at', { ascending: false });

  return {
    shifts: (data ?? []).map(row => rowToShift(row as Record<string, unknown>)),
    error,
  };
}

export async function createBabysitterShift(
  babysitterProfileId: string,
  draft: BabysitterShiftDraft
) {
  const { data, error } = await supabase
    .from('babysitter_shifts')
    .insert({
      babysitter_id: babysitterProfileId,
      parent_id: draft.parentId ?? null,
      request_id: draft.requestId ?? null,
      parent_name: draft.parentName.trim(),
      shift_date: draft.shiftDate,
      start_time: normalizeTimeValue(draft.startTime),
      end_time: normalizeTimeValue(draft.endTime),
      hours_worked: draft.hoursWorked,
      hourly_rate: draft.hourlyRate,
      total_amount: draft.totalAmount,
      payment_status: draft.paymentStatus,
      paid_at: resolvePaidAtValue(draft.paymentStatus, draft.paidAt),
      notes: draft.notes.trim(),
    })
    .select('*')
    .single();

  return {
    shift: data ? rowToShift(data as Record<string, unknown>) : null,
    error,
  };
}

export async function updateBabysitterShift(
  shiftId: string,
  draft: BabysitterShiftDraft
) {
  const { data, error } = await supabase
    .from('babysitter_shifts')
    .update({
      parent_id: draft.parentId ?? null,
      request_id: draft.requestId ?? null,
      parent_name: draft.parentName.trim(),
      shift_date: draft.shiftDate,
      start_time: normalizeTimeValue(draft.startTime),
      end_time: normalizeTimeValue(draft.endTime),
      hours_worked: draft.hoursWorked,
      hourly_rate: draft.hourlyRate,
      total_amount: draft.totalAmount,
      payment_status: draft.paymentStatus,
      paid_at: resolvePaidAtValue(draft.paymentStatus, draft.paidAt),
      notes: draft.notes.trim(),
    })
    .eq('id', shiftId)
    .select('*')
    .single();

  return {
    shift: data ? rowToShift(data as Record<string, unknown>) : null,
    error,
  };
}

export async function deleteBabysitterShift(shiftId: string) {
  const { error } = await supabase
    .from('babysitter_shifts')
    .delete()
    .eq('id', shiftId);

  return { error };
}

export async function setBabysitterShiftPaymentStatus(
  shiftId: string,
  paymentStatus: ShiftPaymentStatus,
  existingPaidAt?: string | null
) {
  const { data, error } = await supabase
    .from('babysitter_shifts')
    .update({
      payment_status: paymentStatus,
      paid_at: resolvePaidAtValue(paymentStatus, existingPaidAt),
    })
    .eq('id', shiftId)
    .select('*')
    .single();

  return {
    shift: data ? rowToShift(data as Record<string, unknown>) : null,
    error,
  };
}
