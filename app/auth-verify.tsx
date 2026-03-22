import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import {
  BabyCityPalette,
  BabyCityShadows,
} from '@/constants/theme';
import KeyboardAccessoryBar from '@/components/ui/KeyboardAccessoryBar';
import AppText from '@/components/ui/AppText';

const RESEND_COOLDOWN = 30;

export default function AuthVerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, sendOtp } = useAuth();
  const codeRef = useRef<TextInput>(null);
  const codeAccessoryId = 'auth-verify-accessory';
  const phoneValue = typeof phone === 'string' ? phone : '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [resentOk, setResentOk] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);
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
      await verifyOtp(phoneValue, code.trim());
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
      await sendOtp(phoneValue);
      setResentOk(true);
      setCooldown(RESEND_COOLDOWN);
      setCode('');
    } catch {
      setError(strings.authErrorGeneric);
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundLayer} pointerEvents="none">
        <View style={styles.backgroundBlobTop} />
        <View style={styles.backgroundBlobBottom} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <AppText variant="bodyLarge" weight="800" style={styles.brandName}>
              {strings.authBrandName}
            </AppText>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.replace('/auth')}
              style={styles.backButton}
            >
              <Ionicons name="chevron-forward" size={18} color={BabyCityPalette.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroIcon}>
              <MaterialIcons name="phonelink-lock" size={44} color={BabyCityPalette.primary} />
            </View>
          </View>

          <View style={styles.header}>
            <AppText variant="h1" weight="800" align="center" style={styles.title}>
              {strings.authOtpTitle}
            </AppText>
            <AppText variant="bodyLarge" weight="500" align="center" style={styles.subtitle}>
              {`${strings.authOtpSubtitle} ${phoneValue}`}
            </AppText>
          </View>

          <View style={styles.otpSection}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => codeRef.current?.focus()}
              style={styles.otpRow}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = code[index] ?? '';
                const activeIndex = Math.min(code.length, 5);
                const isActive = index === activeIndex;

                return (
                  <View
                    key={index}
                    style={[styles.otpBox, isActive && styles.otpBoxActive]}
                  >
                    <AppText variant="bodyLarge" weight="700" align="center" style={styles.otpDigit}>
                      {digit !== '' ? digit : '·'}
                    </AppText>
                  </View>
                );
              })}
            </TouchableOpacity>

            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(value) => {
                setCode(value.replace(/\D/g, ''));
                setError('');
                setResentOk(false);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              autoFocus
              inputAccessoryViewID={Platform.OS === 'ios' ? codeAccessoryId : undefined}
              style={styles.hiddenInput}
            />

            <KeyboardAccessoryBar nativeID={codeAccessoryId} onPress={handleVerify} />

            {error !== '' ? (
              <AppText variant="body" tone="error" align="center" style={styles.feedback}>
                {error}
              </AppText>
            ) : resentOk ? (
              <AppText variant="body" align="center" style={styles.successText}>
                {strings.resendCodeSent}
              </AppText>
            ) : null}

            <View style={styles.resendWrap}>
              <AppText variant="body" tone="muted" align="center">
                {strings.authOtpResendPrompt}
              </AppText>

              {cooldown > 0 ? (
                <AppText variant="body" align="center" style={styles.cooldownText}>
                  {`${strings.resendCodeIn} ${cooldown} ${strings.seconds}`}
                </AppText>
              ) : (
                <TouchableOpacity disabled={resending} onPress={handleResend} activeOpacity={0.8}>
                  {resending ? (
                    <ActivityIndicator color={BabyCityPalette.primary} />
                  ) : (
                    <AppText variant="bodyLarge" weight="700" align="center" style={styles.resendLink}>
                      {strings.resendCode}
                    </AppText>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleVerify}
              disabled={loading}
              style={styles.primaryButtonShadow}
            >
              <LinearGradient
                colors={[BabyCityPalette.primary, '#6411d5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <AppText variant="bodyLarge" weight="700" style={styles.primaryButtonText}>
                    {strings.authOtpContinue}
                  </AppText>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.supportCard}>
            <View style={styles.supportIcon}>
              <MaterialIcons name="help-outline" size={20} color={BabyCityPalette.textSecondary} />
            </View>
            <View style={styles.supportContent}>
              <AppText variant="caption" weight="700" style={styles.supportTitle}>
                {strings.authOtpHelpTitle}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.supportBody}>
                {strings.authOtpHelpBody}
              </AppText>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BabyCityPalette.surface,
  },
  flex: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundBlobTop: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(112, 42, 225, 0.06)',
  },
  backgroundBlobBottom: {
    position: 'absolute',
    bottom: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(233, 222, 245, 0.38)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brandName: {
    color: BabyCityPalette.textPrimary,
    fontSize: 26,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(236, 241, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    position: 'relative',
    marginBottom: 28,
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 64,
    backgroundColor: 'rgba(112, 42, 225, 0.12)',
    transform: [{ scale: 1.18 }],
  },
  heroIcon: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...BabyCityShadows.soft,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    color: BabyCityPalette.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    color: BabyCityPalette.textSecondary,
    maxWidth: 320,
    lineHeight: 28,
  },
  otpSection: {
    width: '100%',
    alignItems: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  otpBox: {
    width: 48,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#a2adc4',
    alignItems: 'center',
    justifyContent: 'center',
    ...BabyCityShadows.soft,
  },
  otpBoxActive: {
    borderColor: BabyCityPalette.primary,
    borderWidth: 2,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  otpDigit: {
    color: BabyCityPalette.textPrimary,
    fontSize: 20,
    lineHeight: 24,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  feedback: {
    marginTop: 18,
  },
  successText: {
    marginTop: 18,
    color: BabyCityPalette.success,
  },
  resendWrap: {
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
  },
  cooldownText: {
    color: BabyCityPalette.textSecondary,
  },
  resendLink: {
    color: BabyCityPalette.primary,
  },
  primaryButtonShadow: {
    width: '100%',
    marginTop: 28,
    shadowColor: BabyCityPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  supportCard: {
    marginTop: 'auto',
    width: '100%',
    borderRadius: 20,
    backgroundColor: BabyCityPalette.surfaceLow,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  supportTitle: {
    color: BabyCityPalette.textPrimary,
    marginBottom: 2,
  },
  supportBody: {
    textAlign: 'right',
  },
});
