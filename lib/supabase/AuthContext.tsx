import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './client';
import type { Profile, RegisterData, AuthState } from '../types/auth';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  session: Session | null;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  refreshUserStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  const setupSession = useCallback(async (newSession: Session | null) => {
    setSession(newSession);

    if (newSession?.user) {
      const profile = await fetchProfile(newSession.user.id);
      setUser(profile);
    } else {
      setUser(null);
    }
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      (async () => {
        await setupSession(currentSession);
        setIsLoading(false);
      })();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        await setupSession(newSession);
      })();
    });

    return () => subscription.unsubscribe();
  }, [setupSession]);

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedPhone = data.phone.replace(/\s/g, '');

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (existingProfile) {
        return { success: false, error: 'phoneAlreadyUsed' };
      }

      const email = `${normalizedPhone}@fatora.local`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: data.password,
        phone: normalizedPhone,
        options: {
          data: {
            phone: normalizedPhone,
          },
        },
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        return { success: false, error: 'registrationFailed' };
      }

      if (!authData.user) {
        return { success: false, error: 'registrationFailed' };
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: normalizedPhone,
          shop_name: data.shopName || '',
          shop_address: data.shopAddress || '',
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      const profile = await fetchProfile(authData.user.id);
      setUser(profile);

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'connectionRequired' };
    }
  }, [fetchProfile]);

  const login = useCallback(async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedPhone = phone.replace(/\s/g, '');
      const email = `${normalizedPhone}@fatora.local`;

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          return { success: false, error: 'invalidCredentials' };
        }
        console.error('Sign in error:', signInError);
        return { success: false, error: 'connectionRequired' };
      }

      if (!authData.user) {
        return { success: false, error: 'invalidCredentials' };
      }

      const profile = await fetchProfile(authData.user.id);

      if (!profile) {
        return { success: false, error: 'profileNotFound' };
      }

      setUser(profile);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'connectionRequired' };
    }
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          shop_name: data.shop_name,
          shop_address: data.shop_address,
          shop_logo_url: data.shop_logo_url,
          language: data.language,
          currency: data.currency,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Update profile error:', error);
        return { success: false, error: 'updateFailed' };
      }

      const updatedProfile = { ...user, ...data };
      setUser(updatedProfile);
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'connectionRequired' };
    }
  }, [user]);

  const refreshUserStatus = useCallback(async () => {
    if (!user) return;

    try {
      const profile = await fetchProfile(user.id);
      if (profile) {
        setUser(profile);
      }
    } catch (error) {
      console.error('Refresh user status error:', error);
    }
  }, [user, fetchProfile]);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    isPending: user?.status === 'pending',
    isActive: user?.status === 'active',
    isBlocked: user?.status === 'blocked',
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateProfile,
    refreshUserStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
