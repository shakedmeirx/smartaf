import { useState } from 'react';
import {
  Linking,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import AppShell from '@/components/navigation/AppShell';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';
import AppScreen from '@/components/ui/AppScreen';
import AppCard from '@/components/ui/AppCard';
import SettingsListCard, { SettingsListItem } from '@/components/parent/SettingsListCard';
import {
  BabysitterDesignTokens,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
  getRoleTheme,
} from '@/constants/theme';


export default function SettingsScreen() {
  const { dbUser, activeRole, addParentRole, setActiveRole, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);

  const isBabysitterMode = activeRole === 'babysitter';
  const hasBothRoles = !!dbUser && dbUser.roles.length > 1;
  const canAddParentRole = !!dbUser && !dbUser.roles.includes('parent');
  const canAddBabysitterRole = !!dbUser && !dbUser.roles.includes('babysitter');
  const isParentMode = activeRole === 'parent';
  const theme = getRoleTheme(isBabysitterMode ? 'babysitter' : 'parent');
  const design = isBabysitterMode ? BabysitterDesignTokens : ParentDesignTokens;

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
      handleAddParentRole();
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

  const generalItems: SettingsListItem[] = [
    {
      key: 'language',
      label: strings.language,
      value: language === 'he' ? 'עברית' : 'English',
      icon: 'language-outline',
      onPress: () => setLanguage(language === 'he' ? 'en' : 'he'),
    },
    {
      key: 'feedback',
      label: strings.sendFeedback,
      icon: 'mail-outline',
      onPress: () => {
        const subject = encodeURIComponent(strings.feedbackEmailSubject);
        Linking.openURL(`mailto:support@babysitconnect.app?subject=${subject}`);
      },
    },
    {
      key: 'about',
      label: strings.about,
      icon: 'information-circle-outline',
      onPress: () => router.push('/about'),
    },
    {
      key: 'edit-profile',
      label: strings.settingsEditProfile,
      icon: 'create-outline',
      onPress: handleEditProfile,
    },
  ];

  const roleItems: SettingsListItem[] = [];

  if (isParentMode) {
    roleItems.push(
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
      }
    );
  }

  if (isBabysitterMode) {
    roleItems.unshift(
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
      }
    );
  }

  roleItems.push({
    key: 'switch-role',
    label: hasBothRoles
      ? activeRole === 'parent'
        ? strings.settingsSwitchToBabysitter
        : strings.settingsSwitchToParent
      : strings.settingsSwitchRoleFallback,
    icon: 'swap-horizontal-outline',
    onPress: handleSwitchRole,
  });

  if (canAddParentRole) {
    roleItems.push({
      key: 'add-parent',
      label: isAddingRole ? strings.settingsAddingParentRole : strings.settingsAddParentRole,
      icon: isAddingRole ? 'time-outline' : 'person-add-outline',
      onPress: isAddingRole ? undefined : handleAddParentRole,
      showChevron: !isAddingRole,
    });
  }

  if (canAddBabysitterRole) {
    roleItems.push({
      key: 'add-babysitter',
      label: strings.settingsAddBabysitterRole,
      icon: 'briefcase-outline',
      onPress: handleAddBabysitterRole,
    });
  }

  return (
    <AppShell
      title={strings.settings}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        scrollProps={{ showsVerticalScrollIndicator: false }}
      >
      <AppCard
        role={isBabysitterMode ? 'babysitter' : 'parent'}
        variant="hero"
        backgroundColor={theme.highlightedSurface}
        borderColor="transparent"
        style={[styles.heroCard, { marginBottom: design.spacing.cardGap }]}
      >
        <View style={styles.heroContent}>
          <AppText variant="h1" style={[styles.heroTitle, { color: theme.title }]}>
            {strings.settings}
          </AppText>
          <AppText variant="body" tone="muted" style={[styles.heroSubtitle, { color: theme.subtitle }]}>
            {dbUser?.name || strings.appName}
          </AppText>
        </View>
      </AppCard>

      <SettingsListCard items={generalItems} role={isBabysitterMode ? 'babysitter' : 'parent'} />
      {roleItems.length > 0 ? (
        <SettingsListCard items={roleItems} role={isBabysitterMode ? 'babysitter' : 'parent'} />
      ) : null}
      {isAddingRole ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.inactiveColor} />
          <AppText variant="caption" tone="muted">
            {strings.settingsAddingParentRole}
          </AppText>
        </View>
      ) : null}

      <AppButton
        label={strings.settingsLogout}
        loading={isSigningOut}
        backgroundColor={BabyCityPalette.error}
        borderColor={BabyCityPalette.error}
        style={[styles.logoutButton, isSigningOut && styles.logoutButtonDisabled]}
        onPress={handleSignOut}
        disabled={isSigningOut}
      />
      <AppText variant="caption" tone="muted" align="center" style={styles.logoutHint}>
        {strings.settingsLogoutHint}
      </AppText>
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {},
  heroContent: {
    alignItems: 'flex-end',
  },
  heroTitle: {
    marginBottom: 10,
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 21,
  },
  loadingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BabyCityGeometry.spacing.sm,
    paddingVertical: BabyCityGeometry.spacing.sm,
  },
  logoutButton: {
    marginTop: BabyCityGeometry.spacing.xl,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutHint: {
    marginTop: 10,
    color: BabyCityPalette.textSecondary,
  },
});
