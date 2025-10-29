import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData } from '@/types';
import { authAPI, setAccessToken } from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  partialToken: string | null;
  pendingOTP: boolean;

  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithOTP: (code: string) => Promise<void>;
  loginWithGoogle: () => void;
  loginWithGitHub: () => void;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      partialToken: null,
      pendingOTP: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setAccessToken: (token) => {
        set({ accessToken: token });
        setAccessToken(token);
      },

      login: async (credentials) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.login(credentials);

          if ('partialToken' in response) {
            set({
              partialToken: response.partialToken,
              pendingOTP: true,
              isLoading: false,
            });
          } else {
            const { accessToken, user } = response;
            get().setAccessToken(accessToken);
            set({
              user,
              isAuthenticated: true,
              pendingOTP: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithOTP: async (code) => {
        try {
          set({ isLoading: true });
          const { partialToken } = get();

          if (!partialToken) {
            throw new Error('No partial token found');
          }

          const response = await authAPI.loginWithOTP({ code, partialToken });
          const { accessToken, user } = response;

          get().setAccessToken(accessToken);
          set({
            user,
            isAuthenticated: true,
            pendingOTP: false,
            partialToken: null,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithGoogle: () => {
        authAPI.loginWithGoogle();
      },

      loginWithGitHub: () => {
        authAPI.loginWithGitHub();
      },

      register: async (data) => {
        try {
          set({ isLoading: true });
          await authAPI.register(data);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
        }
      },

      refreshUser: async () => {
        try {
          const user = await authAPI.getCurrentUser();
          set({ user, isAuthenticated: true });
        } catch (error) {
          get().clearAuth();
          throw error;
        }
      },

      clearAuth: () => {
        get().setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          partialToken: null,
          pendingOTP: false,
        });
      },
    }),
    {
      name: '8care-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
      },
    },
  ),
);
