import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/user';

WebBrowser.maybeCompleteAuthSession();

const MOBILE_OAUTH_REDIRECT_URL = 'babysitconnect://auth';

// ─── Types ────────────────────────────────────────────────────────────────────

// The row stored in public.users — includes phone because we get it from auth.
type DbUser = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  roles: UserRole[];
};

type CreateUserResult = {
  onboardingRoute: '/parent-onboarding' | '/babysitter-onboarding';
};

type AddParentRoleResult = {
  createdProfile: boolean;
};

type AuthState = {
  session: Session | null;
  dbUser: DbUser | null;
  activeRole: UserRole | null;
  isLoading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  createUser: (role: UserRole, name: string) => Promise<CreateUserResult>;
  addParentRole: () => Promise<AddParentRoleResult>;
  setActiveRole: (role: UserRole | null) => void;
  signOut: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

function activeRoleStorageKey(userId: string) {
  return `active_role:${userId}`;
}

function parseOAuthParams(url: string) {
  const parsedUrl = new URL(url);
  const combinedParams = new URLSearchParams();

  for (const rawParams of [parsedUrl.search, parsedUrl.hash]) {
    const normalizedParams = rawParams.replace(/^[?#]/, '');
    if (!normalizedParams) continue;

    const params = new URLSearchParams(normalizedParams);
    params.forEach((value, key) => {
      combinedParams.set(key, value);
    });
  }

  return combinedParams;
}

function getOAuthRedirectUrl() {
  if (Platform.OS === 'web') {
    return Linking.createURL('auth');
  }

  return MOBILE_OAUTH_REDIRECT_URL;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [dbUser, setDbUser]     = useState<DbUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the existing session on mount, then subscribe to future changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDbUser(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          fetchDbUser(session.user.id);
        } else {
          setDbUser(null);
          setActiveRoleState(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  function deriveRoles({
    parentProfileId,
    babysitterProfileId,
    legacyRole,
  }: {
    parentProfileId: string | null;
    babysitterProfileId: string | null;
    legacyRole: UserRole | null;
  }): UserRole[] {
    const roles: UserRole[] = [];

    if (parentProfileId) roles.push('parent');
    if (babysitterProfileId) roles.push('babysitter');

    // Backward-compatibility during the transition from single-role accounts:
    // a sitter can exist before their babysitter profile is completed.
    if (roles.length === 0 && legacyRole) {
      roles.push(legacyRole);
    }

    return roles;
  }

  // Load the public.users row plus any existing role profiles for the given auth uid.
  // If no public.users row exists yet (new user), dbUser stays null.
  async function fetchDbUser(userId: string) {
    const [
      { data: userRow },
      { data: parentProfile },
      { data: babysitterProfile },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, phone, email, role')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('parent_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('babysitter_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (!userRow) {
      setDbUser(null);
      setActiveRoleState(null);
      setIsLoading(false);
      return;
    }

    const roles = deriveRoles({
      parentProfileId: (parentProfile?.id as string | null) ?? null,
      babysitterProfileId: (babysitterProfile?.id as string | null) ?? null,
      legacyRole: (userRow.role as UserRole | null) ?? null,
    });

    setDbUser({
      id: userRow.id as string,
      name: userRow.name as string,
      phone: (userRow.phone as string | null) ?? null,
      email: (userRow.email as string | null) ?? null,
      roles,
    });

    const savedRole = await AsyncStorage.getItem(activeRoleStorageKey(userId));
    const nextRole =
      savedRole === 'parent' || savedRole === 'babysitter'
        ? (savedRole as UserRole)
        : null;

    setActiveRoleState(
      nextRole && roles.includes(nextRole)
        ? nextRole
        : roles.length === 1
          ? roles[0]
          : null
    );
    setIsLoading(false);
  }

  useEffect(() => {
    if (!session?.user.id) return;

    const key = activeRoleStorageKey(session.user.id);

    if (!activeRole) {
      return;
    }

    AsyncStorage.setItem(key, activeRole);
  }, [activeRole, session?.user.id]);

  // ── OTP auth ──────────────────────────────────────────────────────────────
  // Supabase sends an SMS. Requires an SMS provider (e.g. Twilio) configured
  // in the Supabase dashboard → Authentication → Providers → Phone.
  // For local dev you can whitelist test numbers under Authentication → Users.

  async function sendOtp(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }

  async function verifyOtp(phone: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) throw error;
    // onAuthStateChange fires automatically after a successful verification,
    // which will call fetchDbUser and update session + dbUser.
  }

  async function completeOAuthSignIn(url: string) {
    const params = parseOAuthParams(url);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const authorizationCode = params.get('code');
    const providerError = params.get('error') ?? params.get('error_code');
    const providerErrorDescription = params.get('error_description');

    if (providerError) {
      throw new Error(providerErrorDescription ?? providerError);
    }

    if (authorizationCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(authorizationCode);
      if (error) throw error;
      return;
    }

    if (!accessToken || !refreshToken) {
      throw new Error('Missing OAuth session tokens');
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  }

  async function signInWithOAuthProvider(provider: 'google' | 'apple') {
    const redirectTo = getOAuthRedirectUrl();

    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams:
          provider === 'google'
            ? {
                access_type: 'offline',
                prompt: 'select_account',
              }
            : undefined,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('Missing OAuth URL');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return;
    }

    if (result.type !== 'success' || !result.url) {
      throw new Error('OAuth sign-in was interrupted');
    }

    await completeOAuthSignIn(result.url);
  }

  async function signInWithGoogle() {
    await signInWithOAuthProvider('google');
  }

  async function signInWithApple() {
    await signInWithOAuthProvider('apple');
  }

  // ── User creation ─────────────────────────────────────────────────────────
  // Called after OTP verification when the user selects their first role.
  // Reuses the same public.users row for the same phone-auth account and creates
  // the matching role profile only if it does not already exist.

  async function createUser(role: UserRole, name: string): Promise<CreateUserResult> {
    if (!session) throw new Error('No active session');

    const { error: userError } = await supabase.from('users').upsert(
      {
        id:    session.user.id,
        role,
        name,
        phone: session.user.phone ?? null,
        email: session.user.email ?? null,
      },
      { onConflict: 'id' }
    );
    if (userError) throw userError;

    if (role === 'parent') {
      const { data: existingParentProfile } = await supabase
        .from('parent_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!existingParentProfile) {
        const { error: profileError } = await supabase
          .from('parent_profiles')
          .insert({ user_id: session.user.id });
        if (profileError) throw profileError;
      }
    }
    // Babysitter profiles are still created later during onboarding,
    // because they require city, rate, experience, etc.

    await fetchDbUser(session.user.id);
    setActiveRoleState(role);
    return {
      onboardingRoute: role === 'parent' ? '/parent-onboarding' : '/babysitter-onboarding',
    };
  }

  async function addParentRole(): Promise<AddParentRoleResult> {
    if (!session) throw new Error('No active session');
    let createdProfile = false;

    const { data: existingParentProfile } = await supabase
      .from('parent_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!existingParentProfile) {
      const { error } = await supabase
        .from('parent_profiles')
        .insert({ user_id: session.user.id });
      if (error) throw error;
      createdProfile = true;
    }

    await fetchDbUser(session.user.id);
    setActiveRoleState('parent');
    return { createdProfile };
  }

  function setActiveRole(role: UserRole | null) {
    setActiveRoleState(role);
  }

  async function signOut() {
    if (session?.user.id) {
      await AsyncStorage.removeItem(activeRoleStorageKey(session.user.id));
    }
    await supabase.auth.signOut();
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        session,
        dbUser,
        activeRole,
        isLoading,
        sendOtp,
        verifyOtp,
        signInWithGoogle,
        signInWithApple,
        createUser,
        addParentRole,
        setActiveRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
