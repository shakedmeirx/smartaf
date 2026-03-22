import { Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import SectionHeader from '@/components/ui/SectionHeader';
import SettingsListCard from '@/components/parent/SettingsListCard';
import {
  BabysitterDesignTokens,
  ParentDesignTokens,
  getRoleTheme,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { strings } from '@/locales';

export default function AboutScreen() {
  const { activeRole } = useAuth();
  const isBabysitterMode = activeRole === 'babysitter';
  const theme = getRoleTheme(isBabysitterMode ? 'babysitter' : 'parent');
  const design = isBabysitterMode ? BabysitterDesignTokens : ParentDesignTokens;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <AppShell
      title={strings.about}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      <AppScreen scrollable backgroundColor={theme.screenBackground}>
        <AppCard
          role={isBabysitterMode ? 'babysitter' : 'parent'}
          variant="hero"
          backgroundColor={theme.highlightedSurface}
          borderColor="transparent"
          style={[styles.heroCard, { marginBottom: design.spacing.cardGap }]}
        >
          <AppText variant="h1" weight="800" align="center" style={{ color: theme.title, marginBottom: 6 }}>
            {strings.appName}
          </AppText>
          <AppText variant="body" tone="muted" align="center" style={{ color: theme.subtitle }}>
            {strings.aboutVersion} {version}
          </AppText>
        </AppCard>

        <AppCard role={isBabysitterMode ? 'babysitter' : 'parent'} style={[styles.descCard, { marginBottom: design.spacing.cardGap }]}>
          <AppText variant="bodyLarge" style={[styles.descText, { color: theme.title }]}>
            {strings.aboutDescription}
          </AppText>
        </AppCard>

        <SettingsListCard
          role={isBabysitterMode ? 'babysitter' : 'parent'}
          items={[
            {
              key: 'contact',
              label: strings.aboutContact,
              value: strings.aboutContactEmail,
              icon: 'mail-outline',
              onPress: () => Linking.openURL(`mailto:${strings.aboutContactEmail}`),
            },
            {
              key: 'privacy',
              label: strings.aboutPrivacy,
              icon: 'shield-checkmark-outline',
              onPress: () => Linking.openURL('https://babysitconnect.app/privacy'),
            },
            {
              key: 'terms',
              label: strings.aboutTerms,
              icon: 'document-text-outline',
              onPress: () => Linking.openURL('https://babysitconnect.app/terms'),
            },
          ]}
        />
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
  },
  descCard: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
  },
  descText: {
    textAlign: 'right',
    lineHeight: 28,
  },
});
