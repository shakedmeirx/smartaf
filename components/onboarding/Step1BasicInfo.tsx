import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BabyCityChipTones, BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';
import { OnboardingData } from '@/types/onboarding';
import LabeledInput from './LabeledInput';
import BirthdayField from './BirthdayField';
import SectionLabel from './SectionLabel';
import TagSelector from './TagSelector';
import AddressLocationField from '@/components/ui/AddressLocationField';
import AppText from '@/components/ui/AppText';

const LANGUAGE_OPTIONS = ['עברית', 'אנגלית', 'ערבית', 'רוסית', 'אמהרית', 'צרפתית', 'ספרדית'];

type Props = {
  data: OnboardingData;
  onChange: (fields: Partial<OnboardingData>) => void;
  errors?: Partial<Record<'firstName' | 'city' | 'addressFull' | 'birthDate' | 'languages', string>>;
  // Photo + gallery handlers
  onPickProfilePhoto: () => void;
  isUploadingProfilePhoto: boolean;
  onRemoveProfilePhoto: () => void;
  isRemovingProfilePhoto: boolean;
  onAddGalleryPhoto: () => void;
  onRemoveGalleryPhoto: (photoId: string) => void;
  isUploadingGalleryPhoto: boolean;
  removingGalleryPhotoId: string | null;
};

export default function Step1BasicInfo({
  data,
  onChange,
  errors = {},
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
      <LabeledInput
        label={strings.firstName}
        value={data.firstName}
        onChange={v => onChange({ firstName: v })}
        placeholder={strings.firstNamePlaceholder}
        returnKeyType="next"
        autoFocus
        errorText={errors.firstName}
      />
      <AddressLocationField
        city={data.city}
        value={data.addressFull}
        onChange={v => onChange({ addressFull: v })}
        onCoordinatesObtained={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
        onCityChange={v => onChange({ city: v })}
        errorText={errors.addressFull}
        cityErrorText={errors.city}
        role="babysitter"
      />
      <BirthdayField
        label={strings.birthDate}
        value={data.birthDate}
        onChange={v => onChange({ birthDate: v })}
        errorText={errors.birthDate}
      />

      {/* Combined photos section — profile photo + gallery */}
      <View style={styles.photosSection}>
        <SectionLabel text={strings.step5Title} />

        {/* Profile photo avatar */}
        <View style={styles.avatarRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onPickProfilePhoto}
            disabled={isUploadingProfilePhoto}
            style={styles.avatarTouchable}
          >
            <View style={styles.avatarRing}>
              {data.profilePhotoUrl ? (
                <Image
                  source={{ uri: data.profilePhotoUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  {isUploadingProfilePhoto ? (
                    <ActivityIndicator size="large" color={BabyCityPalette.primary} />
                  ) : (
                    <MaterialIcons name="person" size={48} color={BabyCityPalette.outlineVariant} />
                  )}
                </View>
              )}
            </View>

            <View style={styles.cameraBadgeShadow}>
              <LinearGradient
                colors={[BabyCityPalette.primary, '#6411d5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cameraBadge}
              >
                {isUploadingProfilePhoto ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
                )}
              </LinearGradient>
            </View>
          </TouchableOpacity>

          <View style={styles.avatarMeta}>
            <AppText variant="bodyLarge" weight="700" style={styles.avatarMetaTitle}>
              {strings.profilePhotoPlaceholder}
            </AppText>
            {data.profilePhotoUrl ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onRemoveProfilePhoto}
                disabled={isRemovingProfilePhoto}
                style={styles.removePhotoButton}
              >
                {isRemovingProfilePhoto ? (
                  <ActivityIndicator size="small" color={BabyCityPalette.error} />
                ) : (
                  <AppText variant="caption" weight="700" style={styles.removePhotoText}>
                    {strings.profilePhotoRemove}
                  </AppText>
                )}
              </TouchableOpacity>
            ) : (
              <AppText variant="caption" tone="muted">
                {strings.profilePhotoTapToChange}
              </AppText>
            )}
          </View>
        </View>

        {/* Gallery */}
        <AppText variant="caption" weight="700" tone="muted" style={styles.galleryLabel}>
          {strings.galleryLabel}
        </AppText>
        <View style={styles.gallery}>
          {data.galleryPhotos.map(photo => (
            <View key={photo.id ?? photo.path} style={styles.galleryItem}>
              <Image source={{ uri: photo.url }} style={styles.galleryPreview} />
              <TouchableOpacity
                style={[
                  styles.galleryRemoveButton,
                  removingGalleryPhotoId === (photo.id ?? photo.path) && styles.buttonDisabled,
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
            <TouchableOpacity key={`placeholder-${i}`} style={styles.galleryBox} disabled>
              <AppText variant="h2" weight="400" style={styles.galleryIcon}>
                +
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <SectionLabel text={strings.spokenLanguages} />
      <TagSelector
        options={LANGUAGE_OPTIONS}
        selected={data.languages}
        onChange={v => onChange({ languages: v })}
        errorText={errors.languages}
        tone="blue"
      />
    </View>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  photosSection: {
    marginTop: 4,
    marginBottom: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: `${BabyCityPalette.outline}22`,
  },
  avatarRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 18,
    marginBottom: 24,
  },
  avatarTouchable: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    flexShrink: 0,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    padding: 3,
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: BabyCityPalette.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeShadow: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 18,
  },
  cameraBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  avatarMeta: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  avatarMetaTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  removePhotoButton: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.errorSoft,
  },
  removePhotoText: {
    color: BabyCityPalette.error,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  galleryLabel: {
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  gallery: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
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
});
