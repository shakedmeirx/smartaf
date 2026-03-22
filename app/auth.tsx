import { useRef, useState } from 'react';
import {
  View,
  Image,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { BabyCityPalette } from '@/constants/theme';
import KeyboardAccessoryBar from '@/components/ui/KeyboardAccessoryBar';
import AppText from '@/components/ui/AppText';
import AppInput from '@/components/ui/AppInput';

// Stitch design tokens
const C = {
  bg: '#f4f6ff',             // surface
  cardBg: '#ffffff',          // surface-container-lowest
  primary: '#702ae1',
  primaryDim: '#6411d5',
  onPrimary: '#f8f0ff',
  secondaryContainer: '#e9def5',
  onSecondaryContainer: '#564f61',
  primaryContainer: '#b28cff',
  onPrimaryContainer: '#2e006c',
  surfaceContainerLow: '#ecf1ff',
  onSurface: '#242f41',
  onSurfaceVariant: '#515c70',
  outlineVariant: '#a2adc4',
} as const;

// Stitch social-proof avatar images
const SOCIAL_PROOF_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA-s0dD1m_2cLBvEul9elsR3TKyH2N0BAM7_oEHYNiNGGNN5xfO0AdwumMkiC4lsj8eg_LR-ok8N0Ve_dQwpvkIgl4aGtp3HbYUTpOpiv6noDzUP790JN2LS7Z_D0uX6j4oRhVe8KFy4tPzHqsL5yKpqgnwFAHyCTlhxQoVtgM6FgiOs-mzylBLStS49vySfqtxhaG_mTmTPgjHyeAEj9u04uRyrQ1stdlJHLhkjY1CiOAuLdR7KlV1LqsP4tgqYdymeXHqSa8tlSde',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCFWRFrYQlCYvwwuvkMm4cJXQSaL51bK4nMDy2Mzc8eI1cRtCMtacTKicSD3OjH0UEZAX_sSjCQZopC15rmi7OfpV_63OVU7sZlORwDYyIG2UkO05kJzlVswerDXXQHwa2dEgGCmxTYtKPlSCWLfxdvvb6VDd63wS0N_pMAcWhtDLpo5qh34yv9POGufReSz2wiyqe-FcS_umdN8oG-ykIpmdmmUJNOq51r8bq--ELfZgPGJjyUr4xA7W-UxJB0l2Qnv3IFeivRXHeP',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAAer5Nml7VFmRJpAoc1NAtneSlOl-iJH8VRWyTOAOQOAP-KPiICTvaZGSCLJ9d7CyNGKoXXSPsfw7TR8dVEE07qg5xZrpt5z3zaXJl33N9V4vDZFNLoMcmWz7Nfv-nVvBnCmdP9RT5HH6DxBOPBKcP7nWtE_Fh_PGtFrFcVErGut6yS5CrQhoZdUbEBxGqUk2LdLPJTrH9MiiC9EhudWlMqC25rwY1eAyJ-l1_ruQqZMvqDqLEs5bywOg2-7SHJC29K6o-0Y9AbNGP',
] as const;

// Converts a local Israeli number to E.164 format required by Supabase.
function toE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+')) return `+${digits}`;
  if (digits.startsWith('972'))     return `+${digits}`;
  if (digits.startsWith('0'))       return `+972${digits.slice(1)}`;
  return `+972${digits}`;
}

export default function AuthScreen() {
  const { sendOtp } = useAuth();
  const phoneRef = useRef<TextInput>(null);
  const phoneAccessoryId = 'auth-phone-accessory';

  const [phone, setPhone]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const formatted = toE164(phone);
    if (formatted.length < 12) {
      setError(strings.authErrorInvalidPhone);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOtp(formatted);
      router.push(`/auth-verify?phone=${encodeURIComponent(formatted)}`);
    } catch {
      setError(strings.authErrorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top bar ─────────────────────────────────────────────────────── */}
          <View style={styles.topBar}>
            {/* Left: language button (RTL: appears on left visually) */}
            <TouchableOpacity>
              <AppText variant="body" weight="600" style={styles.langButton}>
                {'עברית'}
              </AppText>
            </TouchableOpacity>

            {/* Right: brand (RTL: appears on right visually) */}
            <View style={styles.brandRow}>
              <AppText variant="bodyLarge" weight="800" style={styles.brandName}>
                {strings.appName}
              </AppText>
              <LinearGradient
                colors={[C.primary, C.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandMark}
              >
                <MaterialIcons name="child-care" size={20} color="#ffffff" />
              </LinearGradient>
            </View>
          </View>

          {/* ── Hero ────────────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            {/* Decorative blur circles (semi-transparent, no real blur in RN) */}
            <View style={styles.heroBlurTopRight} />
            <View style={styles.heroBlurBottomLeft} />

            <AppText variant="h1" weight="800" style={styles.heroHeadline}>
              {'Smartaf - '}
            </AppText>
            <AppText variant="h1" weight="800" style={styles.heroPrimary}>
              {'למצוא את הטיפול הטוב ביותר בביטחון.'}
            </AppText>
            <AppText style={styles.heroBody}>
              {'הצטרפו לקהילת ההורים והמטפלות הגדולה בישראל. שקט נפשי מתחיל כאן.'}
            </AppText>
          </View>

          {/* ── Card: actions + phone ────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Primary CTA — send OTP */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSend}
              activeOpacity={0.88}
              disabled={loading}
            >
              <LinearGradient
                colors={[C.primary, C.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtnGradient}
              >
                <AppText variant="bodyLarge" weight="700" style={styles.primaryBtnText}>
                  {'מתחילים עכשיו'}
                </AppText>
                <MaterialIcons name="arrow-back" size={20} color={C.onPrimary} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary CTA */}
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.88}>
              <AppText variant="bodyLarge" weight="700" style={styles.secondaryBtnText}>
                {'התחברות'}
              </AppText>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <AppText variant="caption" style={styles.dividerText}>{'או באמצעות'}</AppText>
              <View style={styles.dividerLine} />
            </View>

            {/* Social login grid */}
            <View style={styles.socialGrid}>
              <TouchableOpacity style={styles.socialBtnApple} activeOpacity={0.88}>
                <MaterialIcons name="apple" size={20} color="#ffffff" />
                <AppText variant="body" weight="600" style={styles.socialBtnAppleText}>{'Apple'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtnGoogle} activeOpacity={0.88}>
                <AppText variant="body" weight="600" style={styles.socialBtnGoogleText}>{'Google'}</AppText>
              </TouchableOpacity>
            </View>

            {/* Phone input section */}
            <View style={styles.phoneSection}>
              <AppText variant="caption" weight="700" tone="muted" style={styles.inputLabel}>
                {strings.phoneLabel}
              </AppText>
              <AppInput
                ref={phoneRef}
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                placeholder={strings.phonePlaceholder}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={handleSend}
                autoFocus
                inputAccessoryViewID={Platform.OS === 'ios' ? phoneAccessoryId : undefined}
                containerStyle={styles.inputBlock}
                inputWrapStyle={styles.inputWrap}
                style={styles.inputText}
              />
              <KeyboardAccessoryBar nativeID={phoneAccessoryId} onPress={handleSend} />
              <AppText variant="caption" tone="muted" style={styles.hint}>
                {strings.phoneHint}
              </AppText>
              {error !== '' ? (
                <AppText variant="body" tone="error" style={styles.errorText}>
                  {error}
                </AppText>
              ) : null}
            </View>
          </View>

          {/* ── Social proof ─────────────────────────────────────────────────── */}
          <View style={styles.socialProof}>
            <View style={styles.avatarCluster}>
              {SOCIAL_PROOF_AVATARS.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[styles.avatar, { right: i * 24 }]}
                  resizeMode="cover"
                />
              ))}
              {/* +15K badge */}
              <View style={[styles.avatar, styles.avatarBadge, { right: 3 * 24 }]}>
                <AppText style={styles.avatarBadgeText}>{'15K+'}</AppText>
              </View>
            </View>
            <AppText variant="caption" weight="500" style={styles.socialProofText}>
              {'מעל 15,000 הורים כבר מצאו את המטפלת המושלמת'}
            </AppText>
          </View>

          {/* ── Feature tiles ────────────────────────────────────────────────── */}
          <View style={styles.tilesRow}>
            {/* Tile 1 — verified profiles */}
            <View style={[styles.tile, styles.tileLeft]}>
              <MaterialIcons name="verified-user" size={32} color={C.primary} />
              <AppText variant="caption" weight="700" style={styles.tileTitle}>
                {'פרופילים מאומתים'}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.tileBody}>
                {'אנחנו בודקים כל מטפלת כדי להבטיח ביטחון מלא.'}
              </AppText>
            </View>

            {/* Tile 2 — nearby (offset down) */}
            <View style={[styles.tile, styles.tileRight]}>
              <MaterialIcons name="near-me" size={32} color={C.onSecondaryContainer} />
              <AppText variant="caption" weight="700" style={styles.tileTitle}>
                {'קרוב לבית'}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.tileBody}>
                {'חיפוש חכם מבוסס מיקום למציאת פתרון מהיר.'}
              </AppText>
            </View>
          </View>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <View style={styles.footerLinks}>
              <TouchableOpacity><AppText variant="caption" weight="500" style={styles.footerLink}>{'תנאי שימוש'}</AppText></TouchableOpacity>
              <TouchableOpacity><AppText variant="caption" weight="500" style={styles.footerLink}>{'מדיניות פרטיות'}</AppText></TouchableOpacity>
              <TouchableOpacity><AppText variant="caption" weight="500" style={styles.footerLink}>{'צור קשר'}</AppText></TouchableOpacity>
            </View>
            <AppText variant="caption" tone="muted" style={styles.footerCopy}>
              {'© 2024 Smartaf. כל הזכויות שמורות.'}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ── Top bar ─────────────────────────────────────────────────────────────────
  topBar: {
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',           // LTR here: brand on right, lang on left
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    color: C.onSurface,
    fontSize: 22,
    lineHeight: 28,
  },
  langButton: {
    color: C.primary,
    fontSize: 15,
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  heroBlurTopRight: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#b28cff33', // primary-container/20
  },
  heroBlurBottomLeft: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#e9def54d', // secondary-container/30
  },
  heroHeadline: {
    fontSize: 32,
    lineHeight: 40,
    color: C.onSurface,
    textAlign: 'right',
    zIndex: 1,
  },
  heroPrimary: {
    fontSize: 32,
    lineHeight: 42,
    color: C.primary,
    textAlign: 'right',
    zIndex: 1,
  },
  heroBody: {
    fontSize: 17,
    lineHeight: 25,
    color: C.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 12,
    zIndex: 1,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 32,
    paddingHorizontal: 32,
    paddingVertical: 32,
    shadowColor: '#242f41',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 50,
    elevation: 8,
    gap: 16,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    height: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: C.onPrimary,
    fontSize: 18,
  },
  secondaryBtn: {
    height: 56,
    backgroundColor: C.secondaryContainer,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: C.onSecondaryContainer,
    fontSize: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#a2adc433',
  },
  dividerText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
  },
  socialGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtnApple: {
    flex: 1,
    height: 56,
    backgroundColor: C.onSurface,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialBtnAppleText: {
    color: '#ffffff',
    fontSize: 15,
  },
  socialBtnGoogle: {
    flex: 1,
    height: 56,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a2adc41a',
  },
  socialBtnGoogleText: {
    color: C.onSurface,
    fontSize: 15,
  },
  phoneSection: {
    gap: 4,
    marginTop: 4,
  },
  inputLabel: {
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  inputBlock: {
    marginBottom: 0,
  },
  inputWrap: {
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 0,
    borderRadius: 14,
    minHeight: 56,
  },
  inputText: {
    fontSize: 18,
  },
  hint: {
    textAlign: 'right',
    marginTop: 6,
  },
  errorText: {
    textAlign: 'right',
    marginTop: 4,
  },

  // ── Social proof ─────────────────────────────────────────────────────────────
  socialProof: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    marginTop: 32,
    paddingHorizontal: 4,
  },
  avatarCluster: {
    flexDirection: 'row-reverse',
    // 4 overlapping avatars at 24px offset each → total width ~48+24+24+24 = 120
    width: 120,
    height: 48,
    position: 'relative',
  },
  avatar: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: C.bg,
    overflow: 'hidden',
    top: 0,
  },
  avatarBadge: {
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    color: C.onPrimaryContainer,
    fontSize: 10,
    fontWeight: '700',
  },
  socialProofText: {
    color: C.onSurfaceVariant,
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
  },

  // ── Feature tiles ─────────────────────────────────────────────────────────────
  tilesRow: {
    flexDirection: 'row-reverse',
    gap: 16,
    marginTop: 40,
    alignItems: 'flex-start',
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    alignItems: 'flex-end',
  },
  tileLeft: {
    backgroundColor: C.surfaceContainerLow,
  },
  tileRight: {
    backgroundColor: '#e9def580', // secondary-container/50
    marginTop: 16,                // offset down per design
  },
  tileTitle: {
    color: C.onSurface,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
  },
  tileBody: {
    color: C.onSurfaceVariant,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 48,
    alignItems: 'center',
    gap: 12,
  },
  footerLinks: {
    flexDirection: 'row-reverse',
    gap: 20,
  },
  footerLink: {
    color: C.onSurfaceVariant,
    fontSize: 13,
  },
  footerCopy: {
    color: C.onSurfaceVariant,
    fontSize: 11,
    opacity: 0.6,
  },
});
