import { supabase } from '@/lib/supabase';

export type DeleteAccountParams = {
  reason?: string;
};

export async function deleteCurrentAccount({ reason }: DeleteAccountParams = {}) {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {
      reason: reason?.trim() || null,
    },
  });

  if (error) {
    throw error;
  }

  return data as { success: boolean } | null;
}
