import * as ImagePicker from 'expo-image-picker';
import {
  BABYSITTER_PHOTOS_BUCKET,
  getBabysitterPhotoUrl,
  getBabysitterProfilePhotoPath,
} from '@/lib/babysitterPhotos';
import {
  getParentPhotoUrl,
  getParentProfilePhotoPath,
  PARENT_PHOTOS_BUCKET,
} from '@/lib/parentPhotos';
import { supabase } from '@/lib/supabase';

export class ProfilePhotoPermissionError extends Error {
  constructor() {
    super('profile-photo-permission-denied');
  }
}

type UploadedProfilePhoto = {
  path: string;
  url: string;
};

async function pickSquareImageAsset() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new ProfilePhotoPermissionError();
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0];
}

async function uploadProfilePhoto(
  bucket: string,
  path: string,
  asset: ImagePicker.ImagePickerAsset
) {
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

export async function selectAndUploadParentProfilePhoto(
  userId: string
): Promise<UploadedProfilePhoto | null> {
  const asset = await pickSquareImageAsset();

  if (!asset) {
    return null;
  }

  const path = getParentProfilePhotoPath(userId);
  await uploadProfilePhoto(PARENT_PHOTOS_BUCKET, path, asset);

  return {
    path,
    url: getParentPhotoUrl(path),
  };
}

export async function selectAndUploadBabysitterProfilePhoto(
  userId: string
): Promise<UploadedProfilePhoto | null> {
  const asset = await pickSquareImageAsset();

  if (!asset) {
    return null;
  }

  const path = getBabysitterProfilePhotoPath(userId);
  await uploadProfilePhoto(BABYSITTER_PHOTOS_BUCKET, path, asset);

  return {
    path,
    url: getBabysitterPhotoUrl(path),
  };
}

export async function removeParentProfilePhoto(path: string) {
  if (!path) {
    return;
  }

  const { error } = await supabase.storage
    .from(PARENT_PHOTOS_BUCKET)
    .remove([path]);

  if (error) {
    throw error;
  }
}

export async function removeBabysitterProfilePhoto(path: string) {
  if (!path) {
    return;
  }

  const { error } = await supabase.storage
    .from(BABYSITTER_PHOTOS_BUCKET)
    .remove([path]);

  if (error) {
    throw error;
  }
}

export function isProfilePhotoPermissionError(error: unknown) {
  return error instanceof ProfilePhotoPermissionError;
}
