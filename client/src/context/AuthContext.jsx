import { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth as useAuthQuery } from '../hooks/useAuth.js';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuthQuery();

  const login = useCallback(
    async (email, password) => {
      await api.post('/api/auth/login', { email, password });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    [queryClient]
  );

  const signup = useCallback(
    async (data) => {
      await api.post('/api/auth/signup', data);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout', {});
    queryClient.setQueryData(['me'], null);
    queryClient.invalidateQueries({ queryKey: ['me'] });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Returns { user, isLoading, login, logout, signup }.
 * Use this throughout the app instead of importing useAuth from hooks/.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
