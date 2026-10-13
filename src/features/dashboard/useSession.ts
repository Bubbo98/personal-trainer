import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, clientApi, tokenStore } from '../../lib/api';
import type { SessionUser } from './types';

/** The client's personal link, kept so an expired session renews itself instead of locking them out. */
export const CLIENT_LINK_KEY = 'dashboard_link';

const loginWithLink = async (link: string): Promise<SessionUser> => {
  const { token, user } = await clientApi.post<{ token: string; user: SessionUser }>('/auth/login-link', { token: link });
  clientApi.setToken(token);
  tokenStore.set(CLIENT_LINK_KEY, link);
  return user;
};

/** Expired session, invalid link, plan over: retrying won't help. Server hiccups (5xx) and lost signal will. */
const isFinal = (error: unknown) => error instanceof ApiError && error.status >= 400 && error.status < 500;

/**
 * The client's session. A login link (/dashboard/:token) is exchanged for a
 * session token kept in localStorage; later visits verify the stored token and,
 * once it expires, log in again with the stored link.
 */
export function useSession(linkToken: string | undefined) {
  const queryClient = useQueryClient();
  // The link token only matters on arrival: the URL is cleaned right after
  const [initialLink] = useState(linkToken);

  const session = useQuery({
    queryKey: ['client', 'session'],
    queryFn: async (): Promise<SessionUser> => {
      if (initialLink) return loginWithLink(initialLink);

      const storedLink = tokenStore.get(CLIENT_LINK_KEY);
      if (clientApi.hasToken()) {
        try {
          return (await clientApi.get<{ user: SessionUser }>('/auth/verify')).user;
        } catch (err) {
          if (!(storedLink && err instanceof ApiError && err.status === 401)) throw err;
        }
      }
      if (storedLink) return loginWithLink(storedLink);
      throw new ApiError('No session', 401);
    },
    staleTime: Infinity,
    retry: (failures, error) => failures < 2 && !isFinal(error),
  });

  const logout = () => {
    clientApi.clearToken();
    tokenStore.clear(CLIENT_LINK_KEY);
    queryClient.removeQueries({ queryKey: ['client'] });
  };

  return { ...session, logout };
}
