import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import AppChip from '@/components/ui/AppChip';
import AppText from '@/components/ui/AppText';
import StatusBadge from '@/components/ui/StatusBadge';
import { BabyCityGeometry, BabyCityPalette, ParentDesignTokens } from '@/constants/theme';
import { strings } from '@/locales';
import { ParentPost } from '@/types/post';

type Props = {
  post: ParentPost;
  mode?: 'management' | 'profile';
  onPress?: () => void;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
};

function formatPostDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  });
}

function formatPostTime(value: string | null) {
  if (!value) {
    return null;
  }

  const [hours = '', minutes = ''] = value.split(':');
  return hours && minutes ? `${hours}:${minutes}` : value;
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  });
}

function softWrapLongTokens(value: string) {
  return value.replace(/\S{18,}/g, token => token.replace(/(.{12})/g, '$1\u200B'));
}

export default function ParentOwnedPostCard({
  post,
  mode = 'profile',
  onPress,
  onEdit,
  onToggleActive,
  onDelete,
}: Props) {
  const createdAtLabel = formatCreatedAt(post.createdAt);
  const metaChips = [
    post.area
      ? {
          key: 'area',
          label: post.area,
          tone: 'muted' as const,
          icon: 'location-outline' as const,
        }
      : null,
    formatPostDate(post.date)
      ? {
          key: 'date',
          label: formatPostDate(post.date) as string,
          tone: 'muted' as const,
          icon: 'calendar-outline' as const,
        }
      : null,
    formatPostTime(post.time)
      ? {
          key: 'time',
          label: formatPostTime(post.time) as string,
          tone: 'muted' as const,
          icon: 'time-outline' as const,
        }
      : null,
    post.numChildren !== null
      ? {
          key: 'children',
          label: `${post.numChildren} ${strings.familyFeedChildrenSuffix}`,
          tone: 'primary' as const,
          icon: 'people-outline' as const,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    tone: 'muted' | 'primary';
    icon: keyof typeof Ionicons.glyphMap;
  }[];

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.94 : 1} onPress={onPress} disabled={!onPress}>
      <AppCard
        role="parent"
        variant="panel"
        backgroundColor={mode === 'management' ? ParentDesignTokens.surfaces.cardMuted : '#ffffff'}
        borderColor={mode === 'management' ? 'rgba(205,221,254,0.55)' : 'rgba(224,232,246,0.85)'}
        style={[styles.card, mode === 'management' && styles.managementCard]}
      >
        {mode === 'management' ? <View style={styles.managementAccentBar} /> : null}

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {createdAtLabel ? (
              <AppText variant="caption" tone="muted" style={styles.createdAt}>
                {createdAtLabel}
              </AppText>
            ) : null}
            <AppText numberOfLines={3} variant="h3" weight="800" style={styles.title}>
              {softWrapLongTokens(post.note || strings.familyFeedNoteEmpty)}
            </AppText>
          </View>

          <View style={styles.headerActions}>
            <StatusBadge
              label={post.isActive ? strings.myPostsActive : strings.myPostsInactive}
              status={post.isActive ? 'active' : 'draft'}
              style={styles.statusBadge}
            />
            {mode === 'management' && onDelete ? (
              <TouchableOpacity onPress={onDelete} style={styles.iconAction} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={18} color={BabyCityPalette.error} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {metaChips.length > 0 ? (
          <View style={styles.metaRow}>
            {metaChips.map(chip => (
              <AppChip
                key={chip.key}
                label={chip.label}
                tone={chip.tone}
                icon={chip.icon}
                size="sm"
              />
            ))}
          </View>
        ) : (
          <AppText variant="caption" tone="muted" style={styles.emptyMeta}>
            {strings.notFilled}
          </AppText>
        )}

        {post.childAgeRange.length > 0 ? (
          <View style={styles.ageRow}>
            {post.childAgeRange.map(group => (
              <AppChip key={group} label={group} tone="accent" size="sm" />
            ))}
          </View>
        ) : null}

        {mode === 'management' || onEdit ? (
          <View style={styles.footer}>
            {onEdit ? (
              <AppButton
                label={strings.myPostsEdit}
                variant="secondary"
                fullWidth={mode !== 'management'}
                onPress={onEdit}
                style={[styles.actionButton, mode !== 'management' && styles.singleActionButton]}
                labelStyle={styles.toggleButtonLabel}
              />
            ) : null}

            {mode === 'management' ? (
              <AppButton
                label={post.isActive ? strings.myPostsTogglePause : strings.myPostsToggleActivate}
                variant="secondary"
                fullWidth={false}
                onPress={onToggleActive}
                style={styles.actionButton}
                labelStyle={styles.toggleButtonLabel}
              />
            ) : null}
          </View>
        ) : null}
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
  },
  managementCard: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  managementAccentBar: {
    position: 'absolute',
    right: 0,
    top: 18,
    bottom: 18,
    width: 5,
    borderRadius: 999,
    backgroundColor: BabyCityPalette.primary,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  createdAt: {
    marginBottom: 6,
  },
  title: {
    width: '100%',
    lineHeight: 25,
    color: ParentDesignTokens.text.primary,
  },
  headerActions: {
    alignItems: 'flex-start',
    gap: 8,
  },
  statusBadge: {
    alignSelf: 'flex-end',
  },
  headerBadges: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: BabyCityGeometry.radius.control,
    backgroundColor: '#fff5f7',
    borderWidth: 1,
    borderColor: '#f3bfd0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  ageRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  emptyMeta: {
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(205,221,254,0.5)',
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: 'rgba(205,221,254,0.75)',
  },
  singleActionButton: {
    flex: 0,
  },
  toggleButtonLabel: {
    color: BabyCityPalette.textPrimary,
  },
});
