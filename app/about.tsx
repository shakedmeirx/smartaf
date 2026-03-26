import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import { BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { strings } from '@/locales';

const ABOUT_DECORATIVE_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAtTkCywLobSy5g_UR8vrI2ecAB-C0LBr5lBiQ7KbCPF4DlpXKjnigvm5LlWT65PDUESymp_9uFF4P4Bqh2qpGRPzokXHLo65hRdG8oT9Cly3dyClwbRPWOfBgm5lLwAXol9vuJwzar6qwCe1NRtJ2vVnJY0Y-SXIaP0p6S1BQlIRxgCdSSzok5hIlsOU_GOD4WqqwPNwhMaa9KMYvc0ylnBdOLJBzfU8BO5z1GXJwYpFPSvqQFZazy1NHunRnIbQpQWDMppB6zYfaq';

type AboutLinkItem = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
};

type AboutFeatureItem = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

export default function AboutScreen() {
  const { activeRole } = useAuth();
  const role = activeRole === 'babysitter' ? 'babysitter' : 'parent';
  const theme = getRoleTheme(role);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const features: AboutFeatureItem[] = [
    {
      key: 'verified',
      label: strings.aboutFeatureVerifiedProfiles,
      icon: 'verified-user',
    },
    {
      key: 'booking',
      label: strings.aboutFeatureFastBooking,
      icon: 'calendar-month',
    },
    {
      key: 'payments',
      label: strings.aboutFeatureSecurePayment,
      icon: 'payments',
    },
  ];

  const links: AboutLinkItem[] = [
    {
      key: 'privacy',
      label: strings.aboutPrivacy,
      icon: 'policy',
      onPress: () => router.push('/legal-privacy?origin=about'),
    },
    {
      key: 'terms',
      label: strings.aboutTerms,
      icon: 'description',
      onPress: () => router.push('/legal-terms?origin=about'),
    },
    {
      key: 'contact',
      label: strings.aboutContact,
      icon: 'support-agent',
      onPress: () => router.push('/legal-contact?origin=about'),
    },
  ];

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/settings');
  }

  return (
    <AppShell
      title={strings.aboutTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={handleBack}
      hideHeaderMenuButton
      backButtonVariant="icon"
      titleContent={
        <View style={styles.headerTitleWrap}>
          <AppText variant="h2" weight="800" style={styles.headerTitle}>
            {strings.aboutTitle}
          </AppText>
        </View>
      }
    >
      <View style={styles.screen}>
        <View style={styles.backdropOrbTop} />
        <View style={styles.backdropOrbBottom} />

        <AppScreen
          scrollable
          backgroundColor={theme.screenBackground}
          contentContainerStyle={styles.content}
          scrollProps={{ showsVerticalScrollIndicator: false }}
        >
          <View style={styles.brandSection}>
            <View style={styles.brandBadgeWrap}>
              <LinearGradient
                colors={[BabyCityPalette.primary, '#6411d5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandBadge}
              >
                <MaterialIcons name="child-care" size={46} color={BabyCityPalette.onPrimary} />
              </LinearGradient>

              <View style={styles.brandStarBadge}>
                <MaterialIcons name="star" size={14} color="#ffffff" />
              </View>
            </View>

            <AppText variant="h1" weight="800" style={styles.brandName}>
              {strings.appName}
            </AppText>
            <AppText variant="body" weight="600" style={styles.brandTagline}>
              {strings.aboutTagline}
            </AppText>
          </View>

          <AppCard style={styles.aboutCard}>
            <AppText variant="h2" weight="800" style={styles.aboutCardTitle}>
              {strings.aboutWhatIsTitle}
            </AppText>

            <View style={styles.aboutParagraphs}>
              <AppText variant="bodyLarge" style={styles.aboutParagraph}>
                {strings.aboutParagraphOne}
              </AppText>
              <AppText variant="bodyLarge" style={styles.aboutParagraph}>
                {strings.aboutParagraphTwo}
              </AppText>
            </View>

            <View style={styles.trustInset}>
              <View style={styles.trustIconWrap}>
                <MaterialIcons name="shield" size={26} color={BabyCityPalette.primary} />
              </View>
              <View style={styles.trustTextWrap}>
                <AppText variant="bodyLarge" weight="700" style={styles.trustTitle}>
                  {strings.aboutTrustTitle}
                </AppText>
                <AppText variant="body" style={styles.trustBody}>
                  {strings.aboutTrustBody}
                </AppText>
              </View>
            </View>
          </AppCard>

          <View style={styles.featureStack}>
            {features.map(feature => (
              <View key={feature.key} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <MaterialIcons name={feature.icon} size={24} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="body" weight="700" style={styles.featureLabel}>
                  {feature.label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.linkSection}>
            {links.map(link => (
              <TouchableOpacity
                key={link.key}
                activeOpacity={0.86}
                onPress={link.onPress}
                style={styles.linkRow}
              >
                <MaterialIcons name="chevron-left" size={22} color={BabyCityPalette.outline} />
                <View style={styles.linkContent}>
                  <MaterialIcons name={link.icon} size={22} color={BabyCityPalette.textSecondary} />
                  <AppText variant="bodyLarge" weight="600" style={styles.linkLabel}>
                    {link.label}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <AppText variant="caption" weight="600" style={styles.versionText}>
              {strings.aboutVersion} {version}
            </AppText>
            <Image
              source={{ uri: ABOUT_DECORATIVE_IMAGE_URL }}
              style={styles.footerImage}
              resizeMode="contain"
            />
          </View>
        </AppScreen>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: 18,
    right: -84,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#e8e3fb',
    opacity: 0.56,
  },
  backdropOrbBottom: {
    position: 'absolute',
    bottom: 100,
    left: -70,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#edf0ff',
    opacity: 0.92,
  },
  headerTitleWrap: {
    alignItems: 'flex-end',
    maxWidth: '74%',
    paddingRight: 8,
  },
  headerTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    fontSize: 26,
    lineHeight: 32,
  },
  content: {
    paddingTop: 28,
    gap: 20,
  },
  brandSection: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  brandBadgeWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  brandBadge: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  brandStarBadge: {
    position: 'absolute',
    top: 4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BabyCityPalette.tertiary,
    borderWidth: 3,
    borderColor: BabyCityPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'center',
  },
  brandTagline: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'center',
  },
  aboutCard: {
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderRadius: 28,
  },
  aboutCardTitle: {
    color: BabyCityPalette.primary,
    textAlign: 'right',
    marginBottom: 18,
  },
  aboutParagraphs: {
    gap: 14,
  },
  aboutParagraph: {
    textAlign: 'right',
    lineHeight: 28,
    color: BabyCityPalette.textPrimary,
  },
  trustInset: {
    marginTop: 18,
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  trustIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BabyCityPalette.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  trustTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    marginBottom: 4,
  },
  trustBody: {
    textAlign: 'right',
    lineHeight: 21,
    color: BabyCityPalette.textSecondary,
  },
  featureStack: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BabyCityPalette.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    textAlign: 'center',
    color: BabyCityPalette.textPrimary,
  },
  linkSection: {
    gap: 10,
  },
  linkRow: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  linkLabel: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  footer: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
    paddingBottom: 6,
  },
  versionText: {
    color: BabyCityPalette.outline,
    letterSpacing: 0.4,
  },
  footerImage: {
    width: 68,
    height: 52,
    opacity: 0.22,
  },
});
