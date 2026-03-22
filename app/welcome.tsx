import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import {
  BabyCityGeometry,
  BabyCityPalette,
  BabyCityShadows,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';

const HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDa77M3mrrq1ChzWfc4doLm_96u74LHCnT1KoZTaZJwt2j4viX9ljK87gigVmv2qFeyJu28bJ2pZp4phbGSiGG7oKN6_nhAf7gYy15nXZBeHqDtaiiB0ZIHS4RJP6jDZUz22crMR5bIdu_33X4cxWFekZE3yQniOTr9zk3gduoBaSeNkerU5gJ7PRD-45cf4-ZRztsC5-ymy1BcvSzO2yWIhnLNS2NicDgdMgMWSIqlXBfbhl68vKZX5-BaI9Jxi1hlQwAMYMVVNUFp';

const SOCIAL_PROOF_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCFWRFrYQlCYvwwuvkMm4cJXQSaL51bK4nMDy2Mzc8eI1cRtCMtacTKicSD3OjH0UEZAX_sSjCQZopC15rmi7OfpV_63OVU7sZlORwDYyIG2UkO05kJzlVswerDXXQHwa2dEgGCmxTYtKPlSCWLfxdvvb6VDd63wS0N_pMAcWhtDLpo5qh34yv9POGufReSz2wiyqe-FcS_umdN8oG-ykIpmdmmUJNOq51r8bq--ELfZgPGJjyUr4xA7W-UxJB0l2Qnv3IFeivRXHeP',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBg3omT9gk1KeJQWBkLyUOPAkP_727811xj79lBDcE4batU4M5EQ1GFdDqbJKknWPEZbWSQ0HSWHacPKeLoCxy3HKemiRGzYWfQ4lSDkafzBnAQrIPtAn7LxSVntaZ6O31BaAUQwpbDEAREroKZLyhPcE-dPoQofSpqds7yU_ooSEdv9M0vW9eLtGhdRMEFk5XkSi9SRgtOWENdulgYs94ZFiCXIxn48jeolxlQC6Y8l-8_Y5e3L8WGaibBaEH0VpmChBygl2Hr_wcX',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAAer5Nml7VFmRJpAoc1NAtneSlOl-iJH8VRWyTOAOQOAP-KPiICTvaZGSCLJ9d7CyNGKoXXSPsfw7TR8dVEE07qg5xZrpt5z3zaXJl33N9V4vDZFNLoMcmWz7Nfv-nVvBnCmdP9RT5HH6DxBOPBKcP7nWtE_Fh_PGtFrFcVErGut6yS5CrQhoZdUbEBxGqUk2LdLPJTrH9MiiC9EhudWlMqC25rwY1eAyJ-l1_ruQqZMvqDqLEs5bywOg2-7SHJC29K6o-0Y9AbNGP',
] as const;

export default function WelcomeScreen() {
  const footerLinks = [
    strings.authWelcomeTerms,
    strings.authWelcomePrivacy,
    strings.authWelcomeContact,
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
            <AppText variant="bodyLarge" weight="800" style={styles.brandName}>
              {strings.authBrandName}
            </AppText>
            <LinearGradient
              colors={[BabyCityPalette.primary, '#6411d5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandMark}
            >
              <MaterialIcons name="child-care" size={20} color="#ffffff" />
            </LinearGradient>
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.languageButton}>
            <AppText variant="body" weight="600" style={styles.languageText}>
              {'עברית'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Hero image */}
        <View style={styles.heroImageWrap}>
          <Image
            source={{ uri: HERO_IMAGE_URL }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Floating badge */}
          <View style={styles.heroBadge}>
            <LinearGradient
              colors={[BabyCityPalette.primary, '#6411d5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBadgeIcon}
            >
              <MaterialIcons name="favorite" size={20} color="#ffffff" />
            </LinearGradient>
            <View style={styles.heroBadgeText}>
              <AppText variant="body" weight="700" style={styles.heroBadgeTitle}>
                {strings.authWelcomeHeroBadgeTitle}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.heroBadgeSubtitle}>
                {strings.authWelcomeHeroBadgeSubtitle}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />

          <AppText variant="h1" weight="800" style={styles.heroLead}>
            {strings.authWelcomeHeadlineLead}
          </AppText>
          <AppText variant="h1" weight="800" style={styles.heroAccent}>
            {strings.authWelcomeHeadlineAccent}
          </AppText>
          <AppText variant="bodyLarge" weight="500" style={styles.heroBody}>
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
              colors={[BabyCityPalette.primary, '#6411d5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <AppText variant="bodyLarge" weight="700" style={styles.primaryButtonText}>
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
            <TouchableOpacity activeOpacity={0.88} style={styles.socialGoogleButton}>
              <Ionicons name="logo-google" size={18} color={BabyCityPalette.textPrimary} />
              <AppText variant="body" weight="600" style={styles.socialGoogleText}>
                {'Google'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.88} style={styles.socialAppleButton}>
              <Ionicons name="logo-apple" size={18} color="#ffffff" />
              <AppText variant="body" weight="600" style={styles.socialAppleText}>
                {'Apple'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.socialProof}>
          <View style={styles.avatarCluster}>
            {SOCIAL_PROOF_AVATARS.map((uri, index) => (
              <Image
                key={uri}
                source={{ uri }}
                style={[styles.avatar, { marginLeft: index === 0 ? 0 : -12 }]}
                resizeMode="cover"
              />
            ))}
            <View style={[styles.avatar, styles.avatarBadge]}>
              <AppText variant="caption" weight="700" style={styles.avatarBadgeText}>
                {'+15K'}
              </AppText>
            </View>
          </View>

          <AppText variant="caption" weight="500" align="center" style={styles.socialProofText}>
            {strings.authWelcomeSocialProof}
          </AppText>
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

          <View style={styles.featureCard}>
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
            {footerLinks.map((label) => (
              <TouchableOpacity key={label} activeOpacity={0.8}>
                <AppText variant="caption" tone="muted" style={styles.footerLinkText}>
                  {label}
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
    backgroundColor: BabyCityPalette.surface,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundBlobTop: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(178, 140, 255, 0.18)',
  },
  backgroundBlobBottom: {
    position: 'absolute',
    bottom: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(233, 222, 245, 0.42)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    color: BabyCityPalette.textPrimary,
    fontSize: 26,
    letterSpacing: -0.6,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...BabyCityShadows.soft,
  },
  languageButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  languageText: {
    color: BabyCityPalette.primary,
  },
  heroImageWrap: {
    position: 'relative',
    borderRadius: 32,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    marginBottom: 20,
    ...BabyCityShadows.elevated,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    left: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  heroBadgeTitle: {
    color: BabyCityPalette.textPrimary,
  },
  heroBadgeSubtitle: {
    textAlign: 'right',
  },
  heroSection: {
    position: 'relative',
    alignItems: 'flex-end',
    marginBottom: 36,
    paddingTop: 12,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -26,
    right: -18,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(178, 140, 255, 0.2)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -34,
    left: 0,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(233, 222, 245, 0.34)',
  },
  heroLead: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  heroAccent: {
    textAlign: 'right',
    color: BabyCityPalette.primary,
    marginTop: 4,
  },
  heroBody: {
    textAlign: 'right',
    color: BabyCityPalette.textSecondary,
    marginTop: 12,
    maxWidth: 290,
    lineHeight: 28,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 24,
    gap: 16,
    ...BabyCityShadows.editorial,
  },
  primaryButtonShadow: {
    shadowColor: BabyCityPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: BabyCityPalette.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: BabyCityPalette.onSecondaryContainer,
  },
  dividerRow: {
    flexDirection: 'row',
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
  },
  socialGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  socialGoogleButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162, 173, 196, 0.18)',
    backgroundColor: BabyCityPalette.surfaceLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialGoogleText: {
    color: BabyCityPalette.textPrimary,
  },
  socialAppleButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: BabyCityPalette.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialAppleText: {
    color: '#ffffff',
  },
  socialProof: {
    alignItems: 'center',
    marginTop: 36,
    gap: 14,
  },
  avatarCluster: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: BabyCityPalette.surface,
    backgroundColor: BabyCityPalette.surfaceContainer,
  },
  avatarBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.primaryContainer,
  },
  avatarBadgeText: {
    color: '#2e006c',
  },
  socialProofText: {
    maxWidth: 280,
    color: BabyCityPalette.textSecondary,
    lineHeight: 20,
  },
  featureRow: {
    gap: 10,
    marginTop: 32,
  },
  featureCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    ...BabyCityShadows.soft,
  },
  featureCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: BabyCityPalette.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardIconAlt: {
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  featureCardText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  featureTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  featureBody: {
    lineHeight: 20,
    textAlign: 'right',
  },
  footer: {
    marginTop: 36,
    alignItems: 'center',
    gap: 12,
  },
  footerLinks: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: BabyCityGeometry.spacing.lg,
  },
  footerLinkText: {
    color: BabyCityPalette.textSecondary,
  },
  footerCopy: {
    color: BabyCityPalette.textSecondary,
    opacity: 0.7,
  },
});
