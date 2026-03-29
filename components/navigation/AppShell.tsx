import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
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
import SmartafWordmark from '@/components/ui/SmartafWordmark';
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
  renderTitleContent?: (controls: {
    openMenu: () => void;
    drawerPhotoUrl: string | null;
    drawerInitials: string;
  }) => ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  onShare?: () => void;
  enableRootTabSwipe?: boolean;
  renderHeaderActions?: (controls: {
    openMenu: () => void;
    drawerPhotoUrl: string | null;
    drawerInitials: string;
  }) => ReactNode;
  hideHeaderMenuButton?: boolean;
  backButtonVariant?: 'pill' | 'icon';
  swapHeaderEdgeControls?: boolean;
  floatingActionButton?: ReactNode;
  bottomOverlay?: ReactNode;
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
  renderTitleContent,
  showBackButton = false,
  onBack,
  onShare,
  enableRootTabSwipe = false,
  renderHeaderActions,
  hideHeaderMenuButton = false,
  backButtonVariant = 'pill',
  swapHeaderEdgeControls = false,
  floatingActionButton,
  bottomOverlay,
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

    if (!userId) {
      setDrawerPhotoUrl(null);
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

      const photoUrl =
        role === 'parent'
          ? await getParentPhotoUrl(photoPath)
          : await getBabysitterPhotoUrl(photoPath);

      if (!cancelled) {
        setDrawerPhotoUrl(photoUrl || null);
      }
    }

    void loadDrawerPhoto();

    return () => {
      cancelled = true;
    };
  }, [dbUser?.id, role]);

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

  const navigateToRootTab = useCallback((targetTab: AppTab) => {
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
  }, [activeTab, role]);

  const rootTabOrder: AppTab[] =
    role === 'parent'
      ? ['home', 'favorites', 'chats', 'profile']
      : ['home', 'saved', 'chats', 'profile'];
  const currentRootTabIndex = rootTabOrder.indexOf(activeTab);

  const navigateHorizontal = useCallback((direction: 'forward' | 'backward') => {
    if (!enableRootTabSwipe || currentRootTabIndex === -1) return;

    const nextIndex =
      direction === 'forward' ? currentRootTabIndex + 1 : currentRootTabIndex - 1;
    const nextTab = rootTabOrder[nextIndex];

    if (!nextTab) return;
    navigateToRootTab(nextTab);
  }, [enableRootTabSwipe, currentRootTabIndex, rootTabOrder, navigateToRootTab]);

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
    [enableRootTabSwipe, navigateHorizontal]
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
    [enableRootTabSwipe, navigateHorizontal]
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
  }, [chatsBadgeCount, role]);

  const normalizedActiveTab =
    activeTab === 'settings'
      ? 'profile'
      : activeTab;
  const primaryDrawerItems =
    role === 'parent'
      ? [
          {
            key: 'home',
            label: strings.navHome,
            icon: 'home' as const,
            isActive: activeTab === 'home',
            onPress: () => closeMenuAndRun(() => router.replace('/parent')),
          },
          {
            key: 'chats',
            label: strings.navChats,
            icon: 'chat-bubble' as const,
            isActive: activeTab === 'chats',
            badgeCount: chatsBadgeCount,
            onPress: () => closeMenuAndRun(() => router.replace('/parent-requests')),
          },
          {
            key: 'favorites',
            label: strings.navFavorites,
            icon: 'favorite' as const,
            isActive: activeTab === 'favorites',
            onPress: () => closeMenuAndRun(() => router.replace('/parent-favorites')),
          },
        ]
      : [
          {
            key: 'home',
            label: strings.navHome,
            icon: 'home' as const,
            isActive: activeTab === 'home',
            onPress: () => closeMenuAndRun(() => router.replace('/babysitter')),
          },
          {
            key: 'chats',
            label: strings.navChats,
            icon: 'chat-bubble' as const,
            isActive: activeTab === 'chats',
            badgeCount: chatsBadgeCount,
            onPress: () => closeMenuAndRun(() => router.replace('/babysitter-inbox')),
          },
          {
            key: 'saved',
            label: strings.navSaved,
            icon: 'bookmark' as const,
            isActive: activeTab === 'saved',
            onPress: () => closeMenuAndRun(() => router.replace('/babysitter-saved')),
          },
        ];
  const babysitterToolItems =
    role === 'babysitter'
      ? [
          {
            key: 'calendar',
            label: strings.drawerCalendar,
            icon: 'calendar-today' as const,
            onPress: () => closeMenuAndRun(() => router.push('/babysitter-calendar')),
          },
          {
            key: 'stats',
            label: strings.drawerStatistics,
            icon: 'bar-chart' as const,
            onPress: () => closeMenuAndRun(() => router.push('/babysitter-stats')),
          },
          {
            key: 'shifts',
            label: strings.drawerShiftManager,
            icon: 'payments' as const,
            onPress: () => closeMenuAndRun(() => router.push('/babysitter-shifts')),
          },
          {
            key: 'availability',
            label: strings.drawerAvailability,
            icon: 'event-available' as const,
            onPress: () => closeMenuAndRun(() => router.push('/babysitter-availability')),
          },
        ]
      : [];
  const shellControls = {
    openMenu: () => setMenuOpen(true),
    drawerPhotoUrl,
    drawerInitials,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBackground }]} edges={['top']}>
      <TopBar
        title={title}
        subtitle={resolvedSubtitle}
        titleContent={renderTitleContent ? renderTitleContent(shellControls) : titleContent}
        customActions={
          renderHeaderActions
            ? renderHeaderActions(shellControls)
            : undefined
        }
        titleColor={theme.title}
        subtitleColor={theme.subtitle}
        borderColor={theme.headerBorder}
        backgroundColor={theme.headerBackground}
        menuBackground={theme.menuBackground}
        showBackButton={showBackButton}
        hideMenuButton={hideHeaderMenuButton}
        backButtonVariant={backButtonVariant}
        swapEdgeControls={swapHeaderEdgeControls}
        onBack={onBack}
        onShare={onShare}
        onOpenMenu={shellControls.openMenu}
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

      {floatingActionButton ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingActionWrap,
            { bottom: Math.max(insets.bottom, 16) + 72 },
          ]}
        >
          {floatingActionButton}
        </View>
      ) : null}

      {bottomOverlay ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.bottomOverlayWrap,
            { bottom: Math.max(insets.bottom, 16) + 60 },
          ]}
        >
          {bottomOverlay}
        </View>
      ) : null}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalRoot}>
          {/* Drawer panel */}
          <View style={styles.drawer}>
            <ScrollView
              style={styles.drawerScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.drawerScrollContent,
                {
                  paddingTop: insets.top + 20,
                  paddingBottom: Math.max(insets.bottom, 18) + 26,
                },
              ]}
            >
              <View style={styles.drawerScrollInner}>
                <View>
                  {/* Brand block */}
                  <View style={styles.drawerBrand}>
                    <SmartafWordmark size="md" textColor={BabyCityPalette.primary} />
                  </View>

                  {/* User block */}
                  <View style={styles.drawerUserBlock}>
                    <View style={styles.drawerAvatarWrap}>
                      {drawerPhotoUrl ? (
                        <Image source={{ uri: drawerPhotoUrl }} style={styles.drawerAvatarImage} />
                      ) : (
                        <View style={styles.drawerAvatarFallback}>
                          <AppText variant="h2" weight="800" style={{ color: theme.activeColor }}>
                            {drawerInitials}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="h2" weight="800" style={styles.drawerUserName}>
                      {drawerDisplayName}
                    </AppText>
                    <View style={styles.drawerMetaRow}>
                      <AppText variant="caption" weight="800" style={styles.drawerMetaLabel}>
                        {strings.appName.toUpperCase()}
                      </AppText>
                      <View style={styles.drawerRoleChip}>
                        <AppText variant="caption" weight="700" style={styles.drawerRoleChipText}>
                          {drawerRoleLabel}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Main nav section */}
                  <View style={styles.drawerNavGroup}>
                    <AppText variant="caption" weight="800" style={styles.drawerSectionHeader}>
                      {strings.drawerMainMenu}
                    </AppText>

                    {primaryDrawerItems.map(item => (
                      <DrawerNavItem
                        key={item.key}
                        label={item.label}
                        icon={item.icon}
                        isActive={item.isActive}
                        badgeCount={item.badgeCount}
                        onPress={item.onPress}
                      />
                    ))}
                  </View>

                  {babysitterToolItems.length > 0 ? (
                    <View style={styles.drawerNavGroup}>
                      <AppText variant="caption" weight="800" style={styles.drawerSectionHeader}>
                        {strings.drawerWorkTools}
                      </AppText>

                      {babysitterToolItems.map(item => (
                        <DrawerNavItem
                          key={item.key}
                          label={item.label}
                          icon={item.icon}
                          onPress={item.onPress}
                        />
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.drawerNavGroup}>
                    <AppText variant="caption" weight="800" style={styles.drawerSectionHeader}>
                      {strings.drawerSettingsSupport}
                    </AppText>

                    <DrawerNavItem
                      label={strings.drawerEditProfile}
                      icon="edit"
                      onPress={handleEditProfile}
                    />
                  </View>

                  {/* Settings section */}
                  <View style={styles.drawerNavGroup}>
                    <DrawerNavItem
                      label={strings.navSettings}
                      icon="settings"
                      isActive={activeTab === 'settings'}
                      onPress={() => closeMenuAndRun(() => router.push('/settings'))}
                    />
                  </View>
                </View>

                <View style={styles.drawerLogoutSection}>
                  <TouchableOpacity style={styles.drawerLogoutRow} onPress={handleSignOut} activeOpacity={0.75}>
                    <MaterialIcons name="logout" size={22} color={BabyCityPalette.error} />
                    <AppText variant="body" weight="900" style={styles.drawerLogoutText}>
                      {strings.signOut}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
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
  floatingActionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  bottomOverlayWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 29,
    paddingHorizontal: 24,
  },
  modalRoot: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(244, 246, 255, 0.64)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: BabyCityPalette.canvas,
    borderTopLeftRadius: 48,
    borderBottomLeftRadius: 48,
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 44,
    shadowOffset: { width: -8, height: 0 },
    elevation: 12,
    overflow: 'hidden',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
  },
  drawerScrollInner: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },

  /* Brand */
  drawerBrand: {
    marginBottom: 22,
  },

  /* User block */
  drawerUserBlock: {
    alignItems: 'center',
    marginBottom: 26,
    paddingBottom: 12,
  },
  drawerAvatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  drawerAvatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: BabyCityPalette.surfaceLowest,
    backgroundColor: BabyCityPalette.surface,
  },
  drawerAvatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: BabyCityPalette.surfaceLowest,
    backgroundColor: BabyCityPalette.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: BabyCityPalette.surfaceLowest,
  },
  drawerUserName: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  drawerMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  drawerMetaLabel: {
    color: BabyCityPalette.outline,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  drawerRoleChip: {
    backgroundColor: BabyCityPalette.secondaryContainer,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  drawerRoleChipText: {
    color: BabyCityPalette.onSecondaryContainer,
    letterSpacing: 0.2,
  },

  /* Nav groups */
  drawerNavGroup: {
    marginBottom: 12,
  },
  drawerSectionHeader: {
    color: BabyCityPalette.outline,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    paddingHorizontal: 10,
    marginBottom: 8,
    marginTop: 10,
    textAlign: 'right',
  },

  /* Nav item */
  drawerNavItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 20,
    marginBottom: 6,
  },
  drawerNavItemActive: {
    backgroundColor: BabyCityPalette.secondaryContainer,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  drawerNavItemInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  drawerNavItemText: {
    color: BabyCityPalette.textPrimary,
    fontSize: 16,
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
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: `${BabyCityPalette.outline}1a`,
    paddingTop: 14,
  },
  drawerLogoutRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 20,
  },
  drawerLogoutText: {
    color: BabyCityPalette.error,
    fontSize: 15,
    textAlign: 'right',
  },
});
