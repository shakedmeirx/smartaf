import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import InAppNotificationBanner from '@/components/ui/InAppNotificationBanner';
import { syncPushTokenIfPermitted } from '@/lib/pushNotifications';

export const unstable_settings = {
  anchor: 'index',
};

// ─── Auth gate ────────────────────────────────────────────────────────────────
// Lives inside AuthProvider so it can read session state.
// Redirects unauthenticated users to /auth before they see any app screen.
// Redirects back to / once the OTP flow finishes.

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  // Handle push notification tap (app backgrounded or killed)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const requestId = data?.requestId as string | undefined;
      if (requestId) {
        router.push(`/chat?requestId=${requestId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthFlow = (
      segments[0] === 'welcome' ||
      segments[0] === 'auth' ||
      segments[0] === 'auth-verify' ||
      segments[0] === 'privacy' ||
      segments[0] === 'terms' ||
      segments[0] === 'contact' ||
      segments[0] === 'account-deletion' ||
      segments[0] === 'legal-privacy' ||
      segments[0] === 'legal-terms' ||
      segments[0] === 'legal-contact'
    );

    if (!session && !inAuthFlow) {
      // Save any pending deep link (cold-start URL) so index.tsx can restore it after login
      Linking.getInitialURL().then(url => {
        if (!url) return;
        const parsed = Linking.parse(url);
        if (parsed.path && parsed.path !== '/' && parsed.path !== '') {
          const qs = new URLSearchParams(
            (parsed.queryParams ?? {}) as Record<string, string>
          ).toString();
          const link = `/${parsed.path}${qs ? `?${qs}` : ''}`;
          AsyncStorage.setItem('pending_deep_link', link).catch(() => {});
        }
      });
      // Not authenticated — redirect to phone entry
      router.replace('/welcome');
    } else if (session && inAuthFlow) {
      // Just verified OTP — send to home so index.tsx can decide where to go
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);

  // Render nothing while the initial session check is in progress.
  // The native splash screen stays visible during this brief pause.
  if (isLoading) return null;

  return <>{children}</>;
}

// ─── AppProvider bridge ───────────────────────────────────────────────────────
// Reads auth state and forwards userId + userRole into AppProvider so it can
// load role-specific app data from Supabase for the logged-in user.

function AppProviderWithAuth({ children }: { children: React.ReactNode }) {
  const { session, activeRole } = useAuth();

  // Refresh an existing push token after login without triggering the
  // OS permission prompt during app bootstrap.
  useEffect(() => {
    if (session?.user.id) {
      syncPushTokenIfPermitted().catch(() => {});
    }
  }, [session?.user.id]);

  return (
    <AppProvider
      userId={session?.user.id}
      userRole={activeRole ?? undefined}
    >
      {children}
    </AppProvider>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        {(langKey) => (
          <AuthProvider>
            <AppProviderWithAuth>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <AuthGate>
                  <InAppNotificationBanner />
                  <Stack key={langKey} screenOptions={{ animation: 'fade', animationDuration: 200 }}>
                    {/* Auth flow — no header chrome */}
                    <Stack.Screen name="welcome"           options={{ headerShown: false }} />
                    <Stack.Screen name="auth"              options={{ headerShown: false }} />
                    <Stack.Screen name="auth-verify"       options={{ headerShown: false }} />

                    {/* Main app */}
                    <Stack.Screen name="index"             options={{ headerShown: false }} />
                    <Stack.Screen name="role-picker"       options={{ headerShown: false }} />
                    <Stack.Screen name="parent"            options={{ headerShown: false }} />
                    <Stack.Screen name="parent-onboarding" options={{ headerShown: false }} />
                    <Stack.Screen name="parent-favorites"  options={{ headerShown: false }} />
                    <Stack.Screen name="parent-requests"   options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter"        options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-onboarding" options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-profile" options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-inbox"  options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-saved"  options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-stats"  options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-availability"  options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-calendar"  options={{ headerShown: false }} />
                    <Stack.Screen name="babysitter-shifts"  options={{ headerShown: false }} />
                    <Stack.Screen name="send-request"      options={{ headerShown: false }} />
                    <Stack.Screen name="settings"          options={{ headerShown: false }} />
                    <Stack.Screen name="my-profile"        options={{ headerShown: false }} />
                    <Stack.Screen name="my-posts"          options={{ headerShown: false }} />
                    <Stack.Screen name="my-ratings"        options={{ headerShown: false }} />
                    <Stack.Screen name="create-post"       options={{ headerShown: false }} />
	                    <Stack.Screen name="family-profile"    options={{ headerShown: false }} />
	                    <Stack.Screen name="chat"              options={{ headerShown: false }} />
	                    <Stack.Screen name="about"             options={{ headerShown: false }} />
	                    <Stack.Screen name="booking-history"   options={{ headerShown: false }} />
	                    <Stack.Screen name="privacy"           options={{ headerShown: false }} />
	                    <Stack.Screen name="terms"             options={{ headerShown: false }} />
	                    <Stack.Screen name="contact"           options={{ headerShown: false }} />
	                    <Stack.Screen name="account-deletion"  options={{ headerShown: false }} />
	                    <Stack.Screen name="legal-privacy"     options={{ headerShown: false }} />
	                    <Stack.Screen name="legal-terms"       options={{ headerShown: false }} />
	                    <Stack.Screen name="legal-contact"     options={{ headerShown: false }} />
	                  </Stack>
                </AuthGate>
                <StatusBar style="dark" />
              </ThemeProvider>
            </AppProviderWithAuth>
          </AuthProvider>
        )}
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
