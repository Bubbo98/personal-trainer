import { displayName, type AdminUser } from '../types';

export type List = 'paying' | 'nonPaying' | 'checks';

export const DEFAULT_TRAINER_ID = 1; // Joshua: users without a trainer belong to him

/** Users of a trainer and list, matching a search on name, username or email. */
export function filterUsers(users: AdminUser[], { trainerId, list, search }: { trainerId: number; list: List; search: string }) {
  const term = search.trim().toLowerCase();
  return users.filter((u) => {
    if ((u.trainerId || DEFAULT_TRAINER_ID) !== trainerId) return false;
    if (list === 'paying' && !u.isPaying) return false;
    if (list === 'nonPaying' && u.isPaying) return false;
    if (!term) return true;
    return [u.firstName, u.lastName, u.username, u.email, displayName(u)].some((v) => v?.toLowerCase().includes(term));
  });
}
