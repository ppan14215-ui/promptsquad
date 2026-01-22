import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';

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
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[AuthProvider] Error getting session:', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('[AuthProvider] Failed to get session:', error);
        setSession(null);
        setUser(null);
        setIsLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    let redirectTo: string;
    if (Platform.OS === 'web') {
      redirectTo = `${window.location.origin}/callback`;
    } else {
      redirectTo = Linking.createURL('/callback');
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    let redirectTo: string;

    if (Platform.OS === 'web') {
      redirectTo = `${window.location.origin}/callback`;
    } else {
      redirectTo = Linking.createURL('/callback');
    }

    console.log('OAuth redirect URL:', redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) {
      console.error('OAuth sign-in error:', error);
    } else if (data?.url && Platform.OS !== 'web') {
      // On mobile, we need to open the URL manually since we skipped browser redirect
      console.log('Opening OAuth URL:', data.url);
      try {
        const canOpen = await Linking.canOpenURL(data.url);
        if (canOpen) {
          await Linking.openURL(data.url);
        } else {
          // If we can't open it, it might be a malformed URL
          console.error('Cannot open OAuth URL:', data.url);
          // Try opening it anyway as fallback (sometimes canOpen returns false false negatives)
          await Linking.openURL(data.url);
        }
      } catch (openError: any) {
        console.error('Error opening OAuth URL:', openError);
        // Alert the user so they see what happened
        alert(`Failed to open login page: ${openError.message || 'Unknown error'}`);
      }
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
