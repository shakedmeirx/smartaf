import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';
import { BabyCityGeometry, BabyCityPalette, BabyCityShadows } from '@/constants/theme';
import AppText from '@/components/ui/AppText';

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
          role="parent"
          title={strings.continueAsParent}
          subtitle={strings.parentRoleSubtitle}
          onPress={() => handleSelect('parent')}
        />

        <RoleCard
          role="babysitter"
          title={strings.continueAsBabysitter}
          subtitle={strings.babysitterRoleSubtitle}
          onPress={() => handleSelect('babysitter')}
        />
      </View>
    </SafeAreaView>
  );
}

type RoleCardProps = {
  role: 'parent' | 'babysitter';
  title: string;
  subtitle: string;
  onPress: () => void;
};

function RoleCard({ role, title, subtitle, onPress }: RoleCardProps) {
  const isParent = role === 'parent';
  return (
    <TouchableOpacity style={styles.roleCard} onPress={onPress} activeOpacity={0.78}>
      {/* Icon circle */}
      <View style={[styles.roleIconWrap, isParent ? styles.roleIconWrapParent : styles.roleIconWrapSitter]}>
        <MaterialIcons
          name={isParent ? 'child-care' : 'work'}
          size={32}
          color={isParent ? BabyCityPalette.primary : BabyCityPalette.textSecondary}
        />
        {/* Decorative badge dot (parent only) */}
        {isParent ? <View style={styles.roleIconDot} /> : null}
      </View>
      <View style={styles.roleTextWrap}>
        <AppText variant="bodyLarge" weight="800" style={styles.roleCardTitle}>
          {title}
        </AppText>
        <AppText variant="body" tone="muted" style={styles.roleCardSubtitle}>
          {subtitle}
        </AppText>
      </View>
      <MaterialIcons name="arrow-back-ios" size={18} color={BabyCityPalette.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
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
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: BabyCityGeometry.radius.card,
    paddingHorizontal: 20,
    paddingVertical: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    ...BabyCityShadows.soft,
  },
  roleIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roleIconWrapParent: {
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  roleIconWrapSitter: {
    backgroundColor: BabyCityPalette.surfaceContainer,
  },
  roleIconDot: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BabyCityPalette.tertiaryContainer,
    borderWidth: 3,
    borderColor: BabyCityPalette.surfaceLowest,
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
