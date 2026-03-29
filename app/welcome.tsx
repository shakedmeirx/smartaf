import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import {
  BabyCityPalette,
  BabyCityShadows,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';
import SmartafWordmark from '@/components/ui/SmartafWordmark';

const HERO_IMAGE = require('../.stitch/designs/welcome-refined.png');

export default function WelcomeScreen() {
  const footerLinks = [
    {
      label: strings.authWelcomeTerms,
      onPress: () => router.push('/terms?origin=welcome'),
    },
    {
      label: strings.authWelcomePrivacy,
      onPress: () => router.push('/privacy?origin=welcome'),
    },
    {
      label: strings.authWelcomeContact,
      onPress: () => router.push('/contact?origin=welcome'),
    },
  ];

  function handleContinue() {
    router.push('/auth');
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
            source={HERO_IMAGE}
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
          </View>

        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureCard}>
            <View style={styles.featureCardIcon}>
              <MaterialIcons name="shield" size={24} color={BabyCityPalette.primary} />
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
