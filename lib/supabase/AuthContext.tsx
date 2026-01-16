import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './client';

interface User {
  id: string;
  phone: string;
  shop_name: string;
  shop_address: string;
  shop_logo_url: string;
  language: string;
  currency: string;
  status: 'pending' | 'active' | 'blocked';
  activated_at?: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPending: boolean;
  isActive: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
  login: (phone: string, password: string, stayConnected: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  refreshUserStatus: () => Promise<void>;
}

interface RegisterData {
  phone: string;
  password: string;
  shopName?: string;
  shopAddress?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@fatora_user';
const SESSION_STORAGE_KEY = '@fatora_session';

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16) + '_' + password.length + '_' + btoa(password).slice(0, 10);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const [sessionData, cachedUser] = await Promise.all([
        AsyncStorage.getItem(SESSION_STORAGE_KEY),
        AsyncStorage.getItem(USER_STORAGE_KEY)
      ]);

      if (sessionData) {
        const { userId, stayConnected, timestamp } = JSON.parse(sessionData);
        const daysSinceLogin = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

        if (stayConnected || daysSinceLogin < 1) {
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
            setIsLoading(false);
          }

          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (data && !error) {
            setUser(data);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
          } else {
            await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, USER_STORAGE_KEY]);
            setUser(null);
          }
        } else {
          await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, USER_STORAGE_KEY]);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (phone: string, password: string, stayConnected: boolean) => {
    try {
      const normalizedPhone = phone.replace(/\s/g, '');
      const passwordHash = hashPassword(password);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (error) {
        return { success: false, error: 'connectionRequired' };
      }

      if (!data) {
        return { success: false, error: 'invalidPhone' };
      }

      if (data.password_hash !== passwordHash) {
        return { success: false, error: 'wrongPassword' };
      }

      setUser(data);
      await Promise.all([
        AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          userId: data.id,
          stayConnected,
          timestamp: Date.now(),
        })),
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data))
      ]);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'connectionRequired' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const normalizedPhone = data.phone.replace(/\s/g, '');

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: 'phoneAlreadyUsed' };
      }

      const passwordHash = hashPassword(data.password);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          phone: normalizedPhone,
          password_hash: passwordHash,
          shop_name: data.shopName || '',
          shop_address: data.shopAddress || '',
        })
        .select()
        .single();

      if (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'connectionRequired' };
      }

      setUser(newUser);
      await Promise.all([
        AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          userId: newUser.id,
          stayConnected: true,
          timestamp: Date.now(),
        })),
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
      ]);

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'connectionRequired' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, USER_STORAGE_KEY]);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          shop_name: data.shop_name,
          shop_address: data.shop_address,
          shop_logo_url: data.shop_logo_url,
          language: data.language,
          currency: data.currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: 'connectionRequired' };
      }

      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'connectionRequired' };
    }
  }, [user]);

  const refreshUserStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data && !error) {
        setUser(data);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Refresh user status error:', error);
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
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
