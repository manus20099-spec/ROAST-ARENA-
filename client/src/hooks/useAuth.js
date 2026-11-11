import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

/**
 * Returns the currently authenticated user (or null).
 * Uses TanStack Query so the result is cached and shared app-wide.
 */
export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api.get('/api/auth/me').then((r) => r?.user ?? null),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return { user: user ?? null, isLoading };
}
