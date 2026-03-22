import { useMemo } from 'react';
import { Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';
import InfoChip from '@/components/ui/InfoChip';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { strings } from '@/locales';
import { ParentPost } from '@/types/post';
import {
  BabysitterDesignTokens,
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';

const AnimatedCard = Animated.createAnimatedComponent(View);

type ParentPostCardProps = {
  post: ParentPost;
  onViewProfile: () => void;
  onSendMessage: () => void;
  messageButtonLabel?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  highlighted?: boolean;
  index?: number;
  photoUrl?: string;
};

export default function ParentPostCard({
  post,
  onViewProfile,
  onSendMessage,
  messageButtonLabel,
  isSaved = false,
  onToggleSave,
  highlighted = false,
  index = 0,
  photoUrl,
}: ParentPostCardProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  function handlePressIn() {
    scale.value = withTiming(0.988, { duration: 120 });
    translateY.value = withTiming(-3, { duration: 120 });
  }

  function handlePressOut() {
    scale.value = withTiming(1, { duration: 140 });
    translateY.value = withTiming(0, { duration: 140 });
  }

  const dateTimePill =
    post.date
      ? post.time
        ? `${post.date} · ${post.time}`
        : post.date
      : null;

  const isSoon = useMemo(() => {
    if (!post.date) return false;
    const postDate = new Date(post.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = (postDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  }, [post.date]);

  const parentCity = post.parentCity || post.area;

  const metaItems = [
    post.area
      ? {
          icon: 'location-on' as keyof typeof MaterialIcons.glyphMap,
          label: strings.cityLabel,
          value: post.area,
        }
      : null,
    post.date
      ? {
          icon: 'calendar-today' as keyof typeof MaterialIcons.glyphMap,
          label: strings.birthDate,
          value: post.date,
        }
      : null,
    post.time
      ? {
          icon: 'schedule' as keyof typeof MaterialIcons.glyphMap,
          label: strings.postTime,
          value: post.time,
        }
      : null,
    post.numChildren !== null
      ? {
          icon: 'group' as keyof typeof MaterialIcons.glyphMap,
          label: strings.parentChildrenCount,
          value: `${post.numChildren} ${strings.familyFeedChildrenSuffix}`,
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
  }>;

  return (
    <AnimatedCard
      entering={FadeInDown.duration(220).delay(120 + index * 55)}
      style={[styles.cardShell, animatedStyle, highlighted && styles.cardShellHighlighted]}
    >
      <View onTouchStart={handlePressIn} onTouchEnd={handlePressOut}>
        <AppCard role="babysitter" variant="list" style={[styles.card, highlighted && styles.cardHighlighted]}>
          <View style={styles.cardTopRow}>
            <TouchableOpacity
              style={styles.cardIdentityTouchable}
              activeOpacity={0.78}
              onPress={event => {
                event.stopPropagation();
                onViewProfile();
              }}
            >
              <AvatarCircle
                name={post.parentName || strings.familyFeedAnonymous}
                photoUrl={post.parentProfilePhotoUrl || photoUrl}
                size={56}
                tone="accent"
              />
              <View style={styles.cardIdentity}>
                <AppText variant="h2" weight="800" style={styles.cardName}>
                  {post.parentName || strings.familyFeedAnonymous}
                </AppText>
                <AppText variant="body" tone="muted" style={styles.cardCity}>
                  {parentCity}
                </AppText>
                <View style={styles.statusRow}>
                  <InfoChip
                    label={isSoon ? strings.postSoonLabel : strings.parentPostStatusActive}
                    tone={isSoon ? 'warning' : 'muted'}
                    size="sm"
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <AppText
            variant="bodyLarge"
            numberOfLines={2}
            style={styles.noteText}
          >
            {post.note || strings.familyFeedNoteEmpty}
          </AppText>

          {metaItems.length > 0 ? (
            <View style={styles.metaGrid}>
              {metaItems.map(item => (
                <MetaPill
                  key={`${item.label}:${item.value}`}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </View>
          ) : null}

          {post.childAgeRange.length > 0 ? (
            <View style={styles.tagsRow}>
              {post.childAgeRange.map(group => (
                <AppChip key={group} label={group} tone="accent" size="sm" />
              ))}
            </View>
          ) : null}

          <View style={styles.cardActions}>
            <AppButton
              label={messageButtonLabel ?? strings.postSendMessage}
              variant="primary"
              fullWidth={false}
              style={styles.cardSendButton}
              onPress={() => {
                onSendMessage();
              }}
            />
            {onToggleSave ? (
              <TouchableOpacity
                style={styles.cardIconButton}
                onPress={() => {
                  onToggleSave();
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={isSaved ? 'bookmark' : 'bookmark-border'}
                  size={20}
                  color={BabyCityPalette.primary}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.cardIconButton}
              onPress={() => {
                const url = `babysitconnect:///babysitter?postId=${post.id}`;
                Share.share({ message: `${strings.sharePostText}\n${url}` });
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="share" size={20} color={BabyCityPalette.primary} />
            </TouchableOpacity>
          </View>
        </AppCard>
      </View>
    </AnimatedCard>
  );
}

function MetaPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaPill}>
      <MaterialIcons name={icon} size={16} color={BabyCityPalette.textSecondary} />
      <View style={styles.metaPillText}>
        <AppText variant="caption" tone="muted" style={styles.metaPillLabel}>
          {label}
        </AppText>
        <AppText variant="body" weight="700" style={styles.metaPillValue}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
  cardShellHighlighted: {
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 7,
  },
  card: {
    paddingVertical: 14,
  },
  cardHighlighted: {
    borderColor: BabyCityPalette.primary,
    borderWidth: 2,
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  cardIdentityTouchable: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    gap: BabyCityGeometry.spacing.sm,
  },
  cardIdentity: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  cardName: {
    textAlign: 'right',
    lineHeight: 26,
  },
  cardCity: {
    marginTop: 2,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row-reverse',
    marginTop: BabyCityGeometry.spacing.sm,
    width: '100%',
  },
  noteText: {
    lineHeight: 22,
    textAlign: 'right',
    marginTop: BabyCityGeometry.spacing.sm,
  },
  metaGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.sm,
  },
  metaPill: {
    width: '48%',
    minHeight: 54,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
    borderRadius: BabyCityGeometry.radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  metaPillLabel: {
    textAlign: 'right',
  },
  metaPillValue: {
    textAlign: 'right',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.sm,
  },
  cardActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.sm,
  },
  cardSendButton: {
    flex: 1,
  },
  cardIconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
    borderRadius: BabyCityGeometry.radius.control,
  },
});
