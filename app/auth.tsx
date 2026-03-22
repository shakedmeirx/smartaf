import { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { BabyCityPalette } from '@/constants/theme';
import KeyboardAccessoryBar from '@/components/ui/KeyboardAccessoryBar';
import AppText from '@/components/ui/AppText';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';

// Auth-screen palette — matches Stitch "Auth - Welcome" tokens
const AUTH = {
  bg: '#ffffff',
  brandMarkBg: BabyCityPalette.primarySoft,
  brandMarkText: BabyCityPalette.primary,
  inputBg: '#f4f6ff',
  tileBg: '#ecf1ff',
  avatarColors: ['#dee8ff', '#ede9f5', '#e8f8ff'] as const,
} as const;

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
          {/* ── Top bar ────────────────────────────────────────────────────── */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <AppText variant="bodyLarge" weight="800" style={styles.brandMarkText}>
                  {strings.appName.charAt(0)}
                </AppText>
              </View>
              <AppText variant="bodyLarge" weight="800" style={styles.brandName}>
                {strings.appName}
              </AppText>
            </View>
          </View>

          {/* ── Hero ───────────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <View style={styles.heroEyebrowPill}>
              <AppText variant="caption" weight="700" style={styles.heroEyebrow}>
                {strings.appName}
              </AppText>
            </View>
            <AppText variant="h1" weight="800" style={styles.heroHeadline}>
              {'למצוא את הטיפול הטוב ביותר, בביטחון.'}
            </AppText>
            <AppText style={styles.heroBody}>
              {strings.authPhoneSubtitle}
            </AppText>
          </View>

          {/* ── Phone form — inline on white, no card ──────────────────────── */}
          <View style={styles.form}>
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
              <AppText variant="body" tone="error" style={styles.error}>
                {error}
              </AppText>
            ) : null}

            <AppPrimaryButton
              label={strings.sendCode}
              loading={loading}
              onPress={handleSend}
              size="lg"
              style={styles.ctaButton}
            />
          </View>

          {/* ── Social proof ───────────────────────────────────────────────── */}
          <View style={styles.socialProof}>
            <View style={styles.avatarStack}>
              {AUTH.avatarColors.map((bg, i) => (
                <View key={i} style={[styles.avatar, { backgroundColor: bg, right: i * 22 }]}>
                  <Ionicons name="person" size={14} color={BabyCityPalette.textSecondary} />
                </View>
              ))}
            </View>
            <AppText variant="caption" weight="600" style={styles.socialProofText}>
              {'מעל 15,000 הורים ובייביסיטרים'}
            </AppText>
          </View>

          {/* ── Feature tiles ──────────────────────────────────────────────── */}
          <View style={styles.tilesRow}>
            <View style={styles.tile}>
              <Ionicons name="shield-checkmark-outline" size={24} color={BabyCityPalette.primary} />
              <AppText variant="meta" weight="700" style={styles.tileTitle}>
                {'פרופילים מאומתים'}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.tileBody}>
                {'כל בייביסיטר עובר בדיקה ואימות לפני פרסום הפרופיל'}
              </AppText>
            </View>
            <View style={styles.tile}>
              <Ionicons name="location-outline" size={24} color={BabyCityPalette.accent} />
              <AppText variant="meta" weight="700" style={styles.tileTitle}>
                {'קרוב לבית'}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.tileBody}>
                {'מצאו בייביסיטר באזור שלכם בקלות ובמהירות'}
              </AppText>
            </View>
            <View style={styles.tile}>
              <Ionicons name="heart-outline" size={24} color={BabyCityPalette.success} />
              <AppText variant="caption" weight="700" style={styles.tileTitle}>
                {'חוויה אישית'}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.tileBody}>
                {'בייביסיטרים מדורגים ע"י הורים שכבר השתמשו בשירות'}
              </AppText>
            </View>
          </View>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <AppText variant="caption" tone="muted" style={styles.footer}>
            {'© ' + strings.appName + ' 2024'}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AUTH.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: AUTH.brandMarkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: AUTH.brandMarkText,
    fontSize: 18,
    lineHeight: 22,
  },
  brandName: {
    color: BabyCityPalette.textPrimary,
    fontSize: 17,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    paddingTop: 32,
    paddingBottom: 8,
    gap: 10,
    alignItems: 'flex-end',
  },
  heroEyebrowPill: {
    backgroundColor: BabyCityPalette.primarySoft,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-end',
  },
  heroEyebrow: {
    color: BabyCityPalette.primary,
    textAlign: 'right',
  },
  heroHeadline: {
    fontSize: 30,
    lineHeight: 40,
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
  },

  // ── Phone form ────────────────────────────────────────────────────────────────
  form: {
    paddingTop: 28,
  },
  inputLabel: {
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  inputBlock: {
    marginBottom: 0,
  },
  inputWrap: {
    backgroundColor: AUTH.inputBg,
    borderWidth: 0,
    borderRadius: 14,
    minHeight: 56,
  },
  inputText: {
    fontSize: 18,
  },
  hint: {
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 4,
  },
  error: {
    textAlign: 'right',
    marginBottom: 12,
  },
  ctaButton: {
    marginTop: 20,
  },

  // ── Social proof ──────────────────────────────────────────────────────────────
  socialProof: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingTop: 28,
  },
  avatarStack: {
    flexDirection: 'row-reverse',
    width: 70,
    height: 36,
    position: 'relative',
  },
  avatar: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AUTH.bg,
    top: 2,
  },
  socialProofText: {
    color: BabyCityPalette.textSecondary,
    flex: 1,
    textAlign: 'right',
  },

  // ── Feature tiles ─────────────────────────────────────────────────────────────
  tilesRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    paddingTop: 24,
  },
  tile: {
    flex: 1,
    backgroundColor: AUTH.tileBg,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  tileTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  tileBody: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    textAlign: 'center',
    marginTop: 28,
    color: BabyCityPalette.textTertiary,
  },
});
