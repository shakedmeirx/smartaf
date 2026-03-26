import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import {
  BabyCityPalette,
} from '@/constants/theme';
import KeyboardAccessoryBar from '@/components/ui/KeyboardAccessoryBar';
import AppText from '@/components/ui/AppText';
import SmartafWordmark from '@/components/ui/SmartafWordmark';

function toE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+')) return `+${digits}`;
  if (digits.startsWith('972')) return `+${digits}`;
  if (digits.startsWith('0')) return `+972${digits.slice(1)}`;
  return `+972${digits}`;
}

export default function AuthScreen() {
  const { sendOtp } = useAuth();
  const phoneRef = useRef<TextInput>(null);
  const phoneAccessoryId = 'auth-phone-accessory';

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

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
      <View style={styles.backgroundLayer} pointerEvents="none">
        <View style={styles.backgroundBlobTop} />
        <View style={styles.backgroundBlobBottom} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <SmartafWordmark size="sm" textColor={BabyCityPalette.textPrimary} />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.replace('/welcome')}
              style={styles.backButton}
            >
              <Ionicons name="chevron-forward" size={18} color={BabyCityPalette.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <AppText variant="h1" weight="800" style={styles.title}>
              {strings.authPhoneEntryTitle}
            </AppText>
            <AppText variant="bodyLarge" weight="500" style={styles.subtitle}>
              {strings.authPhoneEntrySubtitle}
            </AppText>
          </View>

          <View style={styles.card}>
            <View style={styles.cardGlow} />

            <View style={styles.inputSection}>
              <AppText variant="caption" weight="700" tone="muted" style={styles.label}>
                {strings.phoneLabel}
              </AppText>

              <View style={styles.inputRow}>
                <View style={styles.countryCodeWrap}>
                  <AppText variant="bodyLarge" weight="700" align="center" style={styles.countryCode}>
                    {'+972'}
                  </AppText>
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={18}
                    color={BabyCityPalette.textSecondary}
                  />
                </View>

                <View style={[styles.phoneInputWrap, focused && styles.phoneInputWrapFocused]}>
                  <TextInput
                    ref={phoneRef}
                    value={phone}
                    onChangeText={(value) => {
                      setPhone(value);
                      setError('');
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={strings.phonePlaceholder}
                    placeholderTextColor="rgba(162, 173, 196, 0.75)"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                    onSubmitEditing={handleSend}
                    autoFocus
                    inputAccessoryViewID={Platform.OS === 'ios' ? phoneAccessoryId : undefined}
                    style={styles.phoneInput}
                  />
                </View>
              </View>
            </View>

            <KeyboardAccessoryBar nativeID={phoneAccessoryId} onPress={handleSend} />

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleSend}
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
                  <>
                    <AppText variant="bodyLarge" weight="700" style={styles.primaryButtonText}>
                      {strings.sendCode}
                    </AppText>
                    <MaterialIcons name="send" size={20} color="#ffffff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {error !== '' ? (
              <AppText variant="body" tone="error" style={styles.errorText}>
                {error}
              </AppText>
            ) : null}
          </View>

          <View style={styles.securitySection}>
            <View style={styles.securityRow}>
              <MaterialIcons
                name="lock"
                size={14}
                color="rgba(162, 173, 196, 0.8)"
              />
              <AppText variant="caption" weight="700" style={styles.securityLabel}>
                {strings.authPhoneEntrySecure}
              </AppText>
            </View>

            <View style={styles.decorativeArea}>
              <View style={styles.decorativeCircle} />
              <View style={styles.decorativeRing} />
              <View style={styles.decorativeGlowOrb} />
            </View>
          </View>
        </ScrollView>
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
    top: -80,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(222, 232, 255, 0.7)',
  },
  backgroundBlobBottom: {
    position: 'absolute',
    bottom: -50,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(233, 222, 245, 0.36)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 52,
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 34,
  },
  title: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    fontSize: 33,
    lineHeight: 42,
    marginBottom: 14,
  },
  subtitle: {
    textAlign: 'right',
    color: BabyCityPalette.textSecondary,
    lineHeight: 30,
  },
  card: {
    position: 'relative',
    borderRadius: 32,
    backgroundColor: BabyCityPalette.surfaceLow,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -44,
    left: -44,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(112, 42, 225, 0.05)',
  },
  inputSection: {
    gap: 14,
  },
  label: {
    textAlign: 'right',
    paddingRight: 4,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  countryCodeWrap: {
    width: 102,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: BabyCityPalette.inputRecessedBg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  countryCode: {
    color: BabyCityPalette.textPrimary,
    writingDirection: 'ltr',
  },
  phoneInputWrap: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: BabyCityPalette.inputRecessedBg,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  phoneInputWrapFocused: {
    backgroundColor: '#ffffff',
    borderColor: BabyCityPalette.primary,
  },
  phoneInput: {
    fontSize: 21,
    fontWeight: '700',
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    writingDirection: 'ltr',
    letterSpacing: 1.2,
  },
  primaryButtonShadow: {
    marginTop: 28,
    shadowColor: BabyCityPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
    borderRadius: 999,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 999,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 12,
  },
  securitySection: {
    marginTop: 'auto',
    paddingTop: 60,
    alignItems: 'center',
  },
  securityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  securityLabel: {
    color: 'rgba(108, 119, 140, 0.9)',
    letterSpacing: 0.8,
  },
  decorativeArea: {
    width: 300,
    maxWidth: '100%',
    height: 108,
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    left: 32,
    top: 26,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BabyCityPalette.secondaryContainer,
  },
  decorativeRing: {
    position: 'absolute',
    left: 82,
    top: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: BabyCityPalette.surfaceContainer,
  },
  decorativeGlowOrb: {
    position: 'absolute',
    right: -34,
    bottom: -18,
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(233,222,245,0.45)',
  },
});
