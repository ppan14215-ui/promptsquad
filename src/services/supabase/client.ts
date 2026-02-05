import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

// Configure lock behavior based on platform
// Web: Use navigator.locks API if available, otherwise disable
// Native: Disable locks as they're not needed
const isWeb = Platform.OS === 'web';
const supportsLocks = isWeb && typeof navigator !== 'undefined' && 'locks' in navigator;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Disable lock if navigator.locks is not available to prevent errors
    // This can happen in older browsers or certain web contexts
    lock: supportsLocks ? undefined : async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      // Fallback: just execute the function without locking
      return await fn();
    },
  },
});

export default supabase;
