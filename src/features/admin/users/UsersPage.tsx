import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiCheck, FiEdit3, FiLink, FiMessageSquare, FiPlus, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { copyText } from '../../../lib/clipboard';
import { useErrorMessage } from '../../../lib/errors';
import { formatDateTime } from '../../../lib/format';
import { ExpiryBadge } from '../components/badges';
import SearchInput from '../components/SearchInput';
import CheckinsPanel from '../checkins/CheckinsPanel';
import { adminKeys, useTrainers, useUnreadCheckins, useUsers } from '../queries';
import { displayName, type AdminUser, type CreateUserInput, type UpdateUserInput } from '../types';
import UserFormModal from './UserFormModal';
import { DEFAULT_TRAINER_ID, filterUsers, type List } from './filterUsers';

const PlanBadges = ({ user }: { user: AdminUser }) => {
  const { t } = useTranslation('admin');
  return user.pdf ? (
    <>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        <FiCheck className="w-3 h-3" aria-hidden />
        {t('users.hasPlan')}
      </span>
      <ExpiryBadge date={user.pdf.expirationDate} compact />
    </>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      <FiX className="w-3 h-3" aria-hidden />
      {t('users.noPlan')}
    </span>
  );
};

interface RowActions {
  copyLink: (user: AdminUser, review?: boolean) => void;
  edit: (user: AdminUser) => void;
  remove: (user: AdminUser) => void;
}

const ActionButtons = ({ user, actions, large }: { user: AdminUser; actions: RowActions; large?: boolean }) => {
  const { t } = useTranslation('admin');
  const size = large ? 'w-5 h-5' : 'w-4 h-4';
  const base = large ? 'p-2 rounded-lg' : 'p-1.5 rounded-lg';
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => actions.copyLink(user)} className={`${base} text-blue-600 hover:bg-blue-50`} title={t('users.copyLink')} aria-label={t('users.copyLink')}>
        <FiLink className={size} aria-hidden />
      </button>
      <button type="button" onClick={() => actions.copyLink(user, true)} className={`${base} text-yellow-600 hover:bg-yellow-50`} title={t('users.copyReviewLink')} aria-label={t('users.copyReviewLink')}>
        <FiStar className={size} aria-hidden />
      </button>
      <button type="button" onClick={() => actions.edit(user)} className={`${base} text-green-600 hover:bg-green-50`} title={t('users.edit')} aria-label={t('users.edit')}>
        <FiEdit3 className={size} aria-hidden />
      </button>
      <button type="button" onClick={() => actions.remove(user)} className={`${base} text-red-600 hover:bg-red-50`} title={t('users.delete')} aria-label={t('users.delete')}>
        <FiTrash2 className={size} aria-hidden />
      </button>
    </div>
  );
};

const UsersTable = ({ users, actions, emptyText }: { users: AdminUser[]; actions: RowActions; emptyText: string }) => {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-3">{t('users.columns.user')}</th>
              <th scope="col" className="px-6 py-3">{t('users.columns.content')}</th>
              <th scope="col" className="px-6 py-3">{t('users.columns.lastLogin')}</th>
              <th scope="col" className="px-6 py-3">{t('users.columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/users/${user.id}`)}>
                <td className="px-6 py-4">
                  <Link to={`/admin/users/${user.id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-gray-900 hover:underline">
                    {displayName(user)}
                  </Link>
                  <div className="text-sm text-gray-500">{[user.username, user.email].filter(Boolean).join(' • ')}</div>
                  <div className="text-xs text-gray-400">{t('users.createdOn', { date: formatDateTime(user.createdAt) })}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{t('users.videoCount', { count: user.videoCount })}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <PlanBadges user={user} />
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.lastLogin ? formatDateTime(user.lastLogin) : t('users.never')}</td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <ActionButtons user={user} actions={actions} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Phones and tablets */}
      <ul className="lg:hidden space-y-4">
        {users.map((user) => (
          <li key={user.id} className="bg-white rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900">{displayName(user)}</p>
                <p className="text-sm text-gray-500 mt-1">{user.username}</p>
                {user.email && <p className="text-xs text-gray-400 mt-0.5 break-all">{user.email}</p>}
              </div>
              <ActionButtons user={user} actions={actions} large />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-700">{t('users.videoCount', { count: user.videoCount })}</span>
              <PlanBadges user={user} />
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>{t('users.lastLogin', { date: user.lastLogin ? formatDateTime(user.lastLogin) : t('users.never') })}</p>
              <p>{t('users.createdOn', { date: formatDateTime(user.createdAt) })}</p>
            </div>
            <Link to={`/admin/users/${user.id}`} className="block w-full text-center bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
              {t('users.manage')}
            </Link>
          </li>
        ))}
        {users.length === 0 && <li className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">{emptyText}</li>}
      </ul>
    </>
  );
};

/** Clients by trainer: paying, non-paying and their check-ins. */
const UsersPage = () => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const users = useUsers();
  const trainers = useTrainers();
  const [trainerId, setTrainerId] = useState(DEFAULT_TRAINER_ID);
  const [list, setList] = useState<List>('paying');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; user: AdminUser } | null>(null);
  const unread = useUnreadCheckins(trainerId);

  const trainerUsers = useMemo(() => (users.data ?? []).filter((u) => (u.trainerId || DEFAULT_TRAINER_ID) === trainerId), [users.data, trainerId]);
  const shown = useMemo(() => filterUsers(users.data ?? [], { trainerId, list, search }), [users.data, trainerId, list, search]);

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: adminKeys.users });

  /** Copies a URL, or shows it when the clipboard is blocked. */
  const copyOrShow = async (url: string, copiedMessage: string, fallbackMessage: string) => {
    if (await copyText(url)) toast.success(copiedMessage);
    else toast.info(fallbackMessage);
  };

  const copyLink = async (user: AdminUser, review = false) => {
    try {
      const { loginUrl } = await adminApi.post<{ loginUrl: string }>(`/admin/users/${user.id}/generate-link`);
      const url = review ? `${loginUrl}?tab=reviews` : loginUrl;
      await copyOrShow(url, t('users.linkCopied'), t('users.linkNotCopied', { url }));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const create = useMutation({
    mutationFn: (input: CreateUserInput) => adminApi.post<{ loginUrl: string; reactivated?: boolean }>('/admin/users', input),
    onSuccess: async ({ loginUrl, reactivated }) => {
      setModal(null);
      refreshUsers();
      await copyOrShow(loginUrl, reactivated ? t('users.reactivated') : t('users.created'), t('users.createdNoCopy', { url: loginUrl }));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateUserInput }) => adminApi.put(`/admin/users/${id}`, input),
    onSuccess: () => {
      setModal(null);
      refreshUsers();
      toast.success(t('users.updated'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = async (user: AdminUser) => {
    const name = displayName(user);
    if (!(await confirm({ title: t('users.deleteTitle', { name }), message: t('users.deleteMessage'), confirmLabel: t('actions.delete'), danger: true }))) return;
    try {
      await adminApi.delete(`/admin/users/${user.id}`);
      refreshUsers();
      toast.success(t('users.deleted'));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (users.isPending || trainers.isPending) return <LoadingState />;
  if (users.isError) return <ErrorState message={errorMessage(users.error)} onRetry={() => users.refetch()} />;

  const trainerList = trainers.data ?? [];
  const unreadCount = unread.data ?? 0;
  const lists: { id: List; label: string }[] = [
    { id: 'paying', label: t('users.paying', { count: trainerUsers.filter((u) => u.isPaying).length }) },
    { id: 'nonPaying', label: t('users.nonPaying', { count: trainerUsers.filter((u) => !u.isPaying).length }) },
    { id: 'checks', label: t('users.checks') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('users.title')}</h2>
        <Button onClick={() => setModal({ mode: 'create' })} icon={<FiPlus className="w-4 h-4" aria-hidden />}>
          {t('users.newUser')}
        </Button>
      </div>

      <div role="group" aria-label={t('users.trainersLabel')} className="flex gap-1 bg-gray-800 p-1 rounded-lg">
        {trainerList.map((trainer) => (
          <button
            key={trainer.id}
            type="button"
            aria-pressed={trainerId === trainer.id}
            onClick={() => setTrainerId(trainer.id)}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${trainerId === trainer.id ? 'bg-white text-gray-900 shadow' : 'text-gray-300 hover:text-white'}`}
          >
            {t('users.trainerTab', {
              name: trainer.name,
              count: (users.data ?? []).filter((u) => (u.trainerId || DEFAULT_TRAINER_ID) === trainer.id).length,
            })}
          </button>
        ))}
      </div>

      <div role="group" aria-label={t('users.listsLabel')} className="flex gap-1 bg-gray-200 p-1 rounded-lg">
        {lists.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={list === item.id}
            onClick={() => {
              setList(item.id);
              if (item.id === 'checks') queryClient.invalidateQueries({ queryKey: adminKeys.checkins });
            }}
            className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
              list === item.id ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {item.id === 'checks' && <FiMessageSquare className="w-4 h-4" aria-hidden />}
            <span>{item.label}</span>
            {item.id === 'checks' && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                <span aria-hidden>{unreadCount > 99 ? '99+' : unreadCount}</span>
                <span className="sr-only">{t('users.unreadChecks', { count: unreadCount })}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {list === 'checks' ? (
        <CheckinsPanel trainerId={trainerId} />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <SearchInput
              label={t('users.searchLabel')}
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 max-w-md"
            />
            {search && (
              <p className="text-sm text-gray-500" aria-live="polite">
                {t('users.searchCount', { shown: shown.length, total: trainerUsers.length })}
              </p>
            )}
          </div>
          <UsersTable
            users={shown}
            actions={{ copyLink, edit: (user) => setModal({ mode: 'edit', user }), remove }}
            emptyText={search ? t('users.noResults', { query: search }) : t('users.emptyTitle')}
          />
        </>
      )}

      {modal?.mode === 'create' && (
        <UserFormModal
          mode="create"
          trainers={trainerList}
          defaultTrainerId={trainerId}
          saving={create.isPending}
          onSubmit={(input) => create.mutate(input)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === 'edit' && (
        <UserFormModal
          mode="edit"
          user={modal.user}
          trainers={trainerList}
          saving={update.isPending}
          onSubmit={(input) => update.mutate({ id: modal.user.id, input })}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default UsersPage;
