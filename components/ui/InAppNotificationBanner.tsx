import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/ui/AppText';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { useAppState } from '@/context/AppContext';
import { BabyCityGeometry, BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';

const BANNER_HEIGHT = 92;
const AUTO_DISMISS_MS = 4500;

export default function InAppNotificationBanner() {
  const { inAppNotification, clearInAppNotification, chatThreads } = useAppState();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-(BANNER_HEIGHT + 60))).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve counterpart name from chatThreads
  const thread = inAppNotification
    ? chatThreads.find(t => t.conversationId === inAppNotification.conversationId)
    : null;
  const senderName = thread?.counterpartName ?? strings.inAppNewMessage;
  const senderPhotoUrl = thread?.counterpartPhotoUrl;

  useEffect(() => {
    if (!inAppNotification) {
      // Slide out
      Animated.timing(translateY, {
        toValue: -(BANNER_HEIGHT + 60),
        duration: 280,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Slide in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();

    // Auto-dismiss
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      clearInAppNotification();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [inAppNotification, clearInAppNotification, translateY]);

  function handlePress() {
    if (!inAppNotification) return;
    clearInAppNotification();
    router.push(
      `/chat?requestId=${inAppNotification.requestId}&name=${encodeURIComponent(senderName)}`
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={inAppNotification ? 'box-none' : 'none'}
    >
      <View style={styles.glow} />
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.92}
      >
        <View style={styles.actionWrap}>
          <Ionicons name="chevron-back" size={18} color={BabyCityPalette.primary} />
        </View>

        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <View style={styles.nowChip}>
              <AppText variant="caption" weight="700" style={styles.nowChipText}>
                {strings.inAppNotificationNow}
              </AppText>
            </View>
            <AppText variant="bodyLarge" weight="800" style={styles.sender} numberOfLines={1}>
              {senderName}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={styles.preview} numberOfLines={1}>
            {inAppNotification?.previewText ?? ''}
          </AppText>
        </View>

        <View style={styles.avatarWrap}>
          <AvatarCircle
            name={senderName}
            photoUrl={senderPhotoUrl}
            size={56}
            tone="accent"
          />
          <View style={styles.avatarStatusBadge}>
            <View style={styles.avatarStatusDot} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    right: 18,
    zIndex: 9999,
  },
  glow: {
    position: 'absolute',
    top: 8,
    left: 18,
    right: 18,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${BabyCityPalette.primary}12`,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
  },
  banner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: `${BabyCityPalette.borderSoft}aa`,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  actionWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BabyCityPalette.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  nowChip: {
    backgroundColor: BabyCityPalette.surfaceContainer,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nowChipText: {
    color: BabyCityPalette.outline,
    fontSize: 10,
    lineHeight: 12,
  },
  sender: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },
  preview: {
    textAlign: 'right',
    marginTop: 4,
    maxWidth: '96%',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarStatusBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BabyCityPalette.primary,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
});
