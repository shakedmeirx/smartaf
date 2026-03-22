import { View, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import AppText from '@/components/ui/AppText';
import { BabyCityChipTones, BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import SectionLabel from './SectionLabel';

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  onPickProfilePhoto: () => void;
  isUploadingProfilePhoto: boolean;
  onRemoveProfilePhoto: () => void;
  isRemovingProfilePhoto: boolean;
  onAddGalleryPhoto: () => void;
  onRemoveGalleryPhoto: (photoId: string) => void;
  isUploadingGalleryPhoto: boolean;
  removingGalleryPhotoId: string | null;
};

export default function Step5Photos({
  data,
  onChange,
  onPickProfilePhoto,
  isUploadingProfilePhoto,
  onRemoveProfilePhoto,
  isRemovingProfilePhoto,
  onAddGalleryPhoto,
  onRemoveGalleryPhoto,
  isUploadingGalleryPhoto,
  removingGalleryPhotoId,
}: Props) {
  return (
    <View>
      {/* Photo tip */}
      <View style={styles.tipBox}>
        <AppText variant="bodyLarge" weight="800" style={styles.tipTitle}>
          {strings.photoTipTitle}
        </AppText>
        <AppText style={styles.tipText}>{strings.photoTipText}</AppText>
      </View>

      {/* Profile photo */}
      <SectionLabel text={strings.profilePhotoPlaceholder} />
      <TouchableOpacity
        style={[styles.profileBox, data.profilePhotoUrl && styles.profileBoxSelected]}
        onPress={onPickProfilePhoto}
        disabled={isUploadingProfilePhoto}
      >
        {data.profilePhotoUrl ? (
          <>
            <Image source={{ uri: data.profilePhotoUrl }} style={styles.profilePreview} />
            <AppText variant="bodyLarge" weight="700" style={[styles.profileLabel, styles.profileLabelSelected]}>
              {strings.profilePhotoSelected}
            </AppText>
            <AppText variant="caption" weight="600" style={styles.tapToChange}>
              {strings.profilePhotoTapToChange}
            </AppText>
            <TouchableOpacity
              style={[styles.removeButton, isRemovingProfilePhoto && styles.removeButtonDisabled]}
              onPress={onRemoveProfilePhoto}
              disabled={isRemovingProfilePhoto}
            >
              {isRemovingProfilePhoto ? (
                <ActivityIndicator size="small" color={BabyCityPalette.error} />
              ) : (
                <AppText variant="caption" weight="700" style={styles.removeButtonText}>
                  {strings.profilePhotoRemove}
                </AppText>
              )}
            </TouchableOpacity>
          </>
        ) : isUploadingProfilePhoto ? (
          <>
            <ActivityIndicator size="small" color={BabyCityPalette.success} />
            <AppText variant="bodyLarge" weight="700" style={styles.profileLabel}>
              {strings.profilePhotoUploading}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="h1" weight="400" style={styles.profileIcon}>
              +
            </AppText>
            <AppText variant="bodyLarge" weight="700" style={styles.profileLabel}>
              {strings.profilePhotoPlaceholder}
            </AppText>
          </>
        )}
      </TouchableOpacity>

      {/* Gallery */}
      <SectionLabel text={strings.galleryLabel} />
      <View style={styles.gallery}>
        {data.galleryPhotos.map(photo => (
          <View key={photo.id ?? photo.path} style={styles.galleryItem}>
            <Image source={{ uri: photo.url }} style={styles.galleryPreview} />
            <TouchableOpacity
              style={[
                styles.galleryRemoveButton,
                removingGalleryPhotoId === (photo.id ?? photo.path) && styles.removeButtonDisabled,
              ]}
              onPress={() => onRemoveGalleryPhoto(photo.id ?? photo.path)}
              disabled={removingGalleryPhotoId === (photo.id ?? photo.path)}
            >
              {removingGalleryPhotoId === (photo.id ?? photo.path) ? (
                <ActivityIndicator size="small" color={BabyCityPalette.error} />
              ) : (
                <AppText variant="caption" weight="700" style={styles.galleryRemoveText}>
                  {strings.profilePhotoRemove}
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.galleryBox, isUploadingGalleryPhoto && styles.galleryBoxSelected]}
          onPress={onAddGalleryPhoto}
          disabled={isUploadingGalleryPhoto}
        >
          {isUploadingGalleryPhoto ? (
            <ActivityIndicator size="small" color={BabyCityPalette.success} />
          ) : (
            <AppText variant="h2" weight="400" style={styles.galleryIcon}>
              +
            </AppText>
          )}
        </TouchableOpacity>
        {Array.from({ length: Math.max(0, 3 - data.galleryPhotos.length) }).map((_, i) => (
          <TouchableOpacity
            key={`placeholder-${i}`}
            style={styles.galleryBox}
            disabled
          >
            <AppText variant="h2" weight="400" style={styles.galleryIcon}>
              +
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppText style={styles.note}>{strings.photoNote}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tipBox: {
    backgroundColor: BabyCityPalette.successSoft,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  tipTitle: {
    color: BabyCityPalette.textPrimary,
    marginBottom: 6,
  },
  tipText: {
    color: BabyCityPalette.textSecondary,
    lineHeight: 22,
  },
  profileBox: {
    minHeight: 166,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BabyCityPalette.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 8,
    paddingVertical: 24,
    backgroundColor: BabyCityPalette.surface,
  },
  profileBoxSelected: {
    borderColor: BabyCityPalette.success,
    borderStyle: 'solid',
    backgroundColor: BabyCityPalette.successSoft,
  },
  profileIcon: {
    color: BabyCityPalette.textTertiary,
  },
  profilePreview: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: BabyCityPalette.surfaceMuted,
  },
  profileLabel: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'center',
  },
  profileLabelSelected: {
    color: BabyCityPalette.success,
  },
  tapToChange: {
    color: BabyCityPalette.success,
    textAlign: 'center',
    marginTop: 2,
  },
  removeButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.errorSoft,
    borderWidth: 1,
    borderColor: BabyCityChipTones.error.border,
  },
  removeButtonDisabled: {
    opacity: 0.7,
  },
  removeButtonText: {
    color: BabyCityPalette.error,
  },
  gallery: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  galleryItem: {
    alignItems: 'center',
    gap: 8,
  },
  galleryBox: {
    width: 84,
    height: 84,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BabyCityPalette.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surface,
  },
  galleryPreview: {
    width: 84,
    height: 84,
    borderRadius: 16,
    backgroundColor: BabyCityPalette.surfaceMuted,
  },
  galleryBoxSelected: {
    borderColor: BabyCityPalette.success,
    borderStyle: 'solid',
    backgroundColor: BabyCityPalette.successSoft,
  },
  galleryIcon: {
    color: BabyCityPalette.textTertiary,
  },
  galleryRemoveButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.errorSoft,
    borderWidth: 1,
    borderColor: BabyCityChipTones.error.border,
  },
  galleryRemoveText: {
    color: BabyCityPalette.error,
  },
  note: {
    color: BabyCityPalette.textSecondary,
    marginTop: 6,
    lineHeight: 21,
  },
});
