// Supabase Auth provider with local fallback for offline use.
// Uses Supabase Auth (email + password) for online authentication.
// Falls back to local credential store when offline.

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import { MemberName, MEMBERS } from '@/types';

interface AuthUser {
  name: MemberName;
  username: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: MemberName) => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'room-expenses-session';

// Map email prefix to member name
function emailToMember(email: string): MemberName | null {
  const prefix = email.split('@')[0].toLowerCase();
  const name = USERNAME_TO_NAME[prefix];
  return name && MEMBERS.includes(name) ? name : null;
}

const USERNAME_TO_NAME: Record<string, MemberName> = {
  venu: 'Venu',
  bantu: 'Bantu',
  bablu: 'Bablu',
  satish: 'Satish',
};

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

      // If Supabase is configured, try to restore Supabase session
      if (supabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && mounted) {
            const name = data.session.user.user_metadata?.name as MemberName | undefined;
            const email = data.session.user.email || '';
            if (name && MEMBERS.includes(name)) {
              const u: AuthUser = { name, username: email.split('@')[0] || '', email };
              setUser(u);
              localStorage.setItem(SESSION_KEY, JSON.stringify(u));
            }
          }
        } catch {
          // offline or error - keep local session
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            const name = session.user.user_metadata?.name as MemberName | undefined;
            const email = session.user.email || '';
            if (name && MEMBERS.includes(name)) {
              const u: AuthUser = { name, username: email.split('@')[0] || '', email };
              setUser(u);
              localStorage.setItem(SESSION_KEY, JSON.stringify(u));
            }
          } else {
            setUser(null);
            localStorage.removeItem(SESSION_KEY);
          }
        });

        if (mounted) setLoading(false);
        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      }

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured || !supabase) {
      throw new Error('Authentication is not configured. Please check your environment settings.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user) {
      const name = data.user.user_metadata?.name as MemberName | undefined;
      if (!name || !MEMBERS.includes(name)) {
        await supabase.auth.signOut();
        throw new Error('This account is not associated with a room member.');
      }
      const u: AuthUser = { name, username: email.split('@')[0] || '', email };
      setUser(u);
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: MemberName) => {
    if (!supabaseConfigured || !supabase) {
      throw new Error('Authentication is not configured. Please check your environment settings.');
    }

    if (!MEMBERS.includes(name)) {
      throw new Error('Invalid member name.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    if (error) throw error;

    if (data.user) {
      const u: AuthUser = { name, username: email.split('@')[0] || '', email };
      setUser(u);
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (supabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore errors on signout
      }
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, isConfigured: supabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
