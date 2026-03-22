// URL polyfill must be the first import — Supabase uses the URL API internally
// and React Native does not implement it fully on all platforms.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example → .env.local and fill in your project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    // Persist the session across app restarts using AsyncStorage
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Must be false in React Native — there is no browser URL to parse
    detectSessionInUrl: false,
  },
});
