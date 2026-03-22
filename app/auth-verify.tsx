import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { BabyCityPalette, BabyCityShadows } from '@/constants/theme';
import KeyboardAccessoryBar from '@/components/ui/KeyboardAccessoryBar';
import AppText from '@/components/ui/AppText';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';

// Auth-screen local palette — shared visual language with auth.tsx
const AUTH = {
  bg: '#ecf1ff',
  inputBg: '#dee8ff',
  otpBorder: '#a2adc4',          // outline_variant
  otpActiveBorder: BabyCityPalette.primary,
  otpActiveBg: BabyCityPalette.primarySoft,
} as const;

const RESEND_COOLDOWN = 30; // seconds before the resend button becomes active

export default function AuthVerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, sendOtp } = useAuth();
  const codeRef = useRef<TextInput>(null);
  const codeAccessoryId = 'auth-verify-accessory';

  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Resend state
  const [cooldown, setCooldown]   = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [resentOk, setResentOk]   = useState(false);

  // Count down from RESEND_COOLDOWN to 0, then allow resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify() {
    if (code.trim().length < 6) {
      setError(strings.authErrorInvalidOtp);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyOtp(phone, code.trim());
      // Success: onAuthStateChange in AuthContext fires, session is set,
      // and the AuthGate in _layout.tsx redirects to '/' automatically.
    } catch {
      setError(strings.authErrorInvalidOtp);
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResentOk(false);
    setError('');
    try {
      await sendOtp(phone);
      setResentOk(true);
      setCooldown(RESEND_COOLDOWN); // restart cooldown
      setCode('');                  // clear old code
    } catch {
      setError(strings.authErrorGeneric);
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Hero — icon circle + title + subtitle, no card box */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={36} color={BabyCityPalette.primary} />
            </View>
            <AppText variant="h1" weight="800" style={styles.title}>
              {strings.authOtpTitle}
            </AppText>
            <AppText style={styles.subtitle}>
              {strings.authOtpSubtitle} {phone}
            </AppText>
          </View>

          {/* Form card — borderless, generous radius */}
          <AppCard borderColor="transparent" style={styles.formCard}>
            <AppText variant="caption" weight="700" tone="muted" style={styles.label}>
              {strings.otpCodeLabel}
            </AppText>
            <View style={styles.otpContainer}>
              <View style={styles.otpRow} pointerEvents="none">
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const isActive = i === code.length || (code.length >= 6 && i === 5);
                  return (
                    <View key={i} style={[styles.otpBox, isActive && styles.otpBoxActive]}>
                      <AppText weight="700" style={styles.otpDigit}>
                        {code[i] ?? ''}
                      </AppText>
                    </View>
                  );
                })}
              </View>
              <TextInput
                ref={codeRef}
                style={styles.hiddenInput}
                value={code}
                onChangeText={v => { setCode(v); setError(''); setResentOk(false); }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                autoFocus
                inputAccessoryViewID={Platform.OS === 'ios' ? codeAccessoryId : undefined}
                caretHidden
              />
            </View>
            <KeyboardAccessoryBar nativeID={codeAccessoryId} onPress={handleVerify} />

            {error !== '' ? (
              <AppText variant="body" tone="error" style={styles.error}>
                {error}
              </AppText>
            ) : null}
            {resentOk ? (
              <AppText variant="body" style={styles.success}>
                {strings.resendCodeSent}
              </AppText>
            ) : null}

            <AppPrimaryButton
              label={strings.verifyCode}
              loading={loading}
              onPress={handleVerify}
              size="lg"
              style={styles.button}
            />

            <View style={styles.resendRow}>
              <AppText variant="caption" tone="muted" style={styles.resendHelper}>
                לא קיבלת את הקוד?
              </AppText>
              {cooldown > 0 ? (
                <AppText style={styles.resendDisabled}>
                  {strings.resendCodeIn} {cooldown} {strings.seconds}
                </AppText>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  {resending
                    ? <ActivityIndicator size="small" color={BabyCityPalette.primary} />
                    : (
                      <AppText weight="700" tone="accent" style={styles.resendLink}>
                        {strings.resendCode}
                      </AppText>
                    )
                  }
                </TouchableOpacity>
              )}
            </View>
          </AppCard>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BabyCityPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...BabyCityShadows.soft,
  },
  title: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // ── Form card ────────────────────────────────────────────────────────────────
  formCard: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  label: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  otpContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpBox: {
    width: 50,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AUTH.otpBorder,
    backgroundColor: BabyCityPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: AUTH.otpActiveBorder,
    borderWidth: 2,
    backgroundColor: AUTH.otpActiveBg,
  },
  otpDigit: {
    fontSize: 26,
    color: BabyCityPalette.textPrimary,
    lineHeight: 30,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  error: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  success: {
    color: BabyCityPalette.success,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  button: {
    marginTop: 24,
    borderRadius: 24,
    borderWidth: 0,
  },
  // ── Resend section ──────────────────────────────────────────────────────────
  resendRow: {
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
    minHeight: 44,
  },
  resendHelper: {
    textAlign: 'center',
  },
  resendDisabled: {
    color: BabyCityPalette.textTertiary,
  },
  resendLink: {},
});
