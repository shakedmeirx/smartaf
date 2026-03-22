import { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '@/locales';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';
import { BabyCityPalette } from '@/constants/theme';
import KeyboardAccessoryBar from '@/components/ui/KeyboardAccessoryBar';
import AppText from '@/components/ui/AppText';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppButton from '@/components/ui/AppButton';
import type { TextInput } from 'react-native';

// Auth-screen local palette — shared visual language across the auth flow
const AUTH = {
  bg: '#ecf1ff',
  brandMarkBg: BabyCityPalette.primarySoft,
  brandMarkText: BabyCityPalette.primary,
  inputBg: '#dee8ff',
  secondaryBtnBg: '#e9def5',     // secondary_container
  secondaryBtnText: '#564f61',   // on_secondary_container
} as const;

export default function WelcomeScreen() {
  const { dbUser, activeRole, isLoading, createUser, signOut } = useAuth();
  const nameRef = useRef<TextInput>(null);
  const nameAccessoryId = 'welcome-name-accessory';
  const postSignupRouteRef = useRef<'/parent-onboarding' | '/babysitter-onboarding' | null>(null);

  const [name, setName]           = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving]       = useState(false);

  // Returning user: they already have a role stored in Supabase.
  // Skip the setup screen and go directly to their area.
  // If a deep link was saved before auth, restore it after routing home.
  useEffect(() => {
    if (postSignupRouteRef.current) {
      const nextRoute = postSignupRouteRef.current;
      postSignupRouteRef.current = null;
      router.replace(nextRoute);
      return;
    }

    if (isLoading || !dbUser) return;

    if (dbUser.roles.length > 1 && !activeRole) {
      router.replace('/role-picker');
      return;
    }

    const homeRoute = activeRole === 'parent' ? '/parent' : '/babysitter';
    if (activeRole === 'parent' || activeRole === 'babysitter') {
      router.replace(homeRoute);
      // Restore any deep link that was interrupted by the auth flow
      AsyncStorage.getItem('pending_deep_link').then(link => {
        if (!link) return;
        AsyncStorage.removeItem('pending_deep_link').catch(() => {});
        router.push(link as Parameters<typeof router.push>[0]);
      });
    }
  }, [activeRole, dbUser, isLoading]);

  // Show a spinner while the initial session + dbUser fetch is running,
  // or while the redirect above is in progress.
  if (isLoading || dbUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BabyCityPalette.primary} />
      </View>
    );
  }

  // New user: they verified their phone but haven't chosen a role yet.
  // Collect their name, then let them pick parent or babysitter.
  async function handleSelectRole(role: UserRole) {
    if (name.trim() === '') {
      setNameError(strings.authErrorNameRequired);
      return;
    }

    setSaving(true);
    setNameError('');
    try {
      const fallbackRoute =
        role === 'parent' ? '/parent-onboarding' : '/babysitter-onboarding';
      postSignupRouteRef.current = fallbackRoute;
      const { onboardingRoute } = await createUser(role, name.trim());
      router.replace(onboardingRoute);
    } catch {
      postSignupRouteRef.current = null;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {/* Hero — floating on background, no card box */}
        <View style={styles.hero}>
          <View style={styles.brandMark}>
            <AppText variant="bodyLarge" weight="800" style={styles.brandMarkText}>
              {strings.appName.charAt(0)}
            </AppText>
          </View>
          <AppText variant="bodyLarge" weight="800" style={styles.appName}>
            {strings.appName}
          </AppText>
          <AppText variant="h1" weight="800" style={styles.title}>
            {strings.authSetupTitle}
          </AppText>
        </View>

        {/* Form card — borderless, generous radius */}
        <AppCard borderColor="transparent" style={styles.formCard}>
          <AppInput
            ref={nameRef}
            value={name}
            onChangeText={v => { setName(v); setNameError(''); }}
            label={strings.authNameLabel}
            error={nameError || undefined}
            placeholder={strings.authNamePlaceholder}
            returnKeyType="done"
            autoFocus
            onSubmitEditing={() => nameRef.current?.blur()}
            inputAccessoryViewID={Platform.OS === 'ios' ? nameAccessoryId : undefined}
            containerStyle={styles.inputBlock}
            inputWrapStyle={styles.inputWrap}
          />
          <KeyboardAccessoryBar
            nativeID={nameAccessoryId}
            onPress={() => nameRef.current?.blur()}
          />
          <AppText variant="body" tone="muted" align="center" style={styles.rolePrompt}>
            {strings.authChooseRole}
          </AppText>

          <AppPrimaryButton
            label={strings.iAmParent}
            onPress={() => handleSelectRole('parent')}
            loading={saving}
            disabled={saving}
            size="lg"
            style={styles.primaryButton}
          />

          <AppButton
            label={strings.iAmBabysitter}
            variant="secondary"
            onPress={() => handleSelectRole('babysitter')}
            loading={saving}
            disabled={saving}
            size="lg"
            style={styles.secondaryButton}
            backgroundColor={AUTH.secondaryBtnBg}
            borderColor="transparent"
            textColor={AUTH.secondaryBtnText}
          />

          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <AppText variant="caption" tone="muted" align="center">
              {strings.signOut}
            </AppText>
          </TouchableOpacity>
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AUTH.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AUTH.bg,
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
    gap: 8,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: AUTH.brandMarkBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  brandMarkText: {
    color: AUTH.brandMarkText,
    fontSize: 24,
  },
  appName: {
    color: BabyCityPalette.primary,
    textAlign: 'center',
  },
  title: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 34,
  },
  // ── Form card ────────────────────────────────────────────────────────────────
  formCard: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  inputBlock: {
    marginBottom: 4,
  },
  inputWrap: {
    backgroundColor: AUTH.inputBg,
    borderWidth: 0,
    borderRadius: 14,
    minHeight: 56,
  },
  rolePrompt: {
    marginTop: 24,
    marginBottom: 16,
  },
  primaryButton: {
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 0,
  },
  secondaryButton: {
    marginBottom: 4,
    borderRadius: 24,
    borderWidth: 0,
  },
  signOutButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
});
