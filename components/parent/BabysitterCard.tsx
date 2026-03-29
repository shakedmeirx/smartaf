import { View, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { Babysitter } from '@/types/babysitter';
import { strings } from '@/locales';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
} from '@/constants/theme';

type Props = {
  babysitter: Babysitter;
  onPress: () => void;
  onSendMessage: () => void;
  messageButtonLabel?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  averageStars?: number | null;
  ratingCount?: number;
  variant?: 'default' | 'editorial' | 'saved';
};

export default function BabysitterCard({
  babysitter,
  onPress,
  onSendMessage,
  messageButtonLabel,
  isFavorite = false,
  onToggleFavorite,
  averageStars = null,
  ratingCount = 0,
  variant = 'default',
}: Props) {
  const {
    name,
    age,
    city,
    hourlyRate,
    bio,
    languages,
    hasCar,
    hasFirstAid,
    hasReferences,
    profilePhotoUrl,
    yearsExperience,
  } = babysitter;

  const trustItems = [
    hasFirstAid ? { label: strings.firstAidBadge, tone: 'accent' as const } : null,
    hasCar ? { label: strings.hasCarBadge, tone: 'primary' as const } : null,
    hasReferences ? { label: strings.referencesBadge, tone: 'muted' as const } : null,
  ].filter(Boolean) as { label: string; tone: 'accent' | 'primary' | 'muted' }[];

  if (variant === 'saved') {
    const savedTags = [
      ...languages.slice(0, 1).map(label => ({ key: `lang-${label}`, label })),
      ...trustItems.slice(0, 1).map(item => ({ key: `trust-${item.label}`, label: item.label })),
    ];

    return (
      <TouchableOpacity activeOpacity={0.96} onPress={onPress}>
        <AppCard variant="default" style={styles.savedCard}>
          <View style={styles.savedAvatarWrap}>
            <AvatarCircle name={name} photoUrl={profilePhotoUrl} size={80} tone="accent" />
          </View>

          {onToggleFavorite ? (
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.savedIconButtonPrimary}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={BabyCityPalette.primary}
              />
            </TouchableOpacity>
          ) : null}

          <View style={styles.savedHeaderTextBlock}>
            <AppText variant="h3" weight="800" style={styles.savedName}>
              {age ? `${name}, ${age}` : name}
            </AppText>

            <View style={styles.savedLocationRow}>
              <AppText variant="body" tone="muted" style={styles.savedLocationText}>
                {city}
              </AppText>
              <Ionicons name="location-outline" size={15} color={BabyCityPalette.textSecondary} />
            </View>

            {averageStars != null ? (
              <View style={styles.savedRatingRow}>
                <AppText variant="caption" weight="500" tone="muted" style={styles.savedRatingCount}>
                  {strings.savedBabysitterReviews(ratingCount)}
                </AppText>
                <AppText variant="caption" weight="700" style={styles.savedRatingValue}>
                  {averageStars.toFixed(1)}
                </AppText>
                <Ionicons name="star" size={14} color={BabyCityChipTones.warning.text} />
              </View>
            ) : null}
          </View>

          {savedTags.length > 0 ? (
            <View style={styles.savedTagRow}>
              {savedTags.map(tag => (
                <View key={tag.key} style={styles.savedTag}>
                  <AppText variant="caption" weight="700" style={styles.savedTagText}>
                    {tag.label}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.savedFooterRow}>
            <View style={styles.savedPriceWrap}>
              <AppText variant="body" tone="muted" style={styles.savedPriceSuffix}>
                {strings.perHour}
              </AppText>
              <AppText variant="h2" weight="800" style={styles.savedPriceValue}>
                {`₪${hourlyRate}`}
              </AppText>
            </View>

            <View style={styles.savedButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={e => {
                  e.stopPropagation?.();
                  onSendMessage();
                }}
                style={styles.savedSecondaryButton}
              >
                <AppText variant="body" weight="800" style={styles.savedSecondaryButtonText}>
                  {messageButtonLabel ?? strings.sendMessage}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={e => {
                  e.stopPropagation?.();
                  onPress();
                }}
                style={styles.savedPrimaryButton}
              >
                <AppText variant="body" weight="800" style={styles.savedPrimaryButtonText}>
                  {strings.viewProfile}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  }

  if (variant === 'editorial') {
    const detailItems: {
      key: string;
      icon: keyof typeof Ionicons.glyphMap;
      eyebrow: string;
      value: string;
    }[] = [
      {
        key: 'rate',
        icon: 'cash-outline',
        eyebrow: strings.reviewRate,
        value: `${hourlyRate} ₪ ${strings.perHourSuffix}`,
      },
      {
        key: 'experience',
        icon: 'briefcase-outline',
        eyebrow: strings.reviewExperience,
        value: yearsExperience || strings.filterExperienceAny,
      },
    ];

    return (
      <TouchableOpacity activeOpacity={0.96} onPress={onPress}>
        <AppCard variant="default" style={styles.editorialCard}>
          <View style={styles.editorialAvatarWrap}>
            <AvatarCircle name={name} photoUrl={profilePhotoUrl} size={68} />
          </View>

          <View style={styles.editorialHeader}>
            <View style={styles.editorialHeaderText}>
              <AppText variant="h2" weight="800" style={styles.editorialName}>
                {age ? `${name}, ${age}` : name}
              </AppText>

              <View style={styles.editorialLocationRow}>
                <Ionicons name="location-outline" size={16} color={BabyCityPalette.textSecondary} />
                <AppText variant="body" tone="muted" style={styles.editorialLocationText}>
                  {city}
                </AppText>
              </View>

              {averageStars != null ? (
                <View style={styles.ratingRow}>
                  <AppText variant="caption" weight="500" tone="muted" style={styles.ratingCount}>
                    ({ratingCount})
                  </AppText>
                  <AppText variant="caption" weight="700" style={styles.ratingValue}>
                    {averageStars}
                  </AppText>
                  <AppText variant="caption" weight="700" style={styles.ratingStar}>
                    ★
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.editorialDetailGrid}>
            {detailItems.map(item => (
              <View key={item.key} style={styles.editorialDetailCard}>
                <View style={styles.editorialDetailIcon}>
                  <Ionicons name={item.icon} size={16} color={BabyCityPalette.primary} />
                </View>
                <View style={styles.editorialDetailText}>
                  <AppText variant="caption" tone="muted" style={styles.editorialDetailEyebrow}>
                    {item.eyebrow}
                  </AppText>
                  <AppText variant="body" weight="700" style={styles.editorialDetailValue}>
                    {item.value}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <AppText variant="body" tone="muted" numberOfLines={3} style={styles.editorialBio}>
            {bio}
          </AppText>

          {(languages.length > 0 || trustItems.length > 0) ? (
            <View style={styles.editorialMetaRow}>
              {languages.slice(0, 2).map(lang => (
                <AppChip key={lang} label={lang} tone="accent" size="sm" />
              ))}
              {trustItems.slice(0, 2).map(item => (
                <AppChip key={item.label} label={item.label} tone={item.tone} size="sm" />
              ))}
            </View>
          ) : null}

          <AppButton
            label={messageButtonLabel ?? strings.sendMessage}
            variant="primary"
            onPress={e => {
              e.stopPropagation?.();
              onSendMessage();
            }}
            style={styles.editorialPrimaryButton}
          />
        </AppCard>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onPress}>
      <AppCard variant="default" style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.info}>
            <AppText variant="h2" weight="800" style={styles.name}>
              {age ? `${name}, ${age}` : name}
            </AppText>
            <AppText variant="body" tone="muted" style={styles.city}>
              {city}
            </AppText>
            {averageStars != null ? (
              <View style={styles.ratingRow}>
                <AppText variant="caption" weight="500" tone="muted" style={styles.ratingCount}>
                  ({ratingCount})
                </AppText>
                <AppText variant="caption" weight="700" style={styles.ratingValue}>
                  {averageStars}
                </AppText>
                <AppText variant="caption" weight="700" style={styles.ratingStar}>
                  ★
                </AppText>
              </View>
            ) : null}
          </View>

          <AvatarCircle name={name} photoUrl={profilePhotoUrl} size={84} />
        </View>

        {(languages.length > 0 || trustItems.length > 0) ? (
          <View style={styles.metaRow}>
            {languages.slice(0, 2).map(lang => (
              <AppChip key={lang} label={lang} tone="accent" size="sm" />
            ))}
            {trustItems.slice(0, 2).map(item => (
              <AppChip key={item.label} label={item.label} tone={item.tone} size="sm" />
            ))}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <AppText variant="bodyLarge" weight="800" style={styles.priceText}>
            {`₪${hourlyRate} ${strings.perHour}`}
          </AppText>
          <View style={styles.actionButtons}>
            <AppButton
              label={messageButtonLabel ?? strings.sendMessage}
              variant="secondary"
              fullWidth={false}
              style={styles.actionButton}
              onPress={e => {
                e.stopPropagation?.();
                onSendMessage();
              }}
            />
            <AppButton
              label={strings.viewProfile}
              variant="primary"
              fullWidth={false}
              style={styles.actionButton}
              onPress={e => {
                e.stopPropagation?.();
                onPress();
              }}
            />
          </View>
        </View>

        {onToggleFavorite ? (
          <View style={styles.bookmarkRow}>
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconButton}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? BabyCityPalette.error : BabyCityPalette.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async e => {
                e.stopPropagation?.();
                const url = `smartaf:///babysitter-profile?id=${babysitter.id}`;
                await Share.share({ message: `${strings.shareBabysitterText}\n${url}` });
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconButton}
            >
              <Ionicons name="share-outline" size={18} color={BabyCityPalette.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  savedCard: {
    marginTop: 12,
    marginBottom: 18,
    paddingTop: 22,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    position: 'relative',
  },
  savedAvatarWrap: {
    position: 'absolute',
    top: 16,
    right: 18,
    zIndex: 2,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: BabyCityPalette.canvas,
    backgroundColor: BabyCityPalette.canvas,
  },
  savedHeaderTextBlock: {
    minHeight: 84,
    paddingRight: 102,
    paddingLeft: 54,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  savedIconButtonPrimary: {
    position: 'absolute',
    top: 22,
    left: 18,
    zIndex: 3,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
  },
  savedName: {
    textAlign: 'right',
    lineHeight: 26,
    width: '100%',
    writingDirection: 'rtl',
  },
  savedLocationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  savedLocationText: {
    textAlign: 'right',
    flexShrink: 1,
    writingDirection: 'rtl',
  },
  savedRatingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  savedRatingValue: {
    color: BabyCityChipTones.warning.text,
  },
  savedRatingCount: {
    lineHeight: 16,
  },
  savedTagRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  savedTag: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
  },
  savedTagText: {
    color: BabyCityPalette.primary,
  },
  savedFooterRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  savedPriceWrap: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  savedPriceValue: {
    color: BabyCityPalette.primary,
    lineHeight: 30,
  },
  savedPriceSuffix: {
    marginTop: 2,
  },
  savedButtonsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  savedPrimaryButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BabyCityGeometry.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primary,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  savedPrimaryButtonText: {
    color: '#ffffff',
  },
  savedSecondaryButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BabyCityGeometry.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
  },
  savedSecondaryButtonText: {
    color: BabyCityPalette.primary,
  },
  editorialCard: {
    marginTop: 12,
    marginBottom: 18,
    paddingTop: 22,
    borderRadius: 28,
    position: 'relative',
  },
  editorialAvatarWrap: {
    position: 'absolute',
    top: 16,
    right: 18,
    zIndex: 2,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: BabyCityPalette.canvas,
    backgroundColor: BabyCityPalette.canvas,
  },
  editorialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 90,
    minHeight: 84,
  },
  editorialHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  editorialName: {
    textAlign: 'right',
    lineHeight: 28,
    width: '100%',
  },
  editorialLocationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },
  editorialLocationText: {
    textAlign: 'right',
    flexShrink: 1,
    writingDirection: 'rtl',
  },
  editorialDetailGrid: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 16,
  },
  editorialDetailCard: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
  },
  editorialDetailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}14`,
  },
  editorialDetailText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  editorialDetailEyebrow: {
    textAlign: 'right',
    lineHeight: 16,
  },
  editorialDetailValue: {
    textAlign: 'right',
    lineHeight: 20,
  },
  editorialBio: {
    marginTop: 14,
    textAlign: 'right',
    lineHeight: 22,
  },
  editorialMetaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: 14,
  },
  editorialPrimaryButton: {
    marginTop: 18,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.md,
  },
  info: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  name: {
    textAlign: 'right',
    lineHeight: 28,
  },
  city: {
    marginTop: BabyCityGeometry.spacing.xs,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.sm,
  },
  trustRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.md,
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginTop: BabyCityGeometry.spacing.xs,
  },
  ratingStar: {
    color: BabyCityChipTones.warning.text,
    lineHeight: 16,
  },
  ratingValue: {
    color: BabyCityPalette.textPrimary,
    lineHeight: 16,
  },
  ratingCount: {
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.md,
  },
  priceText: {
    color: BabyCityPalette.primary,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row-reverse',
    gap: BabyCityGeometry.spacing.sm,
  },
  actionButton: {
    minWidth: 90,
  },
  bookmarkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    borderRadius: BabyCityGeometry.radius.control,
  },
});
