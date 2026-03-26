import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';
import { BabyCityPalette, BabyCityShadows } from '@/constants/theme';
import AppText from '@/components/ui/AppText';
import SmartafWordmark from '@/components/ui/SmartafWordmark';

type RoleOption = {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: 'child-care' | 'work-outline';
  iconBackgroundColor: string;
  iconColor: string;
  accentBubbleColor?: string;
};

export default function RolePickerScreen() {
  const { dbUser, activeRole, setActiveRole } = useAuth();
  const { canGoBack } = useLocalSearchParams<{ canGoBack?: string }>();
  const showBack = canGoBack === 'true';

  const roleOptions = useMemo<RoleOption[]>(() => [
    {
      role: 'parent',
      title: strings.iAmParent,
      subtitle: strings.parentRoleSubtitle,
      icon: 'child-care',
      iconBackgroundColor: BabyCityPalette.secondaryContainer,
      iconColor: BabyCityPalette.primary,
      accentBubbleColor: BabyCityPalette.tertiaryContainer,
    },
    {
      role: 'babysitter',
      title: strings.iAmBabysitter,
      subtitle: strings.babysitterRoleSubtitle,
      icon: 'work-outline',
      iconBackgroundColor: BabyCityPalette.surfaceContainer,
      iconColor: '#60708a',
    },
  ], []);

  const availableRoles = useMemo(() => {
    if (!dbUser) return roleOptions;
    return roleOptions.filter(option => dbUser.roles.includes(option.role));
  }, [dbUser, roleOptions]);

  const [selectedRole, setSelectedRole] = useState<UserRole>('parent');
  const hasSelectedProfile = dbUser?.roles.includes(selectedRole) ?? false;
  const primaryActionLabel = hasSelectedProfile
    ? strings.authSetupResume
    : strings.authSetupContinue;

  useEffect(() => {
    if (!dbUser || availableRoles.length === 0) return;

    const preferredRole =
      activeRole && availableRoles.some(option => option.role === activeRole)
        ? activeRole
        : availableRoles[0].role;

    setSelectedRole(preferredRole);
  }, [activeRole, availableRoles, dbUser]);

  if (!dbUser) {
    router.replace('/');
    return null;
  }

  if (dbUser.roles.length <= 1) {
    router.replace('/');
    return null;
  }

  function handleContinue() {
    setActiveRole(selectedRole);
    router.replace(selectedRole === 'parent' ? '/parent' : '/babysitter');
  }

  function handleBack() {
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundLayer} pointerEvents="none">
        <View style={styles.backgroundBlobTop} />
        <View style={styles.backgroundBlobBottom} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          {showBack ? (
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={handleBack}
              activeOpacity={0.82}
            >
              <Ionicons name="chevron-forward" size={18} color={BabyCityPalette.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.topBarGhost} />
          )}

          <SmartafWordmark size="sm" textColor={BabyCityPalette.primary} />
        </View>

        <View style={styles.header}>
          <AppText variant="h1" weight="800" style={styles.title}>
            {strings.authSetupRoleTitle}
          </AppText>
          <AppText variant="bodyLarge" tone="muted" style={styles.subtitle}>
            {strings.authSetupRoleSubtitle}
          </AppText>
        </View>

        <View style={styles.roleList}>
          {availableRoles.map(option => (
            <RoleCard
              key={option.role}
              option={option}
              selected={selectedRole === option.role}
              onPress={() => setSelectedRole(option.role)}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleContinue}
          style={[styles.primaryButtonShadow, BabyCityShadows.soft]}
        >
          <LinearGradient
            colors={[BabyCityPalette.primary, '#6411d5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}
          >
            <Ionicons name="arrow-back" size={18} color="#ffffff" />
            <AppText variant="bodyLarge" weight="800" style={styles.primaryButtonText}>
              {primaryActionLabel}
            </AppText>
          </LinearGradient>
        </TouchableOpacity>

        <AppText variant="caption" tone="muted" align="center" style={styles.hint}>
          {strings.authSetupRoleHint}
        </AppText>

        <View style={styles.brandCard}>
          <LinearGradient
            colors={['rgba(205,221,254,0.55)', 'rgba(236,241,255,0.94)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.brandOrbLarge} />
          <View style={styles.brandOrbSmall} />

          <View style={styles.brandCardContent}>
            <AppText variant="h1" weight="800" align="center" style={styles.brandBackdropText}>
              {strings.appName}
            </AppText>
            <AppText variant="bodyLarge" tone="muted" align="center" style={styles.brandCardSubtitle}>
              {strings.authSetupEditorialQuote}
            </AppText>
            <View style={styles.brandDivider} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type RoleCardProps = {
  option: RoleOption;
  selected: boolean;
  onPress: () => void;
};

function RoleCard({ option, selected, onPress }: RoleCardProps) {
  const isParent = option.role === 'parent';

  return (
    <TouchableOpacity
      style={[styles.roleCard, selected && styles.roleCardSelected]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View
        style={[
          styles.roleCardGlow,
          isParent ? styles.roleCardGlowParent : styles.roleCardGlowSitter,
        ]}
      />

      <View style={styles.roleCardInner}>
        <View style={styles.roleSelectionIconWrap}>
          {selected ? (
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={BabyCityPalette.primary}
            />
          ) : null}
        </View>

        <View style={styles.roleContent}>
          <AppText variant="h2" weight="800" style={styles.roleTitle}>
            {option.title}
          </AppText>
          <AppText variant="body" tone="muted" style={styles.roleSubtitle}>
            {option.subtitle}
          </AppText>
        </View>

        <View
          style={[
            styles.roleIconWrap,
            { backgroundColor: option.iconBackgroundColor },
          ]}
        >
          <MaterialIcons
            name={option.icon}
            size={34}
            color={option.iconColor}
          />
          {option.accentBubbleColor ? (
            <View
              style={[
                styles.roleAccentBubble,
                { backgroundColor: option.accentBubbleColor },
              ]}
            />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundBlobTop: {
    position: 'absolute',
    top: 76,
    right: -54,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(233,222,245,0.48)',
  },
  backgroundBlobBottom: {
    position: 'absolute',
    left: -62,
    bottom: 104,
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: 'rgba(205,221,254,0.42)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingBottom: 18,
    marginBottom: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(205,221,254,0.95)',
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236, 241, 255, 0.85)',
  },
  topBarGhost: {
    width: 40,
    height: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 38,
  },
  title: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'center',
    fontSize: 31,
    lineHeight: 38,
    marginBottom: 12,
    maxWidth: 280,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 295,
  },
  roleList: {
    gap: 22,
  },
  roleCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 26,
    minHeight: 136,
    borderWidth: 1.25,
    borderColor: 'rgba(205,221,254,0.7)',
    ...BabyCityShadows.soft,
  },
  roleCardSelected: {
    borderColor: 'rgba(178,140,255,0.82)',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  roleCardGlow: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    opacity: 0.58,
  },
  roleCardGlowParent: {
    left: -46,
    bottom: -44,
    backgroundColor: 'rgba(233,222,245,0.7)',
  },
  roleCardGlowSitter: {
    left: -48,
    top: -44,
    backgroundColor: 'rgba(222,232,255,0.72)',
  },
  roleCardInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
  },
  roleSelectionIconWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  roleTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    marginBottom: 6,
    fontSize: 19,
    lineHeight: 24,
  },
  roleSubtitle: {
    textAlign: 'right',
    lineHeight: 23,
    maxWidth: 165,
  },
  roleIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  roleAccentBubble: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: BabyCityPalette.surfaceLowest,
  },
  primaryButtonShadow: {
    marginTop: 38,
    borderRadius: 999,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 999,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  hint: {
    marginTop: 14,
    lineHeight: 20,
    opacity: 0.86,
    maxWidth: 255,
    alignSelf: 'center',
  },
  brandCard: {
    height: 178,
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 48,
    backgroundColor: BabyCityPalette.surfaceLow,
    borderWidth: 1,
    borderColor: 'rgba(213, 227, 255, 0.55)',
  },
  brandOrbLarge: {
    position: 'absolute',
    left: -30,
    bottom: -44,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(112,42,225,0.08)',
  },
  brandOrbSmall: {
    position: 'absolute',
    right: 8,
    top: 6,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,142,172,0.08)',
  },
  brandCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandBackdropText: {
    color: 'rgba(112,42,225,0.14)',
    fontSize: 54,
    lineHeight: 60,
    letterSpacing: -1.2,
    marginBottom: 6,
  },
  brandCardSubtitle: {
    lineHeight: 24,
  },
  brandDivider: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(112,42,225,0.22)',
    marginTop: 16,
  },
});
