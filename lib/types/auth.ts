export interface Profile {
  id: string;
  phone: string | null;
  shop_name: string;
  shop_address: string;
  shop_logo_url: string;
  language: 'fr' | 'ar';
  currency: string;
  status: 'pending' | 'active' | 'blocked';
  role: 'user' | 'admin';
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterData {
  phone: string;
  password: string;
  shopName?: string;
  shopAddress?: string;
}

export interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPending: boolean;
  isActive: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
}
