'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/app/lib/supabase/client';
import { DbProfile } from '@/app/lib/types/database';

interface AuthContextType {
  user: User | null;
  profile: DbProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        );

        const sessionPromise = supabase.auth.getSession();

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if (!isMounted) return;

        if (result && 'data' in result) {
          const session = result.data.session;
          setUser(session?.user ?? null);
          if (session?.user) {
            // Don't wait for profile - load it in background
            fetchProfile(session.user.id, session.user.email);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          // Don't wait for profile - load it in background
          fetchProfile(session.user.id, session.user.email);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email?: string | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Profile doesn't exist yet - this is normal for new users
        // Check for "no rows returned" error (PGRST116 or similar)
        if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
          // Try to create the profile with email
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({ id: userId, email: email || '' })
            .select()
            .single();

          if (!insertError) {
            setProfile(newProfile);
          } else {
            console.error('Error creating profile:', insertError);
          }
          return;
        }
        // Don't log empty errors or common "not found" scenarios
        if (error.code || error.message) {
          console.error('Error fetching profile:', error);
        }
        return;
      }
      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
