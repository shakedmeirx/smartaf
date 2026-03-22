import { supabase } from '@/lib/supabase';

export const PARENT_PHOTOS_BUCKET = 'parent-photos';

export function getParentProfilePhotoPath(userId: string) {
  return `${userId}/profile.jpg`;
}

export function getParentPhotoUrl(path: string) {
  if (!path) return '';

  const { data } = supabase.storage
    .from(PARENT_PHOTOS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : '';
}
