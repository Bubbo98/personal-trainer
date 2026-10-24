import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiLink, FiMail, FiMessageCircle, FiPhone, FiPlus, FiUsers } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import Pills from '../../../components/ui/Pills';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { copyText } from '../../../lib/clipboard';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate } from '../../../lib/format';
import SearchInput from '../components/SearchInput';
import { adminKeys, useTrialTemplates, useTrials } from '../queries';
import { KindBadge, TrialStateBadge } from './badges';
import FreeSessionModal from './FreeSessionModal';
import { filterTrials, whatsappUrl, type TrialFilter } from './helpers';
import { TRIAL_STATUSES, trialName, type Trial, type TrialStatus } from './types';

const FILTERS: TrialFilter[] = ['to_call', 'running', 'done', 'all'];

/** Phone, WhatsApp and email of a trial, as links. */
export const ContactLinks = ({ trial }: { trial: Trial }) => {
  const { t } = useTranslation('admin');
  const whatsapp = whatsappUrl(trial.phone);
  if (!trial.phone && !trial.email) return <p className="text-xs text-gray-400">{t('trials.noContacts')}</p>;
  const link = 'inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 hover:underline';
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {trial.phone && (
        <a href={`tel:${trial.phone.replace(/\s/g, '')}`} className={link}>
          <FiPhone className="w-4 h-4" aria-hidden />
          {trial.phone}
        </a>
      )}
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${link} text-green-700`}>
          <FiMessageCircle className="w-4 h-4" aria-hidden />
          WhatsApp
        </a>
      )}
      {trial.email && (
        <a href={`mailto:${trial.email}`} className={`${link} break-all`}>
          <FiMail className="w-4 h-4" aria-hidden />
          {trial.email}
        </a>
      )}
    </div>
  );
};

/** Who is trying the method: free sessions and online signups, the ones to call back first. */
const PeopleList = () => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const trials = useTrials();
  const templates = useTrialTemplates();
  const [filter, setFilter] = useState<TrialFilter>('to_call');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const shown = useMemo(() => filterTrials(trials.data ?? [], filter, search), [trials.data, filter, search]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f, filterTrials(trials.data ?? [], f, '').length])) as Record<TrialFilter, number>,
    [trials.data],
  );

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TrialStatus }) => adminApi.put(`/admin/trials/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.trials }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const copyLink = async (trial: Trial) => {
    try {
      const { loginUrl } = await adminApi.get<{ loginUrl: string }>(`/admin/trials/${trial.id}/link`);
      if (await copyText(loginUrl)) toast.success(t('trials.share.copied'));
      else toast.info(t('trials.share.notCopiedUrl', { url: loginUrl }));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (trials.isPending) return <LoadingState />;
  if (trials.isError) return <ErrorState message={errorMessage(trials.error)} onRetry={() => trials.refetch()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('trials.people.title')}</h2>
          <p className="text-sm text-gray-600">{t('trials.people.subtitle')}</p>
        </div>
        <Button onClick={() => setCreating(true)} icon={<FiPlus className="w-5 h-5" aria-hidden />} disabled={templates.isPending}>
          {t('trials.people.newFreeSession')}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Pills
          label={t('trials.people.filterLabel')}
          className=""
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ value: f, label: t(`trials.people.filters.${f}`), count: counts[f] }))}
        />
        <div className="lg:ml-auto lg:w-72">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} label={t('trials.people.search')} placeholder={t('trials.people.search')} />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<FiUsers className="w-10 h-10" aria-hidden />} title={t('trials.people.empty')} message={t('trials.people.emptyHint')} />
      ) : (
        <ul className="space-y-3">
          {shown.map((trial) => (
            <li key={trial.id} className="bg-white rounded-xl shadow p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/trials/${trial.id}`} className="text-base font-semibold text-gray-900 hover:underline">
                      {trialName(trial) || t('trials.noName')}
                    </Link>
                    <KindBadge kind={trial.kind} />
                    <TrialStateBadge trial={trial} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {[
                      trial.templateName,
                      trial.score !== null ? t('trials.scoreValue', { score: trial.score }) : null,
                      t('trials.createdOn', { date: formatDate(trial.createdAt) }),
                      trial.state !== 'not_opened' && trial.state !== 'link_expired' ? t('trials.logCount', { count: trial.logCount }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    aria-label={t('trials.fields.status')}
                    value={trial.status}
                    onChange={(e) => setStatus.mutate({ id: trial.id, status: e.target.value as TrialStatus })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                  >
                    {TRIAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`trials.status.${s}`)}
                      </option>
                    ))}
                  </select>
                  {trial.userId && (
                    <button type="button" onClick={() => copyLink(trial)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50" title={t('trials.share.copy')} aria-label={t('trials.share.copy')}>
                      <FiLink className="w-4 h-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
              <ContactLinks trial={trial} />
              {trial.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-line">{trial.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      {creating && templates.data && <FreeSessionModal templates={templates.data} onClose={() => setCreating(false)} />}
    </div>
  );
};

export default PeopleList;
