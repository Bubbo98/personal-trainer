import { useDeferredValue, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FiCalendar, FiChevronDown, FiFilter, FiMessageSquare, FiTrash2, FiUsers } from 'react-icons/fi';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { inputClass } from '../../../components/ui/Field';
import Spinner from '../../../components/ui/Spinner';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate } from '../../../lib/format';
import { AnswerBadge } from '../components/badges';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import { adminKeys, useCheckinPage, useCheckinUsers, useUserCheckins, type CheckinFilters } from '../queries';
import type { Checkin, CheckinUserSummary } from '../types';
import CheckinDetailModal from './CheckinDetailModal';
import { firstOfPlanIds } from './checkinUtils';

type View = 'timeline' | 'user';

const fullName = (first: string | null, last: string | null, fallback: string) => [first, last].filter(Boolean).join(' ') || fallback;

const NewBadge = () => {
  const { t } = useTranslation('admin');
  return <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase">{t('checkins.new')}</span>;
};

const FirstBadge = () => {
  const { t } = useTranslation('admin');
  return (
    <span title={t('checkins.firstOfPlanTitle')} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white uppercase">
      {t('checkins.firstOfPlan')}
    </span>
  );
};

/** Opening a new check-in marks it as seen (the client gets an email) and refreshes counts. */
function useOpenCheckin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Checkin | null>(null);
  const openCheckin = (checkin: Checkin) => {
    setOpen(checkin);
    if (!checkin.trainer_seen_at) {
      adminApi
        .post(`/feedback/admin/${checkin.id}/mark-seen`)
        .then(() => queryClient.invalidateQueries({ queryKey: adminKeys.checkins }))
        .catch(() => {
          /* stays "new": marked next time it's opened */
        });
    }
  };
  return { open, openCheckin, close: () => setOpen(null) };
}

const UserCheckins = ({ userId, onOpen, onDelete }: { userId: number; onOpen: (c: Checkin) => void; onDelete: (c: Checkin) => void }) => {
  const { t } = useTranslation('admin');
  const checkins = useUserCheckins(userId);
  if (checkins.isPending) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }
  const list = checkins.data ?? [];
  const firsts = firstOfPlanIds(list);
  return (
    <ul className="divide-y divide-gray-200">
      {list.map((checkin) => {
        const isNew = !checkin.trainer_seen_at;
        return (
          <li key={checkin.id} className={`flex items-start gap-3 p-4 hover:bg-gray-100 ${isNew ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
            <button type="button" onClick={() => onOpen(checkin)} className="flex-1 text-left">
              <span className="flex flex-wrap items-center gap-2 mb-2">
                {isNew && <NewBadge />}
                {firsts.has(checkin.id) && <FirstBadge />}
                <span className={`text-sm ${isNew ? 'font-bold' : 'font-medium'} text-gray-900`}>{formatDate(checkin.feedback_date)}</span>
                {checkin.physical_discomfort !== 'none' && <AnswerBadge kind="discomfort" value={checkin.physical_discomfort} />}
                {!isNew && <span className="text-green-600 text-xs font-medium">✓ {t('checkins.seen')}</span>}
              </span>
              <span className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1.5 text-xs sm:text-sm">
                <span>
                  <span className="text-gray-500">{t('checkins.labels.energy')}: </span>
                  <AnswerBadge kind="energy" value={checkin.energy_level} />
                </span>
                <span>
                  <span className="text-gray-500">{t('checkins.labels.workouts')}: </span>
                  <AnswerBadge kind="workouts" value={checkin.workouts_completed} />
                </span>
                <span>
                  <span className="text-gray-500">{t('checkins.labels.sleep')}: </span>
                  <AnswerBadge kind="sleep" value={checkin.sleep_quality} />
                </span>
                {checkin.current_weight != null && (
                  <span>
                    <span className="text-gray-500">{t('checkins.columns.weight')}: </span>
                    <span className="font-semibold text-gray-900">{checkin.current_weight} kg</span>
                  </span>
                )}
              </span>
            </button>
            <button type="button" onClick={() => onDelete(checkin)} className="text-red-600 hover:text-red-800 p-2" aria-label={t('checkins.delete')}>
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const UserSummaryCard = ({ summary, onOpen, onDelete }: { summary: CheckinUserSummary; onOpen: (c: Checkin) => void; onDelete: (c: Checkin) => void }) => {
  const { t } = useTranslation('admin');
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  return (
    <article className="bg-white rounded-xl shadow-lg overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
        className={`w-full text-left p-4 transition-colors hover:bg-gray-50 ${summary.last_physical_discomfort === 'significant' ? 'bg-red-50' : ''}`}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex-1 min-w-0">
            <span className="flex items-center flex-wrap gap-2 mb-1">
              <span className="text-base font-bold text-gray-900">{fullName(summary.first_name, summary.last_name, summary.username)}</span>
              {summary.last_physical_discomfort !== 'none' && <AnswerBadge kind="discomfort" value={summary.last_physical_discomfort} />}
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{t('checkins.total', { count: summary.total_feedbacks })}</span>
            </span>
            <span className="block text-xs text-gray-500 mb-3 truncate">{[summary.username, summary.email].filter(Boolean).join(' · ')}</span>
            <span className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <span className="px-3 py-2 rounded-xl bg-gray-50">
                <span className="block text-xs text-gray-500 mb-1">{t('checkins.labels.energy')}</span>
                <AnswerBadge kind="energy" value={summary.last_energy_level} />
              </span>
              <span className="px-3 py-2 rounded-xl bg-gray-50">
                <span className="block text-xs text-gray-500 mb-1">{t('checkins.labels.motivation')}</span>
                <AnswerBadge kind="motivation" value={summary.last_motivation_level} />
              </span>
              <span className="px-3 py-2 rounded-xl bg-gray-50">
                <span className="block text-xs text-gray-500 mb-1">{t('checkins.lastCheck')}</span>
                <span className="text-xs font-medium text-gray-900">{formatDate(summary.last_feedback_date)}</span>
              </span>
              {summary.last_current_weight != null && (
                <span className="px-3 py-2 rounded-xl bg-blue-50">
                  <span className="block text-xs text-gray-500 mb-1">{t('checkins.columns.weight')}</span>
                  <span className="text-xs font-bold text-blue-800">{summary.last_current_weight} kg</span>
                </span>
              )}
            </span>
          </span>
          <FiChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {expanded && (
        <div id={panelId} className="border-t border-gray-200 bg-gray-50">
          <UserCheckins userId={summary.user_id} onOpen={onOpen} onDelete={onDelete} />
        </div>
      )}
    </article>
  );
};

/** Weekly check-ins of a trainer's clients: timeline or grouped by client. */
const CheckinsPanel = ({ trainerId }: { trainerId: number }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('timeline');
  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput.trim());
  const [discomfort, setDiscomfort] = useState<CheckinFilters['discomfort']>('all');
  const [page, setPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const { open, openCheckin, close } = useOpenCheckin();

  const timeline = useCheckinPage({ trainerId, page, search, discomfort }, view === 'timeline');
  const byUser = useCheckinUsers({ trainerId, page: userPage, search, discomfort }, view === 'user');

  const changeFilters = (apply: () => void) => {
    apply();
    setPage(1);
    setUserPage(1);
  };

  const remove = async (checkin: Checkin) => {
    if (!(await confirm({ title: t('checkins.deleteTitle'), confirmLabel: t('actions.delete'), danger: true }))) return;
    try {
      await adminApi.delete(`/feedback/${checkin.id}`);
      close();
      queryClient.invalidateQueries({ queryKey: adminKeys.checkins });
      toast.success(t('checkins.deleted'));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const stats = timeline.data?.stats;
  const views: { id: View; label: string; icon: typeof FiCalendar }[] = [
    { id: 'timeline', label: t('checkins.timeline'), icon: FiCalendar },
    { id: 'user', label: t('checkins.byUser'), icon: FiUsers },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('checkins.title')}</h2>
        {stats && (
          <p className="flex items-center gap-2 text-gray-600 font-medium">
            <FiMessageSquare className="w-5 h-5" aria-hidden />
            {t('checkins.total', { count: stats.total })}
          </p>
        )}
      </div>

      {stats && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(
            [
              ['total', stats.total, 'text-gray-900'],
              ['withDiscomfort', stats.withDiscomfort, 'text-orange-600'],
              ['lowMotivation', stats.lowMotivation, 'text-red-600'],
              ['missedWorkouts', stats.missedWorkouts, 'text-red-600'],
            ] as const
          ).map(([key, value, color]) => (
            <div key={key} className="bg-white rounded-xl shadow p-4 flex flex-col-reverse">
              <dt className="text-sm text-gray-600">{t(`checkins.stats.${key}`)}</dt>
              <dd className={`text-2xl font-bold ${color}`}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div role="group" aria-label={t('checkins.viewsLabel')} className="flex items-center justify-center gap-2 bg-white rounded-xl shadow p-1">
        {views.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${view === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Icon className="w-4 h-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          label={t('checkins.searchLabel')}
          placeholder={t('checkins.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => changeFilters(() => setSearchInput(e.target.value))}
          className="flex-1"
        />
        <label className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-500" aria-hidden />
          <span className="sr-only">{t('checkins.filterLabel')}</span>
          <select
            value={discomfort}
            onChange={(e) => changeFilters(() => setDiscomfort(e.target.value as CheckinFilters['discomfort']))}
            className={`${inputClass} appearance-none pr-10 select-arrow`}
          >
            {(['all', 'none', 'has_issues'] as const).map((value) => (
              <option key={value} value={value}>
                {t(`checkins.filter.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === 'timeline' ? (
        timeline.isPending ? (
          <LoadingState />
        ) : timeline.isError ? (
          <ErrorState message={errorMessage(timeline.error)} onRetry={() => timeline.refetch()} />
        ) : timeline.data.feedbacks.length === 0 ? (
          <p className="bg-white rounded-xl shadow-lg text-center py-12 text-gray-500">{t('checkins.empty')}</p>
        ) : (
          <div className={`bg-white rounded-xl shadow-lg overflow-hidden transition-opacity ${timeline.isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3 text-left">{t('checkins.columns.date')}</th>
                  <th scope="col" className="px-6 py-3 text-left">{t('checkins.columns.user')}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t('checkins.columns.energy')}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t('checkins.columns.workouts')}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t('checkins.columns.motivation')}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t('checkins.columns.discomfort')}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t('checkins.columns.weight')}</th>
                  <th scope="col" className="px-4 py-3 text-center"><span className="sr-only">{t('checkins.columns.actions')}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {timeline.data.feedbacks.map((checkin) => {
                  const isNew = !checkin.trainer_seen_at;
                  const name = fullName(checkin.user_first_name, checkin.user_last_name, checkin.username);
                  return (
                    <tr
                      key={checkin.id}
                      onClick={() => openCheckin(checkin)}
                      className={`grid grid-cols-3 gap-2 p-4 md:table-row md:p-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isNew ? 'bg-blue-50 border-l-4 border-l-blue-500' : checkin.physical_discomfort === 'significant' ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="col-span-3 md:px-6 md:py-4 text-sm text-gray-900 whitespace-nowrap">
                        <span className="flex flex-wrap items-center gap-2">
                          {isNew && <NewBadge />}
                          {!!checkin.is_first_of_scheda && <FirstBadge />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCheckin(checkin);
                            }}
                            aria-label={t('checkins.open', { name, date: formatDate(checkin.feedback_date) })}
                            className="hover:underline"
                          >
                            {formatDate(checkin.feedback_date)}
                          </button>
                          <span className="md:hidden font-semibold">· {name}</span>
                          {!isNew && <span className="text-green-500 text-xs" title={t('checkins.seen')}>✓</span>}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                        <span className={`block text-sm text-gray-900 ${isNew ? 'font-bold' : 'font-medium'}`}>{name}</span>
                        <span className="block text-xs text-gray-500">{checkin.email}</span>
                      </td>
                      <td className="md:px-4 md:py-4 md:text-center"><AnswerBadge kind="energy" value={checkin.energy_level} /></td>
                      <td className="md:px-4 md:py-4 md:text-center"><AnswerBadge kind="workouts" value={checkin.workouts_completed} /></td>
                      <td className="md:px-4 md:py-4 md:text-center"><AnswerBadge kind="motivation" value={checkin.motivation_level} /></td>
                      <td className="md:px-4 md:py-4 md:text-center"><AnswerBadge kind="discomfort" value={checkin.physical_discomfort} /></td>
                      <td className="md:px-4 md:py-4 md:text-center text-sm font-medium text-gray-900">
                        {checkin.current_weight != null ? `${checkin.current_weight} kg` : '—'}
                      </td>
                      <td className="md:px-4 md:py-4 md:text-center text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(checkin);
                          }}
                          className="text-red-600 hover:text-red-800 p-2"
                          aria-label={t('checkins.delete')}
                        >
                          <FiTrash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} pages={timeline.data.totalPages} total={timeline.data.total} onChange={setPage} />
          </div>
        )
      ) : byUser.isPending ? (
        <LoadingState />
      ) : byUser.isError ? (
        <ErrorState message={errorMessage(byUser.error)} onRetry={() => byUser.refetch()} />
      ) : byUser.data.users.length === 0 ? (
        <p className="bg-white rounded-xl shadow-lg text-center py-12 text-gray-500">{t('checkins.empty')}</p>
      ) : (
        <div className={`space-y-4 transition-opacity ${byUser.isPlaceholderData ? 'opacity-60' : ''}`}>
          {byUser.data.users.map((summary) => (
            <UserSummaryCard key={summary.user_id} summary={summary} onOpen={openCheckin} onDelete={remove} />
          ))}
          {byUser.data.totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <Pagination page={userPage} pages={byUser.data.totalPages} total={byUser.data.total} onChange={setUserPage} />
            </div>
          )}
        </div>
      )}

      {open && <CheckinDetailModal checkin={open} onClose={close} />}
    </div>
  );
};

export default CheckinsPanel;
