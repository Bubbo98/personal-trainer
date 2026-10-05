import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, clientApi } from '../../lib/api';
import type { SessionUser } from './types';

/**
 * The client's session. A login link (/dashboard/:token) is exchanged for a
 * session token kept in localStorage; later visits verify the stored token.
 */
export function useSession(linkToken: string | undefined) {
  const queryClient = useQueryClient();
  // The link token only matters on arrival: the URL is cleaned right after
  const [initialLink] = useState(linkToken);

  const session = useQuery({
    queryKey: ['client', 'session'],
    queryFn: async (): Promise<SessionUser> => {
      if (initialLink) {
        const { token, user } = await clientApi.post<{ token: string; user: SessionUser }>('/auth/login-link', { token: initialLink });
        clientApi.setToken(token);
        return user;
      }
      if (!clientApi.hasToken()) throw new ApiError('No session', 401);
      return (await clientApi.get<{ user: SessionUser }>('/auth/verify')).user;
    },
    staleTime: Infinity,
    retry: false,
  });

  const logout = () => {
    clientApi.clearToken();
    queryClient.removeQueries({ queryKey: ['client'] });
  };

  return { ...session, logout };
}
