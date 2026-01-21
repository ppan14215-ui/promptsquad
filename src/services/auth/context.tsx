import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';
import { validateTokenProject } from './token-validator';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session (this will parse OAuth callback URL hash/query params)
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error('[AuthProvider] Error getting session:', error);
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Validate token is from correct project
        if (session?.access_token) {
          const isValid = await validateTokenProject();
          if (!isValid) {
            // Token invalid - already signed out by validator
            setSession(null);
            setUser(null);
            setIsLoading(false);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('[AuthProvider] Failed to get session:', error);
        setSession(null);
        setUser(null);
        setIsLoading(false); // Always set loading to false, even on error
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Validate token on sign in
      if (session?.access_token && event === 'SIGNED_IN') {
        const isValid = await validateTokenProject();
        if (!isValid) {
          // Token invalid - already signed out
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    // Get the correct redirect URL based on platform
    let redirectTo: string;
    
    if (Platform.OS === 'web') {
      // For web, use the current origin + /callback
      redirectTo = `${window.location.origin}/callback`;
    } else {
      // For native (iOS/Android), use expo-linking to get the deep link URL
      // This will be something like: prompt-squad://callback
      const scheme = Linking.createURL('/callback');
      redirectTo = scheme;
    }

    console.log('OAuth redirect URL:', redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // Skip browser redirect on native - Expo handles it
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    
    if (error) {
      console.error('OAuth sign-in error:', error);
    }
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

