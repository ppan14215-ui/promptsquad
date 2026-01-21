import { supabase } from '@/services/supabase';

const CORRECT_PROJECT_REF = 'gjtjrukypqmxzxlovfdg';

/**
 * Decode JWT token to extract project ref
 */
function decodeJWT(token: string): { ref?: string; [key: string]: any } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if the current session token is from the correct project
 * If not, force sign out and clear storage
 */
export async function validateTokenProject(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return false;
    }

    const decoded = decodeJWT(session.access_token);
    
    if (!decoded || !decoded.ref) {
      // Can't validate - sign out to be safe
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      return false;
    }

    if (decoded.ref !== CORRECT_PROJECT_REF) {
      console.error('[TokenValidator] Token from wrong project!', {
        tokenRef: decoded.ref,
        correctRef: CORRECT_PROJECT_REF
      });
      
      // Force sign out - token is from old project
      await supabase.auth.signOut();
      
      // Clear all storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TokenValidator] Error validating token:', error);
    await supabase.auth.signOut();
    return false;
  }
}
