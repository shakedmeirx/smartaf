import { supabase } from '@/lib/supabase';

export const BABYSITTER_PHOTOS_BUCKET = 'babysitter-photos';

export function getBabysitterProfilePhotoPath(userId: string) {
  return `${userId}/profile.jpg`;
}

export function getBabysitterGalleryPhotoPath(userId: string, fileName: string) {
  return `${userId}/gallery/${Date.now()}-${fileName}`;
}

export function getBabysitterPhotoUrl(path: string) {
  if (!path) return '';

  const { data } = supabase.storage
    .from(BABYSITTER_PHOTOS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : '';
}
