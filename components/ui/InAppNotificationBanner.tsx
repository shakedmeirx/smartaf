import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/ui/AppText';
import { useAppState } from '@/context/AppContext';
import { BabyCityGeometry, BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';

const BANNER_HEIGHT = 72;
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
  }, [inAppNotification]);

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
          top: insets.top + (Platform.OS === 'android' ? 8 : 4),
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={inAppNotification ? 'box-none' : 'none'}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.92}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubble-ellipses" size={22} color={BabyCityPalette.primary} />
        </View>
        <View style={styles.textWrap}>
          <AppText variant="body" weight="800" style={styles.sender} numberOfLines={1}>
            {senderName}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.preview} numberOfLines={1}>
            {inAppNotification?.previewText ?? ''}
          </AppText>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={e => {
            e.stopPropagation();
            clearInAppNotification();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={BabyCityPalette.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  banner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BabyCityPalette.surface,
    borderRadius: BabyCityGeometry.radius.hero,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BabyCityPalette.borderSoft,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: BabyCityGeometry.radius.control,
    backgroundColor: BabyCityPalette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sender: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  preview: {
    textAlign: 'right',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
});
