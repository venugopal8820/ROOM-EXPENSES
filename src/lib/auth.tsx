// Local auth context - works offline, persists session in localStorage.
// When Supabase is configured and online, uses Supabase Auth. Otherwise falls back
// to a local credential store (passwords hashed via SubtleCrypto, not hardcoded).

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import { MemberName, MEMBERS } from '@/types';

interface AuthUser {
  name: MemberName;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLocalPassword: (username: string, password: string) => Promise<void>;
  hasLocalPassword: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'room-expenses-session';
const CREDS_KEY = 'room-expenses-creds'; // username -> hash

const USERNAME_TO_NAME: Record<string, MemberName> = {
  venu: 'Venu',
  bantu: 'Bantu',
  bablu: 'Bablu',
  satish: 'Satish',
};

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode('room-expenses:' + password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCreds(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CREDS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Restore local session first (instant, offline-safe)
      const localSession = localStorage.getItem(SESSION_KEY);
      if (localSession) {
        try {
          const parsed = JSON.parse(localSession);
          if (parsed && parsed.name && MEMBERS.includes(parsed.name)) {
            if (mounted) setUser(parsed);
          }
        } catch {
          /* ignore */
        }
      }

      if (supabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user && mounted) {
          const name = data.session.user.user_metadata?.name as MemberName | undefined;
          if (name && MEMBERS.includes(name)) {
            const u = { name, username: data.session.user.email?.split('@')[0] || '' };
            setUser(u);
            localStorage.setItem(SESSION_KEY, JSON.stringify(u));
          }
        }
        supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            const name = session.user.user_metadata?.name as MemberName | undefined;
            if (name && MEMBERS.includes(name)) {
              const u = { name, username: session.user.email?.split('@')[0] || '' };
              setUser(u);
              localStorage.setItem(SESSION_KEY, JSON.stringify(u));
            }
          } else {
            // sign out only if we had a supabase session; keep local session if offline-local
            const wasSupabase = localStorage.getItem('room-expenses-supabase-session');
            if (wasSupabase) {
              setUser(null);
              localStorage.removeItem(SESSION_KEY);
              localStorage.removeItem('room-expenses-supabase-session');
            }
          }
        });
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const u = username.trim().toLowerCase();
    const name = USERNAME_TO_NAME[u];
    if (!name) throw new Error('Unknown member. Use venu, bantu, bablu, or satish.');

    if (supabaseConfigured && supabase && navigator.onLine) {
      try {
        const email = `${u}@room.local`;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const authUser = { name, username: u };
          setUser(authUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
          localStorage.setItem('room-expenses-supabase-session', '1');
        }
        return;
      } catch {
        // Supabase unreachable or auth error - fall through to local auth
      }
    }

    // Local auth fallback
    const creds = readCreds();
    const stored = creds[u];
    if (!stored) {
      throw new Error('No local password set yet. Set your password first (works offline).');
    }
    const hash = await hashPassword(password);
    if (hash !== stored) throw new Error('Incorrect password.');
    const authUser = { name, username: u };
    setUser(authUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
  }, []);

  const signOut = useCallback(async () => {
    if (supabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('room-expenses-supabase-session');
    setUser(null);
  }, []);

  const setLocalPassword = useCallback(async (username: string, password: string) => {
    const u = username.trim().toLowerCase();
    if (!USERNAME_TO_NAME[u]) throw new Error('Unknown member.');
    if (password.length < 4) throw new Error('Password must be at least 4 characters.');
    const creds = readCreds();
    creds[u] = await hashPassword(password);
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  }, []);

  const hasLocalPassword = useCallback(async (username: string) => {
    const u = username.trim().toLowerCase();
    return Boolean(readCreds()[u]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setLocalPassword, hasLocalPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
