import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import AppText from '@/components/ui/AppText';
import AppChip from '@/components/ui/AppChip';
import { strings } from '@/locales';
import { ParentPost } from '@/types/post';
import {
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

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

  const isSoon = useMemo(() => {
    if (!post.date) return false;
    const postDate = new Date(post.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = (postDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  }, [post.date]);

  const parentCity = post.parentCity || post.area;

  // Build Stitch-style meta items: date+time combined, children count
  const metaItems: Array<{
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
  }> = [];

  if (post.date || post.time) {
    const dateVal = post.date ?? '';
    const timeVal = post.time ?? '';
    metaItems.push({
      icon: 'calendar-today',
      label: strings.birthDate,
      value: dateVal && timeVal ? `${dateVal} · ${timeVal}` : dateVal || timeVal,
    });
  }

  if (post.numChildren !== null) {
    metaItems.push({
      icon: 'child-care',
      label: strings.parentChildrenCount,
      value: `${post.numChildren} ${strings.familyFeedChildrenSuffix}`,
    });
  }

  if (!post.date && !post.time && post.area) {
    metaItems.push({
      icon: 'location-on',
      label: strings.cityLabel,
      value: post.area,
    });
  }

  const avatarPhotoUrl = post.parentProfilePhotoUrl || photoUrl;
  const displayName = post.parentName || strings.familyFeedAnonymous;

  const badgeLabel = isSoon ? strings.postSoonLabel : strings.parentPostStatusActive;
  const badgeBg = isSoon ? '#fef3c7' : '#e9def5';
  const badgeText = isSoon ? '#92400e' : '#564f61';

  return (
    <AnimatedView
      entering={FadeInDown.duration(220).delay(120 + index * 55)}
      style={[styles.shellWrap, animatedStyle, highlighted && styles.shellHighlighted]}
    >
      {/* Overlapping avatar — absolutely positioned above the card top-right */}
      <View style={styles.avatarAnchor}>
        <TouchableOpacity
          onPress={onViewProfile}
          activeOpacity={0.82}
          style={styles.avatarTouchable}
        >
          <View style={[styles.avatarRing, highlighted && styles.avatarRingHighlighted]}>
            {avatarPhotoUrl ? (
              <Image
                source={{ uri: avatarPhotoUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <AppText variant="h2" weight="800" style={styles.avatarInitial}>
                  {displayName.charAt(0)}
                </AppText>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Card body */}
      <View
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        style={[
          styles.card,
          highlighted && styles.cardHighlighted,
        ]}
      >
        {/* Header row: name + location on right, badge on left */}
        <View style={styles.cardHeader}>
          {/* Name + city — indented to leave room for avatar */}
          <TouchableOpacity
            onPress={onViewProfile}
            activeOpacity={0.78}
            style={styles.identityWrap}
          >
            <AppText variant="h2" weight="800" style={styles.cardName}>
              {displayName}
            </AppText>
            {parentCity ? (
              <View style={styles.cityRow}>
                <MaterialIcons name="location-on" size={14} color={BabyCityPalette.textSecondary} />
                <AppText variant="body" tone="muted" style={styles.cardCity}>
                  {parentCity}
                </AppText>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Status badge */}
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <AppText style={[styles.badgeText, { color: badgeText }]}>
              {badgeLabel}
            </AppText>
          </View>
        </View>

        {/* 2-column meta chip grid */}
        {metaItems.length > 0 ? (
          <View style={styles.metaGrid}>
            {metaItems.map(item => (
              <MetaChip key={`${item.label}:${item.value}`} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </View>
        ) : null}

        {/* Description note */}
        {post.note ? (
          <AppText
            variant="body"
            tone="muted"
            numberOfLines={2}
            style={styles.noteText}
          >
            {post.note}
          </AppText>
        ) : null}

        {/* Age range chips */}
        {post.childAgeRange.length > 0 ? (
          <View style={styles.tagsRow}>
            {post.childAgeRange.map(group => (
              <AppChip key={group} label={group} tone="accent" size="sm" />
            ))}
          </View>
        ) : null}

        {/* Full-width gradient action button */}
        <TouchableOpacity
          style={styles.ctaWrapper}
          onPress={onSendMessage}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#702ae1', '#6411d5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <AppText style={styles.ctaText}>
              {messageButtonLabel ?? strings.postSendMessage}
            </AppText>
          </LinearGradient>
        </TouchableOpacity>

      </View>
    </AnimatedView>
  );
}

function MetaChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaChip}>
      <View style={styles.metaChipIconWrap}>
        <MaterialIcons name={icon} size={18} color={BabyCityPalette.primary} />
      </View>
      <View style={styles.metaChipText}>
        <AppText style={styles.metaChipLabel}>{label}</AppText>
        <AppText variant="body" weight="600" style={styles.metaChipValue} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const CARD_BORDER_RADIUS = 24;
const AVATAR_SIZE = 64;
const AVATAR_BORDER = 4;

const styles = StyleSheet.create({
  shellWrap: {
    paddingTop: 10,
    marginBottom: 24,
    shadowColor: '#242f41',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 4,
  },
  shellHighlighted: {
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 7,
  },
  avatarAnchor: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  avatarTouchable: {},
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: AVATAR_BORDER,
    borderColor: BabyCityPalette.surface,
    overflow: 'hidden',
    backgroundColor: BabyCityPalette.secondaryContainer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarRingHighlighted: {
    borderColor: BabyCityPalette.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  avatarInitial: {
    color: BabyCityPalette.primary,
    fontSize: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: CARD_BORDER_RADIUS,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: BabyCityPalette.primary,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: AVATAR_SIZE + 18,
  },
  identityWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardName: {
    textAlign: 'right',
    lineHeight: 26,
    fontSize: 18,
  },
  cityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  cardCity: {
    fontSize: 13,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    width: '48%',
    minHeight: 54,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ecf1ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaChipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipText: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  metaChipLabel: {
    fontSize: 10,
    color: BabyCityPalette.textSecondary,
    lineHeight: 13,
    marginBottom: 2,
    textAlign: 'right',
  },
  metaChipValue: {
    fontSize: 13,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  noteText: {
    marginTop: 12,
    lineHeight: 22,
    textAlign: 'right',
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: 10,
  },
  ctaWrapper: {
    marginTop: 16,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: BabyCityPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#f8f0ff',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
});
