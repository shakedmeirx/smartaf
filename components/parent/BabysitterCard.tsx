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
}: Props) {
  const {
    name,
    age,
    city,
    hourlyRate,
    languages,
    hasCar,
    hasFirstAid,
    isVerified,
    hasReferences,
    profilePhotoUrl,
  } = babysitter;

  const trustItems = [
    isVerified ? { label: strings.verifiedBadge, tone: 'success' as const } : null,
    hasFirstAid ? { label: strings.firstAidBadge, tone: 'accent' as const } : null,
    hasCar ? { label: strings.hasCarBadge, tone: 'primary' as const } : null,
    hasReferences ? { label: strings.referencesBadge, tone: 'muted' as const } : null,
  ].filter(Boolean) as Array<{ label: string; tone: 'success' | 'accent' | 'primary' | 'muted' }>;

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

        <View style={styles.metaRow}>
          <AppChip label={`₪${hourlyRate} ${strings.perHour}`} tone="primary" size="sm" />
          {languages.slice(0, 2).map(lang => (
            <AppChip key={lang} label={lang} tone="accent" size="sm" />
          ))}
          {trustItems.slice(0, 2).map(item => (
            <AppChip key={item.label} label={item.label} tone={item.tone} size="sm" />
          ))}
        </View>

        {trustItems.length > 2 ? (
          <View style={styles.trustRow}>
            {trustItems.slice(2).map(item => (
              <AppChip key={item.label} label={item.label} tone={item.tone} size="sm" />
            ))}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <AppButton
            label={messageButtonLabel ?? strings.sendMessage}
            variant="primary"
            fullWidth={false}
            style={styles.sendButton}
            onPress={e => {
              e.stopPropagation?.();
              onSendMessage();
            }}
          />
          {onToggleFavorite ? (
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
                size={20}
                color={isFavorite ? BabyCityPalette.error : BabyCityPalette.primary}
              />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={async e => {
              e.stopPropagation?.();
              const url = `babysitconnect:///babysitter-profile?id=${babysitter.id}`;
              await Share.share({ message: `${strings.shareBabysitterText}\n${url}` });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconButton}
          >
            <Ionicons name="share-outline" size={20} color={BabyCityPalette.primary} />
          </TouchableOpacity>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
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
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.md,
  },
  sendButton: {
    flex: 1,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    borderRadius: BabyCityGeometry.radius.control,
  },
});
