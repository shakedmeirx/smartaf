import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import {
  BabyCityPalette,
  BabyCityShadows,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';
import SmartafWordmark from '@/components/ui/SmartafWordmark';

const HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDDjLoJaZF8Rnq81jFHFA1sWD-nn88luWiYrtBrmLNrsJHPRZ9cS8nKIK52Zy5JyIKSu_v6bjcgJvpVpCsY8uaD21P7mbN9Hhkvj-TnqNNjdJD2PMF2GKTNLDx0st2M42Zv8YkQvCEedyc6SieiHkOzfSBfmHQYhqvVv5aZ0r4OZ7X2PO37tujBOW8pIXG44mQH9EgAs0EgbwqIVPEBt_Fe-d_1mKsWRxKqYM2goPePqbu1Ns7zdWrqVjNe24ZYbrwJeas4cJBZZt_R';

export default function WelcomeScreen() {
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [socialError, setSocialError] = useState('');
  const footerLinks = [
    {
      label: strings.authWelcomeTerms,
      onPress: () => router.push('/legal-terms?origin=welcome'),
    },
    {
      label: strings.authWelcomePrivacy,
      onPress: () => router.push('/legal-privacy?origin=welcome'),
    },
    {
      label: strings.authWelcomeContact,
      onPress: () => router.push('/legal-contact?origin=welcome'),
    },
  ];

  function handleContinue() {
    router.push('/auth');
  }

  async function handleSocialSignIn(provider: 'google' | 'apple') {
    if (socialLoading) return;

    setSocialError('');
    setSocialLoading(provider);

    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
    } catch {
      setSocialError(strings.authErrorGeneric);
    } finally {
      setSocialLoading(null);
    }
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
          <View style={styles.brandRow}>
            <SmartafWordmark size="sm" textColor={BabyCityPalette.textPrimary} />
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.languageButton}>
            <AppText variant="body" weight="600" style={styles.languageText}>
              {'עברית'}
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.heroBanner}>
          <Image
            source={{ uri: HERO_IMAGE_URL }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(248,250,255,0)', 'rgba(248,250,255,0.2)', '#f8faff']}
            locations={[0, 0.52, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroOverlay}
          />
        </View>

        <View style={styles.contentStage}>
          <View style={styles.heroSection}>
            <AppText variant="h1" weight="800" align="center" style={styles.heroLead}>
              {strings.authWelcomeHeadlineLead}
            </AppText>
            <AppText variant="h1" weight="800" align="center" style={styles.heroAccent}>
              {strings.authWelcomeHeadlineAccent}
            </AppText>
            <AppText variant="bodyLarge" weight="500" align="center" style={styles.heroBody}>
              {strings.authWelcomeBody}
            </AppText>
          </View>

          <View style={styles.actionCard}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleContinue}
              style={styles.primaryButtonShadow}
            >
              <LinearGradient
                colors={['#7c3aed', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <AppText variant="bodyLarge" weight="800" style={styles.primaryButtonText}>
                  {strings.authWelcomePrimaryAction}
                </AppText>
                <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleContinue}
              style={styles.secondaryButton}
            >
              <AppText variant="bodyLarge" weight="700" style={styles.secondaryButtonText}>
                {strings.authWelcomeSecondaryAction}
              </AppText>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <AppText variant="caption" tone="muted" style={styles.dividerText}>
                {strings.authWelcomeDivider}
              </AppText>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialGrid}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.socialGoogleButton}
                onPress={() => void handleSocialSignIn('google')}
                disabled={socialLoading !== null}
              >
                {socialLoading === 'google' ? (
                  <ActivityIndicator color={BabyCityPalette.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color={BabyCityPalette.textPrimary} />
                    <AppText variant="body" weight="600" style={styles.socialGoogleText}>
                      {'Google'}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.socialAppleButton}
                onPress={() => void handleSocialSignIn('apple')}
                disabled={socialLoading !== null}
              >
                {socialLoading === 'apple' ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={18} color="#ffffff" />
                    <AppText variant="body" weight="600" style={styles.socialAppleText}>
                      {'Apple'}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {socialError ? (
              <AppText variant="body" tone="error" align="center" style={styles.socialErrorText}>
                {socialError}
              </AppText>
            ) : null}
          </View>

        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureCard}>
            <View style={styles.featureCardIcon}>
              <MaterialIcons name="verified-user" size={24} color={BabyCityPalette.primary} />
            </View>
            <View style={styles.featureCardText}>
              <AppText variant="bodyLarge" weight="700" style={styles.featureTitle}>
                {strings.authWelcomeFeatureVerifiedTitle}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.featureBody}>
                {strings.authWelcomeFeatureVerifiedBody}
              </AppText>
            </View>
          </View>

          <View style={[styles.featureCard, styles.featureCardAlt]}>
            <View style={[styles.featureCardIcon, styles.featureCardIconAlt]}>
              <MaterialIcons name="near-me" size={24} color={BabyCityPalette.onSecondaryContainer} />
            </View>
            <View style={styles.featureCardText}>
              <AppText variant="bodyLarge" weight="700" style={styles.featureTitle}>
                {strings.authWelcomeFeatureNearbyTitle}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.featureBody}>
                {strings.authWelcomeFeatureNearbyBody}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            {footerLinks.map((link) => (
              <TouchableOpacity key={link.label} activeOpacity={0.8} onPress={link.onPress}>
                <AppText variant="caption" tone="muted" style={styles.footerLinkText}>
                  {link.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText variant="caption" tone="muted" align="center" style={styles.footerCopy}>
            {strings.authWelcomeCopyright}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    top: 156,
    left: -82,
    width: 228,
    height: 228,
    borderRadius: 114,
    backgroundColor: 'rgba(178, 140, 255, 0.09)',
  },
  backgroundBlobBottom: {
    position: 'absolute',
    bottom: 150,
    right: -68,
    width: 214,
    height: 214,
    borderRadius: 107,
    backgroundColor: 'rgba(233, 222, 245, 0.18)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  languageButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  languageText: {
    color: BabyCityPalette.primary,
  },
  heroBanner: {
    position: 'relative',
    height: 332,
    marginHorizontal: -24,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentStage: {
    marginTop: -58,
    alignItems: 'center',
    gap: 18,
  },
  heroSection: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  heroLead: {
    color: '#1e293b',
    fontSize: 31,
    lineHeight: 37,
  },
  heroAccent: {
    color: '#7c3aed',
    fontSize: 31,
    lineHeight: 37,
    marginTop: 1,
  },
  heroBody: {
    color: BabyCityPalette.textSecondary,
    marginTop: 14,
    maxWidth: 292,
    lineHeight: 25,
  },
  actionCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    ...BabyCityShadows.elevated,
  },
  primaryButtonShadow: {
    shadowColor: BabyCityPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 999,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#f1f5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1e293b',
  },
  dividerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(162, 173, 196, 0.25)',
  },
  dividerText: {
    color: BabyCityPalette.textSecondary,
    letterSpacing: 0.4,
  },
  socialGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  socialGoogleButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162, 173, 196, 0.18)',
    backgroundColor: BabyCityPalette.surfaceLowest,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialGoogleText: {
    color: BabyCityPalette.textPrimary,
  },
  socialAppleButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: '#000000',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialAppleText: {
    color: '#ffffff',
  },
  socialErrorText: {
    marginTop: 2,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 48,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(238,231,255,0.42)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 10,
    minHeight: 160,
    alignItems: 'center',
  },
  featureCardAlt: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  featureCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BabyCityPalette.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardIconAlt: {
    backgroundColor: BabyCityPalette.surfaceLowest,
  },
  featureCardText: {
    alignItems: 'center',
    gap: 3,
  },
  featureTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'center',
  },
  featureBody: {
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    marginTop: 26,
    alignItems: 'center',
    gap: 10,
    paddingBottom: 2,
  },
  footerLinks: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 22,
  },
  footerLinkText: {
    color: BabyCityPalette.primary,
    textDecorationLine: 'underline',
  },
  footerCopy: {
    color: BabyCityPalette.textSecondary,
    opacity: 0.7,
  },
});
