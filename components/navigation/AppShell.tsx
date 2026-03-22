import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { useAppState } from '@/context/AppContext';
import { BabyCityGeometry, BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getBabysitterPhotoUrl } from '@/lib/babysitterPhotos';
import { getParentPhotoUrl } from '@/lib/parentPhotos';
import AppText from '@/components/ui/AppText';
import TopBar from '@/components/navigation/TopBar';
import BottomNav, { BottomNavItem } from '@/components/navigation/BottomNav';

const DRAWER_WIDTH = Math.round(Dimensions.get('window').width * 0.5);

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

type DrawerNavItemProps = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  isActive?: boolean;
  badgeCount?: number;
  onPress: () => void;
};

function DrawerNavItem({ label, icon, isActive = false, badgeCount, onPress }: DrawerNavItemProps) {
  return (
    <TouchableOpacity
      style={[styles.drawerNavItem, isActive && styles.drawerNavItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.drawerNavItemInner}>
        <MaterialIcons
          name={icon}
          size={22}
          color={isActive ? BabyCityPalette.primary : BabyCityPalette.textPrimary}
        />
        <AppText
          variant="body"
          weight="700"
          style={[styles.drawerNavItemText, isActive && styles.drawerNavItemTextActive]}
        >
          {label}
        </AppText>
        {badgeCount != null && badgeCount > 0 ? (
          <View style={styles.drawerNavBadge}>
            <AppText variant="caption" weight="700" style={styles.drawerNavBadgeText}>
              {badgeCount}
            </AppText>
          </View>
        ) : null}
      </View>
      {isActive ? <View style={styles.drawerNavItemDot} /> : null}
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
          icon: 'home' as const,
          onPress: () => router.replace('/parent'),
        },
        {
          key: 'favorites',
          label: strings.navFavorites,
          icon: 'favorite' as const,
          onPress: () => router.replace('/parent-favorites'),
        },
        {
          key: 'chats',
          label: strings.navChats,
          icon: 'chat-bubble' as const,
          onPress: () => router.replace('/parent-requests'),
          badgeCount: chatsBadgeCount,
        },
        {
          key: 'profile',
          label: strings.navProfile,
          icon: 'person' as const,
          onPress: () => router.replace('/my-profile'),
        },
      ];
    }

    return [
      {
        key: 'home',
        label: strings.navHome,
        icon: 'home' as const,
        onPress: () => router.replace('/babysitter'),
      },
      {
        key: 'saved',
        label: strings.navSaved,
        icon: 'bookmark' as const,
        onPress: () => router.replace('/babysitter-saved'),
      },
      {
        key: 'chats',
        label: strings.navChats,
        icon: 'chat-bubble' as const,
        onPress: () => router.replace('/babysitter-inbox'),
        badgeCount: chatsBadgeCount,
      },
      {
        key: 'profile',
        label: strings.navProfile,
        icon: 'person' as const,
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
          {/* Drawer panel */}
          <View style={[styles.drawer, { paddingTop: insets.top + 20 }]}>

            {/* Brand block */}
            <View style={styles.drawerBrand}>
              <View style={styles.drawerBrandIcon}>
                <MaterialIcons name="child-care" size={22} color="#ffffff" />
              </View>
              <AppText variant="bodyLarge" weight="800" style={styles.drawerBrandName}>
                Smartaf
              </AppText>
            </View>

            {/* User block */}
            <View style={styles.drawerUserBlock}>
              <View style={styles.drawerAvatarWrap}>
                {drawerPhotoUrl ? (
                  <Image source={{ uri: drawerPhotoUrl }} style={styles.drawerAvatarImage} />
                ) : (
                  <View style={[styles.drawerAvatarFallback] as ViewStyle[]}>
                    <AppText variant="h2" weight="800" style={{ color: theme.activeColor }}>
                      {drawerInitials}
                    </AppText>
                  </View>
                )}
                {/* Verified badge */}
                <LinearGradient
                  colors={[BabyCityPalette.primary, '#6411d5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.drawerVerifiedBadge}
                >
                  <MaterialIcons name="verified" size={12} color="#ffffff" />
                </LinearGradient>
              </View>
              <AppText variant="bodyLarge" weight="700" style={styles.drawerUserName}>
                {drawerDisplayName}
              </AppText>
              <View style={styles.drawerRoleChip}>
                <AppText variant="caption" weight="700" style={styles.drawerRoleChipText}>
                  {drawerRoleLabel}
                </AppText>
              </View>
            </View>

            {/* Main nav section */}
            <View style={styles.drawerNavGroup}>
              <AppText variant="caption" weight="800" style={styles.drawerSectionHeader}>
                {strings.drawerMainMenu}
              </AppText>

              <DrawerNavItem
                label={strings.navHome}
                icon="home"
                isActive={activeTab === 'home'}
                onPress={() => closeMenuAndRun(() => router.replace(role === 'parent' ? '/parent' : '/babysitter'))}
              />

              {role === 'parent' ? (
                <DrawerNavItem
                  label={strings.navFavorites}
                  icon="favorite"
                  isActive={activeTab === 'favorites'}
                  onPress={() => closeMenuAndRun(() => router.replace('/parent-favorites'))}
                />
              ) : (
                <DrawerNavItem
                  label={strings.navSaved}
                  icon="bookmark"
                  isActive={activeTab === 'saved'}
                  onPress={() => closeMenuAndRun(() => router.replace('/babysitter-saved'))}
                />
              )}

              <DrawerNavItem
                label={strings.navChats}
                icon="chat-bubble"
                isActive={activeTab === 'chats'}
                badgeCount={chatsBadgeCount}
                onPress={() => closeMenuAndRun(() => router.replace(role === 'parent' ? '/parent-requests' : '/babysitter-inbox'))}
              />

              {role === 'babysitter' ? (
                <>
                  <DrawerNavItem
                    label={strings.drawerCalendar}
                    icon="calendar-today"
                    onPress={() => closeMenuAndRun(() => router.push('/babysitter-calendar'))}
                  />
                  <DrawerNavItem
                    label={strings.drawerStatistics}
                    icon="bar-chart"
                    onPress={() => closeMenuAndRun(() => router.push('/babysitter-stats'))}
                  />
                  <DrawerNavItem
                    label={strings.drawerShiftManager}
                    icon="payments"
                    onPress={() => closeMenuAndRun(() => router.push('/babysitter-shifts'))}
                  />
                  <DrawerNavItem
                    label={strings.drawerAvailability}
                    icon="event-available"
                    onPress={() => closeMenuAndRun(() => router.push('/babysitter-availability'))}
                  />
                </>
              ) : null}

              <DrawerNavItem
                label={strings.drawerEditProfile}
                icon="edit"
                onPress={handleEditProfile}
              />
            </View>

            {/* Settings section */}
            <View style={styles.drawerNavGroup}>
              <AppText variant="caption" weight="800" style={styles.drawerSectionHeader}>
                {strings.drawerSettingsSupport}
              </AppText>

              <DrawerNavItem
                label={strings.navSettings}
                icon="settings"
                isActive={activeTab === 'settings'}
                onPress={() => closeMenuAndRun(() => router.push('/settings'))}
              />
            </View>

            {/* Logout at bottom */}
            <View style={styles.drawerLogoutSection}>
              <TouchableOpacity style={styles.drawerLogoutRow} onPress={handleSignOut} activeOpacity={0.75}>
                <MaterialIcons name="logout" size={22} color={BabyCityPalette.error} />
                <AppText variant="body" weight="900" style={styles.drawerLogoutText}>
                  {strings.signOut}
                </AppText>
              </TouchableOpacity>
            </View>

          </View>

          {/* Overlay */}
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
    backgroundColor: 'rgba(15, 29, 61, 0.32)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: BabyCityPalette.canvas,
    borderTopLeftRadius: 48,
    borderBottomLeftRadius: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 44,
    shadowOffset: { width: -8, height: 0 },
    elevation: 12,
    overflow: 'hidden',
  },

  /* Brand */
  drawerBrand: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  drawerBrandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BabyCityPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  drawerBrandName: {
    color: BabyCityPalette.primary,
    fontSize: 22,
    letterSpacing: -0.3,
  },

  /* User block */
  drawerUserBlock: {
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BabyCityPalette.borderSoft,
  },
  drawerAvatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  drawerAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: BabyCityPalette.surfaceLowest,
    backgroundColor: BabyCityPalette.surface,
  },
  drawerAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: BabyCityPalette.surfaceLowest,
    backgroundColor: BabyCityPalette.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: BabyCityPalette.surfaceLowest,
  },
  drawerUserName: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    marginBottom: 6,
  },
  drawerRoleChip: {
    backgroundColor: BabyCityPalette.secondaryContainer,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  drawerRoleChipText: {
    color: BabyCityPalette.onSecondaryContainer,
    letterSpacing: 0.3,
  },

  /* Nav groups */
  drawerNavGroup: {
    marginBottom: 8,
  },
  drawerSectionHeader: {
    color: BabyCityPalette.outline,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 8,
    textAlign: 'right',
  },

  /* Nav item */
  drawerNavItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 2,
  },
  drawerNavItemActive: {
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  drawerNavItemInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  drawerNavItemText: {
    color: BabyCityPalette.textPrimary,
    fontSize: 15,
    textAlign: 'right',
  },
  drawerNavItemTextActive: {
    color: BabyCityPalette.primary,
  },
  drawerNavItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BabyCityPalette.primary,
  },
  drawerNavBadge: {
    backgroundColor: BabyCityPalette.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  drawerNavBadgeText: {
    color: '#ffffff',
    fontSize: 10,
  },

  /* Logout */
  drawerLogoutSection: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: `${BabyCityPalette.outline}1a`,
    paddingTop: 12,
  },
  drawerLogoutRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  drawerLogoutText: {
    color: BabyCityPalette.error,
    fontSize: 15,
    textAlign: 'right',
  },
});
