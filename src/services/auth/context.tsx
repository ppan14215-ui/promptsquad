import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
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
    // Get initial session - use getSession() first for fast startup
    // Then validate in background to catch stale tokens
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[AuthProvider] Error getting session:', error);
        }
        // Set initial state from cache for fast startup
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Validate in background (non-blocking)
        if (session) {
          supabase.auth.getUser()
            .then(({ data: { user: validUser }, error: userError }) => {
              if (userError || !validUser) {
                // Token is stale/invalid — try refreshing
                console.warn('[AuthProvider] Cached session invalid, attempting refresh:', userError?.message);
                supabase.auth.refreshSession()
                  .then(({ data: refreshData, error: refreshError }) => {
                    if (refreshError || !refreshData.session) {
                      // Session is truly dead — sign out to clear stale data
                      console.error('[AuthProvider] Session refresh failed, clearing stale session:', refreshError?.message);
                      supabase.auth.signOut().then(() => {
                        setSession(null);
                        setUser(null);
                      });
                    } else {
                      // Refresh succeeded
                      console.log('[AuthProvider] Session refreshed successfully');
                      setSession(refreshData.session);
                      setUser(refreshData.session.user);
                    }
                  })
                  .catch((refreshErr) => {
                    console.error('[AuthProvider] Refresh error:', refreshErr);
                    // Don't block - just log the error
                  });
              } else {
                // Session is valid - update with server-validated user
                setUser(validUser);
              }
            })
            .catch((validateErr) => {
              console.error('[AuthProvider] Validation error:', validateErr);
              // Don't block - session might still work
            });
        }
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
    if (Platform.OS === 'web') {
      // Web: standard OAuth redirect flow
      const redirectTo = `${window.location.origin}/callback`;
      console.log('OAuth redirect URL (web):', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('OAuth sign-in error:', error);
      }
      return { error: error as Error | null };
    }

    // Native: use in-app browser session (expo-web-browser)
    // This avoids deep link redirect issues and works in Expo Go + standalone builds
    try {
      // Use the relay pattern for robust Expo Go support
      // 1. App deep link (exp://... or prompt-squad://...)
      const deepLink = Linking.createURL('/callback');

      // 2. Relay URL (hosted on Vercel) that will redirect back to deep link
      // This solves the issue of dynamic Expo Go URLs not being whitelisting-able in Supabase
      const authUrl = `https://prompt-squad-3.vercel.app/callback?redirect_to=${encodeURIComponent(deepLink)}`;

      console.log(`OAuth relay flow: ${authUrl}`);
      console.log(`Final deep link: ${deepLink}`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('OAuth sign-in error:', error);
        return { error: error as Error };
      }

      if (!data?.url) {
        return { error: new Error('No OAuth URL returned') };
      }

      // Open the OAuth URL in an in-app browser that captures the redirect
      console.log('Opening OAuth URL in WebBrowser:', data.url);
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        deepLink, // We expect to return to the deep link
        {
          showInRecents: true,
        }
      );

      if (result.type === 'success' && result.url) {
        console.log('OAuth callback URL received:', result.url);

        // Extract tokens from the URL hash fragment
        // The URL looks like: scheme://callback#access_token=...&refresh_token=...
        const url = result.url;
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Error setting session:', sessionError);
              return { error: sessionError as Error };
            }
            return { error: null };
          }
        }

        // Fallback: try to get the session (it might have been set automatically)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          return { error: null };
        }

        return { error: new Error('Could not extract auth tokens from callback URL') };
      } else {
        // User cancelled the auth flow
        console.log('OAuth flow cancelled or dismissed:', result.type);
        return { error: null };
      }
    } catch (err: any) {
      console.error('Error in native OAuth flow:', err);
      return { error: err as Error };
    }
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
