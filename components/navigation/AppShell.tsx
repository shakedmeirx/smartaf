import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppContext';
import { BabyCityGeometry, BabyCityPalette, ParentDesignTokens, getRoleTheme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getBabysitterPhotoUrl } from '@/lib/babysitterPhotos';
import { getParentPhotoUrl } from '@/lib/parentPhotos';
import AppText from '@/components/ui/AppText';
import TopBar from '@/components/navigation/TopBar';
import BottomNav, { BottomNavItem } from '@/components/navigation/BottomNav';

type AppTab = 'home' | 'chats' | 'favorites' | 'saved' | 'profile' | 'settings';

type AppShellProps = {
  title: string;
  activeTab: AppTab;
  children: ReactNode;
  backgroundColor?: string;
  subtitle?: string | null;
  titleContent?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  onShare?: () => void;
  enableRootTabSwipe?: boolean;
};

type DrawerActionRowProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
  danger?: boolean;
  showDivider?: boolean;
};

function DrawerActionRow({
  label,
  icon,
  iconColor,
  iconBackground,
  onPress,
  danger = false,
  showDivider = true,
}: DrawerActionRowProps) {
  return (
    <TouchableOpacity
      style={[styles.drawerRow, !showDivider && styles.drawerRowLast] as ViewStyle[]}
      onPress={onPress}
    >
      <AppText 
        variant="bodyLarge" 
        weight="600" 
        tone={danger ? 'error' : 'default'}
      >
        {label}
      </AppText>
      <View style={[styles.drawerRowIconWrap, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={danger ? BabyCityPalette.error : iconColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function AppShell({
  title,
  activeTab,
  children,
  backgroundColor,
  subtitle,
  titleContent,
  showBackButton = false,
  onBack,
  onShare,
  enableRootTabSwipe = false,
}: AppShellProps) {
  const { activeRole, dbUser, signOut } = useAuth();
  const { incomingRequests, unreadConversationIds } = useAppState();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerPhotoUrl, setDrawerPhotoUrl] = useState<string | null>(null);
  const role = activeRole ?? 'parent';
  const resolvedSubtitle =
    subtitle === undefined
      ? null
      : subtitle;
  const theme = getRoleTheme(role);
  const resolvedBackgroundColor = backgroundColor ?? theme.screenBackground;
  const pendingIncomingCount = incomingRequests.filter(request => request.status === 'pending').length;
  const chatsBadgeCount = pendingIncomingCount + unreadConversationIds.size;
  const drawerDisplayName = dbUser?.name?.trim() || strings.appName;
  const drawerRoleLabel = role === 'parent' ? strings.iAmParent : strings.iAmBabysitter;
  const drawerInitials =
    drawerDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase() || '?';

  useEffect(() => {
    const userId = dbUser?.id;

    if (!menuOpen || !userId) {
      return;
    }

    let cancelled = false;

    async function loadDrawerPhoto() {
      setDrawerPhotoUrl(null);

      const table = role === 'parent' ? 'parent_profiles' : 'babysitter_profiles';
      const { data, error } = await supabase
        .from(table)
        .select('profile_photo_path')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled || error) {
        return;
      }

      const photoPath = (data?.profile_photo_path as string | null) ?? null;
      if (!photoPath) {
        setDrawerPhotoUrl(null);
        return;
      }

      setDrawerPhotoUrl(
        role === 'parent' ? getParentPhotoUrl(photoPath) : getBabysitterPhotoUrl(photoPath)
      );
    }

    loadDrawerPhoto();

    return () => {
      cancelled = true;
    };
  }, [dbUser?.id, menuOpen, role]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
  }

  function closeMenuAndRun(action: () => void) {
    setMenuOpen(false);
    action();
  }

  function handleEditProfile() {
    closeMenuAndRun(() => {
      router.push(role === 'parent' ? '/parent-onboarding' : '/babysitter-onboarding');
    });
  }

  function navigateToRootTab(targetTab: AppTab) {
    if (targetTab === activeTab) return;

    if (targetTab === 'home') {
      router.replace(role === 'parent' ? '/parent' : '/babysitter');
      return;
    }

    if (targetTab === 'chats') {
      router.replace(role === 'parent' ? '/parent-requests' : '/babysitter-inbox');
      return;
    }

    if (targetTab === 'favorites') {
      router.replace('/parent-favorites');
      return;
    }

    if (targetTab === 'saved') {
      router.replace('/babysitter-saved');
      return;
    }

    if (targetTab === 'profile') {
      router.replace('/my-profile');
    }
  }

  const rootTabOrder: AppTab[] =
    role === 'parent'
      ? ['home', 'favorites', 'chats', 'profile']
      : ['home', 'saved', 'chats', 'profile'];
  const currentRootTabIndex = rootTabOrder.indexOf(activeTab);

  function navigateHorizontal(direction: 'forward' | 'backward') {
    if (!enableRootTabSwipe || currentRootTabIndex === -1) return;

    const nextIndex =
      direction === 'forward' ? currentRootTabIndex + 1 : currentRootTabIndex - 1;
    const nextTab = rootTabOrder[nextIndex];

    if (!nextTab) return;
    navigateToRootTab(nextTab);
  }

  const rightEdgeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enableRootTabSwipe,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          enableRootTabSwipe &&
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -46 && Math.abs(gestureState.dy) < 40) {
            navigateHorizontal('forward');
          }
        },
      }),
    [enableRootTabSwipe, currentRootTabIndex, role, activeTab]
  );

  const leftEdgeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enableRootTabSwipe,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          enableRootTabSwipe &&
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 46 && Math.abs(gestureState.dy) < 40) {
            navigateHorizontal('backward');
          }
        },
      }),
    [enableRootTabSwipe, currentRootTabIndex, role, activeTab]
  );

  const navItems = useMemo<BottomNavItem[]>(() => {
    if (role === 'parent') {
      return [
        {
          key: 'home',
          label: strings.navHome,
          icon: 'home-outline',
          onPress: () => router.replace('/parent'),
        },
        {
          key: 'favorites',
          label: strings.navFavorites,
          icon: 'heart-outline',
          activeIcon: 'heart',
          onPress: () => router.replace('/parent-favorites'),
        },
        {
          key: 'chats',
          label: strings.navChats,
          icon: 'chatbubbles-outline',
          onPress: () => router.replace('/parent-requests'),
          badgeCount: chatsBadgeCount,
        },
        {
          key: 'profile',
          label: strings.navProfile,
          icon: 'people-outline',
          onPress: () => router.replace('/my-profile'),
        },
      ];
    }

    return [
      {
        key: 'home',
        label: strings.navHome,
        icon: 'home-outline',
        onPress: () => router.replace('/babysitter'),
      },
      {
        key: 'saved',
        label: strings.navSaved,
        icon: 'bookmark-outline',
        activeIcon: 'bookmark',
        onPress: () => router.replace('/babysitter-saved'),
      },
      {
        key: 'chats',
        label: strings.navChats,
        icon: 'chatbubbles-outline',
        onPress: () => router.replace('/babysitter-inbox'),
        badgeCount: chatsBadgeCount,
      },
      {
        key: 'profile',
        label: strings.navProfile,
        icon: 'person-outline',
        onPress: () => router.replace('/my-profile'),
      },
    ];
  }, [pendingIncomingCount, role]);

  const normalizedActiveTab =
    activeTab === 'settings'
      ? 'profile'
      : activeTab;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBackground }]} edges={['top']}>
      <TopBar
        title={title}
        subtitle={resolvedSubtitle}
        titleContent={titleContent}
        titleColor={theme.title}
        subtitleColor={theme.subtitle}
        borderColor={theme.headerBorder}
        backgroundColor={theme.headerBackground}
        menuBackground={theme.menuBackground}
        showBackButton={showBackButton}
        onBack={onBack}
        onShare={onShare}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <View style={[styles.content, { backgroundColor: resolvedBackgroundColor }]}>
        {children}
        {enableRootTabSwipe && currentRootTabIndex < rootTabOrder.length - 1 ? (
          <View
            pointerEvents="box-only"
            style={[styles.edgeSwipeZone, styles.edgeSwipeZoneRight]}
            {...rightEdgeResponder.panHandlers}
          />
        ) : null}
        {enableRootTabSwipe && currentRootTabIndex > 0 ? (
          <View
            pointerEvents="box-only"
            style={[styles.edgeSwipeZone, styles.edgeSwipeZoneLeft]}
            {...leftEdgeResponder.panHandlers}
          />
        ) : null}
      </View>

      <BottomNav
        items={navItems}
        activeKey={normalizedActiveTab}
        activeColor={theme.activeColor}
        activeBackground={theme.activeBackground}
        inactiveColor={theme.inactiveColor}
        bottomInset={insets.bottom}
      />

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalRoot}>
          <View style={[styles.drawer, { paddingTop: insets.top + 18 }]}>
            <View
              style={[
                styles.drawerHero,
                { backgroundColor: theme.highlightedSurface },
              ]}
            >
              <View style={styles.drawerHeroContent}>
                {drawerPhotoUrl ? (
                  <Image source={{ uri: drawerPhotoUrl }} style={styles.drawerAvatarImage} />
                ) : (
                  <View
                    style={[
                      styles.drawerAvatarFallback,
                      { backgroundColor: BabyCityPalette.surface },
                    ] as ViewStyle[]}
                  >
                    <AppText variant="h2" weight="800" style={{ color: theme.activeColor }}>
                      {drawerInitials}
                    </AppText>
                  </View>
                )}
                <View style={styles.drawerHeroMeta}>
                  <AppText variant="h2">{drawerDisplayName}</AppText>
                  <AppText variant="caption" tone="muted">
                    {drawerRoleLabel}
                  </AppText>
                </View>
              </View>
            </View>

            {role === 'babysitter' ? (
              <View style={styles.drawerSection}>
                <DrawerActionRow
                  label={strings.drawerCalendar}
                  icon="calendar-number-outline"
                  iconColor={theme.inactiveColor}
                  iconBackground={theme.drawerFutureBackground}
                  onPress={() => closeMenuAndRun(() => router.push('/babysitter-calendar'))}
                />
                <DrawerActionRow
                  label={strings.drawerStatistics}
                  icon="stats-chart-outline"
                  iconColor={theme.inactiveColor}
                  iconBackground={theme.drawerFutureBackground}
                  onPress={() => closeMenuAndRun(() => router.push('/babysitter-stats'))}
                />
                <DrawerActionRow
                  label={strings.drawerShiftManager}
                  icon="cash-outline"
                  iconColor={theme.inactiveColor}
                  iconBackground={theme.drawerFutureBackground}
                  onPress={() => closeMenuAndRun(() => router.push('/babysitter-shifts'))}
                />
                <DrawerActionRow
                  label={strings.drawerAvailability}
                  icon="calendar-outline"
                  iconColor={theme.inactiveColor}
                  iconBackground={theme.drawerFutureBackground}
                  onPress={() => closeMenuAndRun(() => router.push('/babysitter-availability'))}
                />
                <DrawerActionRow
                  label={strings.drawerEditProfile}
                  icon="create-outline"
                  iconColor={theme.inactiveColor}
                  iconBackground={theme.drawerFutureBackground}
                  onPress={handleEditProfile}
                  showDivider={false}
                />
              </View>
            ) : null}

            {role === 'parent' ? (
              <View style={styles.drawerSection}>
                <DrawerActionRow
                  label={strings.drawerEditProfile}
                  icon="create-outline"
                  iconColor={theme.inactiveColor}
                  iconBackground={theme.drawerFutureBackground}
                  onPress={handleEditProfile}
                  showDivider={false}
                />
              </View>
            ) : null}

            <View style={styles.drawerSection}>
              <DrawerActionRow
                label={strings.navSettings}
                icon="settings-outline"
                iconColor={theme.inactiveColor}
                iconBackground={theme.drawerFutureBackground}
                onPress={() => closeMenuAndRun(() => router.push('/settings'))}
                showDivider={false}
              />
            </View>

            <View style={[styles.drawerSection, styles.drawerDangerSection]}>
              <DrawerActionRow
                label={strings.signOut}
                icon="log-out-outline"
                iconColor={BabyCityPalette.error}
                iconBackground={BabyCityPalette.errorSoft}
                onPress={handleSignOut}
                danger
                showDivider={false}
              />
            </View>

          </View>
          <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  edgeSwipeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 20,
  },
  edgeSwipeZoneRight: {
    right: 0,
  },
  edgeSwipeZoneLeft: {
    left: 0,
  },
  modalRoot: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 29, 61, 0.28)',
  },
  drawer: {
    width: 300,
    backgroundColor: BabyCityPalette.surface,
    paddingHorizontal: 20,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
  },
  drawerHero: {
    borderRadius: BabyCityGeometry.radius.hero,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },
  drawerHeroContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  drawerHeroMeta: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  drawerAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: ParentDesignTokens.radius.avatar,
    borderWidth: 2,
    borderColor: BabyCityPalette.primarySoft,
    backgroundColor: BabyCityPalette.surface,
  },
  drawerAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: ParentDesignTokens.radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerSection: {
    borderRadius: BabyCityGeometry.radius.card,
    backgroundColor: BabyCityPalette.surface,
    marginBottom: 14,
    overflow: 'hidden',
  },
  drawerDangerSection: {
    marginBottom: 18,
  },
  drawerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  drawerRowLast: {
    borderBottomWidth: 0,
  },
  drawerRowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
