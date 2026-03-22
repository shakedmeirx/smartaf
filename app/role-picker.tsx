import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';
import { BabyCityGeometry, BabyCityPalette, BabyCityShadows } from '@/constants/theme';
import AppText from '@/components/ui/AppText';

// Auth-screen local palette — shared visual language across the auth flow
const AUTH = {
  bg: '#ecf1ff',
  parentIconBg: BabyCityPalette.primarySoft,
  parentIconColor: BabyCityPalette.primary,
  sitterIconBg: BabyCityPalette.secondaryContainer,
  sitterIconColor: BabyCityPalette.onSecondaryContainer,
} as const;

export default function RolePickerScreen() {
  const { dbUser, setActiveRole } = useAuth();
  const { canGoBack } = useLocalSearchParams<{ canGoBack?: string }>();
  const showBack = canGoBack === 'true';

  if (!dbUser) {
    router.replace('/');
    return null;
  }

  if (dbUser.roles.length <= 1) {
    router.replace('/');
    return null;
  }

  function handleSelect(role: UserRole) {
    setActiveRole(role);
    router.replace(role === 'parent' ? '/parent' : '/babysitter');
  }

  function handleBack() {
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {showBack ? (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.75}>
            <Ionicons name="chevron-forward" size={18} color={BabyCityPalette.primary} />
            <AppText variant="caption" weight="700" style={styles.backLabel}>
              {strings.back}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Hero — floating text on background, no card box, RTL-natural right-aligned */}
        <View style={styles.hero}>
          <AppText variant="h1" weight="800" style={styles.title}>
            {strings.rolePickerTitle}
          </AppText>
          <AppText variant="body" tone="muted" style={styles.subtitle}>
            {strings.rolePickerSubtitle}
          </AppText>
        </View>

        <RoleCard
          icon="people-outline"
          iconBg={AUTH.parentIconBg}
          iconColor={AUTH.parentIconColor}
          title={strings.continueAsParent}
          subtitle={strings.parentRoleSubtitle}
          onPress={() => handleSelect('parent')}
        />

        <RoleCard
          icon="briefcase-outline"
          iconBg={AUTH.sitterIconBg}
          iconColor={AUTH.sitterIconColor}
          title={strings.continueAsBabysitter}
          subtitle={strings.babysitterRoleSubtitle}
          onPress={() => handleSelect('babysitter')}
        />
      </View>
    </SafeAreaView>
  );
}

type RoleCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function RoleCard({ icon, iconBg, iconColor, title, subtitle, onPress }: RoleCardProps) {
  return (
    <TouchableOpacity style={styles.roleCard} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.roleIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>
      <View style={styles.roleTextWrap}>
        <AppText variant="bodyLarge" weight="800" style={styles.roleCardTitle}>
          {title}
        </AppText>
        <AppText variant="body" tone="muted" style={styles.roleCardSubtitle}>
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-back" size={20} color={BabyCityPalette.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AUTH.bg,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: BabyCityPalette.primarySoft,
  },
  backLabel: {
    color: BabyCityPalette.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 4,
    gap: 8,
  },
  title: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    textAlign: 'right',
    lineHeight: 22,
  },
  // ── Role cards ───────────────────────────────────────────────────────────────
  roleCard: {
    backgroundColor: BabyCityPalette.surface,
    borderRadius: BabyCityGeometry.radius.card,
    paddingHorizontal: 20,
    paddingVertical: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    ...BabyCityShadows.soft,
  },
  roleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BabyCityGeometry.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  roleCardTitle: {
    marginBottom: 4,
    textAlign: 'right',
  },
  roleCardSubtitle: {
    textAlign: 'right',
  },
});
