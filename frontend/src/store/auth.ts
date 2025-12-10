import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  userId: string;
  email: string;
  role: string;
  agencyId?: string;
  clientId?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    agencyName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const result = await api.login(email, password);
    api.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    set({ user: result.user, isAuthenticated: true });
  },

  register: async (data) => {
    const result = await api.register(data);
    api.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    set({ user: result.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      // Ignore logout errors
    }
    api.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      api.loadTokens();
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
