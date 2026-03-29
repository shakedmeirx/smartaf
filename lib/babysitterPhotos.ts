import { getSignedStorageUrl, getSignedStorageUrlMap } from '@/lib/storageSignedUrl';

export const BABYSITTER_PHOTOS_BUCKET = 'babysitter-photos';

export function getBabysitterProfilePhotoPath(userId: string) {
  return `${userId}/profile.jpg`;
}

export function getBabysitterGalleryPhotoPath(userId: string, fileName: string) {
  return `${userId}/gallery/${Date.now()}-${fileName}`;
}

export function getBabysitterPhotoUrl(path: string) {
  return getSignedStorageUrl(BABYSITTER_PHOTOS_BUCKET, path);
}

export function getBabysitterPhotoUrls(paths: string[]) {
  return getSignedStorageUrlMap(BABYSITTER_PHOTOS_BUCKET, paths);
}
