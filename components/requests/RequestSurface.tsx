import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import { strings } from '@/locales';
import { BabyCityPalette, getRoleTheme, AppRole } from '@/constants/theme';
import { formatBadgeCount } from '@/components/requests/requestUi';

export { default as RequestCard } from '@/components/requests/RequestCard';
export { default as ChatThreadCard } from '@/components/requests/ChatPreviewCard';

export type RequestInboxTab = 'chats' | 'incoming';

type SegmentTabsProps = {
  role: AppRole;
  segment: RequestInboxTab;
  onChange: (value: RequestInboxTab) => void;
  chatsCount: number;
  incomingCount: number;
};

export function SegmentTabs({
  role,
  segment,
  onChange,
  chatsCount,
  incomingCount,
}: SegmentTabsProps) {
  const theme = getRoleTheme(role);
  const chatsBadge = formatBadgeCount(chatsCount);
  const incomingBadge = formatBadgeCount(incomingCount);

  return (
    <View
      style={[
        styles.segmentWrap,
        {
          backgroundColor: theme.highlightedSurface,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.segmentButton,
          segment === 'chats' && styles.segmentButtonActive,
          segment === 'chats' && { backgroundColor: BabyCityPalette.surface },
        ]}
        onPress={() => onChange('chats')}
      >
        <AppText
          variant="body"
          weight="800"
          style={[
            styles.segmentText,
            { color: BabyCityPalette.textSecondary },
            segment === 'chats' && { color: theme.title },
          ]}
        >
          {strings.requestsChatsSection}
        </AppText>
        {chatsBadge ? (
          <View style={styles.segmentBadge}>
            <AppText variant="caption" weight="800" style={styles.segmentBadgeText}>{chatsBadge}</AppText>
          </View>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.segmentButton,
          segment === 'incoming' && styles.segmentButtonActive,
          segment === 'incoming' && { backgroundColor: BabyCityPalette.surface },
        ]}
        onPress={() => onChange('incoming')}
      >
        <AppText
          variant="body"
          weight="800"
          style={[
            styles.segmentText,
            { color: BabyCityPalette.textSecondary },
            segment === 'incoming' && { color: theme.title },
          ]}
        >
          {strings.requestsIncomingSection}
        </AppText>
        {incomingBadge ? (
          <View style={styles.segmentBadge}>
            <AppText variant="caption" weight="800" style={styles.segmentBadgeText}>{incomingBadge}</AppText>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: 'row-reverse',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 16,
  },
  segmentButtonActive: {
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  segmentText: {
    // defaults from variant
  },
  segmentBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primary,
  },
  segmentBadgeText: {
    color: BabyCityPalette.surface,
    lineHeight: 13,
  },
});
