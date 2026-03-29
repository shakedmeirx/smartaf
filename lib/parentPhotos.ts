import { getSignedStorageUrl, getSignedStorageUrlMap } from '@/lib/storageSignedUrl';

export const PARENT_PHOTOS_BUCKET = 'parent-photos';

export function getParentProfilePhotoPath(userId: string) {
  return `${userId}/profile.jpg`;
}

export function getParentPhotoUrl(path: string) {
  return getSignedStorageUrl(PARENT_PHOTOS_BUCKET, path);
}

export function getParentPhotoUrls(paths: string[]) {
  return getSignedStorageUrlMap(PARENT_PHOTOS_BUCKET, paths);
}
