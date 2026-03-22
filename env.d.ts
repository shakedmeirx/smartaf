// Type declarations for EXPO_PUBLIC_ environment variables.
// These are inlined at build time by Expo — do not use process.env at runtime
// for values that aren't prefixed with EXPO_PUBLIC_.

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  }
}
