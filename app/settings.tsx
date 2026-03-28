import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import AppShell from '@/components/navigation/AppShell';
import AppText from '@/components/ui/AppText';
import AppScreen from '@/components/ui/AppScreen';
import AvatarCircle from '@/components/ui/AvatarCircle';
import SmartafWordmark from '@/components/ui/SmartafWordmark';
import {
  BabyCityGeometry,
  BabyCityPalette,
  getRoleTheme,
} from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getBabysitterPhotoUrl } from '@/lib/babysitterPhotos';
import { getParentPhotoUrl } from '@/lib/parentPhotos';

type SettingsRowItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  value?: string;
  danger?: boolean;
  showChevron?: boolean;
};

type SettingsSection = {
  key: string;
  title: string;
  items: SettingsRowItem[];
};

export default function SettingsScreen() {
  const { dbUser, activeRole, addParentRole, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>();

  const isBabysitterMode = activeRole === 'babysitter';
  const hasBothRoles = !!dbUser && dbUser.roles.length > 1;
  const canAddParentRole = !!dbUser && !dbUser.roles.includes('parent');
  const canAddBabysitterRole = !!dbUser && !dbUser.roles.includes('babysitter');
  const theme = getRoleTheme(isBabysitterMode ? 'babysitter' : 'parent');
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const profileSubline = dbUser?.phone?.trim() || dbUser?.email?.trim() || strings.appName;
  const roleLabel = isBabysitterMode ? strings.continueAsBabysitter : strings.continueAsParent;

  useEffect(() => {
    const userId = dbUser?.id;

    if (!userId || !activeRole) {
      setProfilePhotoUrl(undefined);
      return;
    }

    let cancelled = false;

    async function loadProfilePhoto() {
      const table = activeRole === 'babysitter' ? 'babysitter_profiles' : 'parent_profiles';
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
        setProfilePhotoUrl(undefined);
        return;
      }

      setProfilePhotoUrl(
        activeRole === 'babysitter'
          ? getBabysitterPhotoUrl(photoPath)
          : getParentPhotoUrl(photoPath)
      );
    }

    void loadProfilePhoto();

    return () => {
      cancelled = true;
    };
  }, [activeRole, dbUser?.id]);

  async function handleAddParentRole() {
    if (isAddingRole) return;

    try {
      setIsAddingRole(true);
      const { createdProfile } = await addParentRole();
      router.replace(createdProfile ? '/parent-onboarding' : '/parent');
    } finally {
      setIsAddingRole(false);
    }
  }

  function handleAddBabysitterRole() {
    router.push('/babysitter-onboarding');
  }

  function handleEditProfile() {
    router.push(activeRole === 'babysitter' ? '/babysitter-onboarding' : '/parent-onboarding');
  }

  function handleSwitchRole() {
    if (hasBothRoles) {
      router.push('/role-picker?canGoBack=true');
      return;
    }

    if (canAddParentRole) {
      void handleAddParentRole();
      return;
    }

    if (canAddBabysitterRole) {
      handleAddBabysitterRole();
    }
  }

  async function handleSignOut() {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleOpenDeleteAccountRequest() {
    router.push('/account-deletion?origin=settings');
  }

  const accountItems: SettingsRowItem[] = [
    {
      key: 'edit-profile',
      label: strings.settingsEditProfile,
      icon: 'person-outline',
      onPress: handleEditProfile,
    },
    {
      key: 'language',
      label: strings.language,
      value: language === 'he' ? 'עברית' : 'English',
      icon: 'language-outline',
      onPress: () => setLanguage(language === 'he' ? 'en' : 'he'),
    },
    {
      key: 'switch-role',
      label: hasBothRoles
        ? activeRole === 'parent'
          ? strings.settingsSwitchToBabysitter
          : strings.settingsSwitchToParent
        : strings.settingsSwitchRoleFallback,
      icon: 'swap-horizontal-outline',
      onPress: handleSwitchRole,
    },
    {
      key: 'delete-account-request',
      label: strings.settingsDeleteAccountRequest,
      icon: 'trash-outline',
      onPress: () => void handleOpenDeleteAccountRequest(),
      danger: true,
    },
  ];

  if (canAddParentRole) {
    accountItems.push({
      key: 'add-parent',
      label: isAddingRole ? strings.settingsAddingParentRole : strings.settingsAddParentRole,
      icon: isAddingRole ? 'time-outline' : 'person-add-outline',
      onPress: isAddingRole ? undefined : () => void handleAddParentRole(),
      showChevron: !isAddingRole,
    });
  }

  if (canAddBabysitterRole) {
    accountItems.push({
      key: 'add-babysitter',
      label: strings.settingsAddBabysitterRole,
      icon: 'briefcase-outline',
      onPress: handleAddBabysitterRole,
    });
  }

  const activityItems: SettingsRowItem[] = isBabysitterMode
    ? [
        {
          key: 'availability',
          label: strings.drawerAvailability,
          icon: 'calendar-outline',
          onPress: () => router.push('/babysitter-availability'),
        },
        {
          key: 'shift-manager',
          label: strings.drawerShiftManager,
          icon: 'cash-outline',
          onPress: () => router.push('/babysitter-shifts'),
        },
        {
          key: 'stats',
          label: strings.drawerStatistics,
          icon: 'stats-chart-outline',
          onPress: () => router.push('/babysitter-stats'),
        },
        {
          key: 'calendar',
          label: strings.drawerCalendar,
          icon: 'calendar-number-outline',
          onPress: () => router.push('/babysitter-calendar'),
        },
      ]
    : [
        {
          key: 'booking-history',
          label: strings.bookingHistoryTitle,
          icon: 'receipt-outline',
          onPress: () => router.push('/booking-history'),
        },
        {
          key: 'my-posts',
          label: strings.myPosts,
          icon: 'document-text-outline',
          onPress: () => router.push('/my-posts'),
        },
        {
          key: 'my-ratings',
          label: strings.ratingsGivenTitle,
          icon: 'star-outline',
          onPress: () => router.push('/my-ratings'),
        },
      ];

  const appItems: SettingsRowItem[] = [
    {
      key: 'feedback',
      label: strings.sendFeedback,
      icon: 'mail-outline',
      onPress: () => router.push('/contact?origin=settings&action=support&topic=feedback'),
    },
    {
      key: 'about',
      label: strings.about,
      icon: 'information-circle-outline',
      onPress: () => router.push('/about'),
    },
    {
      key: 'privacy',
      label: strings.aboutPrivacy,
      icon: 'shield-checkmark-outline',
      onPress: () => router.push('/privacy?origin=settings'),
    },
    {
      key: 'terms',
      label: strings.aboutTerms,
      icon: 'document-text-outline',
      onPress: () => router.push('/terms?origin=settings'),
    },
    {
      key: 'contact',
      label: strings.aboutContact,
      icon: 'help-buoy-outline',
      onPress: () => router.push('/contact?origin=settings'),
    },
  ];

  const sections: SettingsSection[] = [
    {
      key: 'account',
      title: strings.settingsSectionAccount,
      items: accountItems,
    },
    {
      key: 'activity',
      title: strings.settingsSectionActivity,
      items: activityItems,
    },
    {
      key: 'app',
      title: strings.settingsSectionApp,
      items: appItems,
    },
  ].filter(section => section.items.length > 0);

  return (
    <AppShell
      title={strings.settings}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      backButtonVariant="icon"
      onBack={() => router.back()}
      hideHeaderMenuButton
      renderHeaderActions={() => (
        <SmartafWordmark size="sm" textColor={BabyCityPalette.primary} />
      )}
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        contentContainerStyle={styles.screenContent}
        scrollProps={{ showsVerticalScrollIndicator: false }}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <AvatarCircle
              name={dbUser?.name ?? strings.appName}
              photoUrl={profilePhotoUrl}
              size={116}
              tone="primary"
            />
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.84}
              onPress={handleEditProfile}
              style={styles.avatarEditBadge}
            >
              <MaterialIcons name="edit" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileTextWrap}>
            <AppText variant="h1" weight="800" align="center" style={styles.profileName}>
              {dbUser?.name || strings.appName}
            </AppText>
            <AppText variant="body" tone="muted" align="center">
              {profileSubline}
            </AppText>
            <View style={styles.rolePill}>
              <AppText variant="caption" weight="700" align="center" style={styles.rolePillText}>
                {roleLabel}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.sectionStack}>
          {sections.map(section => (
            <View key={section.key} style={styles.sectionBlock}>
              <AppText variant="caption" weight="700" style={styles.sectionLabel}>
                {section.title}
              </AppText>

              <View style={styles.sectionCard}>
                {section.items.map((item, index) => {
                  const row = (
                    <View
                      style={[
                        styles.sectionRow,
                        index !== section.items.length - 1 && styles.sectionRowBorder,
                      ]}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color={BabyCityPalette.outlineVariant}
                        style={item.showChevron === false ? styles.hiddenChevron : undefined}
                      />

                      <View style={styles.rowContent}>
                        <View style={styles.rowTextWrap}>
                          {item.value ? (
                            <AppText variant="caption" tone="muted">
                              {item.value}
                            </AppText>
                          ) : null}
                          <AppText variant="bodyLarge" weight="700">
                            {item.label}
                          </AppText>
                        </View>

                        <View style={[styles.rowIconWrap, item.danger && styles.rowIconWrapDanger]}>
                          <Ionicons
                            name={item.icon}
                            size={20}
                            color={item.danger ? BabyCityPalette.error : BabyCityPalette.primary}
                          />
                        </View>
                      </View>
                    </View>
                  );

                  if (!item.onPress) {
                    return <View key={item.key}>{row}</View>;
                  }

                  return (
                    <TouchableOpacity
                      key={item.key}
                      activeOpacity={0.86}
                      onPress={item.onPress}
                    >
                      {row}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {isAddingRole ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.inactiveColor} />
            <AppText variant="caption" tone="muted">
              {strings.settingsAddingParentRole}
            </AppText>
          </View>
        ) : null}

        <View style={styles.logoutSection}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.86}
            onPress={() => void handleSignOut()}
            disabled={isSigningOut}
            style={styles.logoutButton}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color={BabyCityPalette.error} />
            ) : (
              <MaterialIcons name="logout" size={18} color={BabyCityPalette.error} />
            )}
            <AppText variant="bodyLarge" weight="700" align="center" style={styles.logoutText}>
              {strings.settingsLogout}
            </AppText>
          </TouchableOpacity>

          <AppText variant="caption" tone="muted" align="center" style={styles.versionText}>
            {strings.aboutVersion} {version}
          </AppText>
        </View>
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 148,
  },
  profileSection: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 30,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BabyCityPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  profileTextWrap: {
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    lineHeight: 36,
  },
  rolePill: {
    marginTop: 4,
    backgroundColor: `${BabyCityPalette.primary}12`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rolePillText: {
    color: BabyCityPalette.primary,
  },
  sectionStack: {
    gap: 22,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionLabel: {
    color: BabyCityPalette.textTertiary,
    paddingHorizontal: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sectionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${BabyCityPalette.borderSoft}cc`,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  rowTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  rowIconWrapDanger: {
    backgroundColor: BabyCityPalette.errorSoft,
  },
  hiddenChevron: {
    opacity: 0,
  },
  loadingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BabyCityGeometry.spacing.sm,
    paddingVertical: BabyCityGeometry.spacing.md,
  },
  logoutSection: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 28,
  },
  logoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
  },
  logoutText: {
    color: BabyCityPalette.error,
  },
  versionText: {
    color: BabyCityPalette.outlineVariant,
  },
});
