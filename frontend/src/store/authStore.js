import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      token: null,
      refreshToken: null,
      user: null,

      // Actions
      setAuth: (accessToken, refreshToken, user) => {
        set({
          token: accessToken,
          refreshToken,
          user,
        });
      },

      setToken: (token) => {
        set({ token });
      },

      setUser: (user) => {
        set({ user });
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
        });
      },

      // Getters
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'admin',
      isAffiliate: () => get().user?.role === 'affiliate',
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
