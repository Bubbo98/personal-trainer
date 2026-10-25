import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiClock, FiTrash2 } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { SelectField, TextAreaField, TextField } from '../../../components/ui/Field';
import { Alert, ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate, formatDateTime } from '../../../lib/format';
import { adminKeys, useTrials } from '../queries';
import { KindBadge, TrialStateBadge } from './badges';
import { ShareLink } from './FreeSessionModal';
import { ContactLinks } from './PeopleList';
import PlanTabs from './PlanTabs';
import { TRIAL_STATUSES, trialName, type Trial, type TrialStatus } from './types';

const card = 'bg-white rounded-xl shadow-lg p-4 sm:p-6';

const ContactForm = ({ trial }: { trial: Trial }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: trial.firstName ?? '',
    lastName: trial.lastName ?? '',
    phone: trial.phone ?? '',
    email: trial.email ?? '',
    status: trial.status,
    notes: trial.notes ?? '',
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => adminApi.put<{ emailSent: boolean | null }>(`/admin/trials/${trial.id}`, form),
    // A new address of a running trial gets the access link
    onSuccess: ({ emailSent }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.trials });
      if (emailSent === true) toast.success(t('trials.detail.savedEmailSent', { email: form.email }));
      else if (emailSent === false) toast.error(t('trials.detail.savedEmailFailed', { email: form.email }));
      else toast.success(t('trials.detail.saved'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={submit} className={`${card} space-y-4`}>
      <h3 className="text-lg font-semibold text-gray-900">{t('trials.detail.contacts')}</h3>
      <ContactLinks trial={trial} />
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField label={t('trials.fields.firstName')} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        <TextField label={t('trials.fields.lastName')} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        <TextField label={t('trials.fields.phone')} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <TextField
          label={t('trials.fields.email')}
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          hint={trial.state === 'not_opened' || trial.state === 'active' ? t('trials.detail.emailHint') : undefined}
        />
      </div>
      <SelectField label={t('trials.fields.status')} value={form.status} onChange={(e) => set('status', e.target.value as TrialStatus)}>
        {TRIAL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`trials.status.${s}`)}
          </option>
        ))}
      </SelectField>
      <TextAreaField label={t('trials.fields.notes')} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      {trial.kind === 'online' && (
        <p className="text-xs text-gray-500">{trial.marketingConsent ? t('trials.detail.marketingYes') : t('trials.detail.marketingNo')}</p>
      )}
      <Button type="submit" loading={save.isPending}>
        {t('actions.saveChanges')}
      </Button>
    </form>
  );
};

const AccessCard = ({ trial }: { trial: Trial }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const link = useQuery({
    queryKey: [...adminKeys.trials, trial.id, 'link'],
    queryFn: ({ signal }) => adminApi.get<{ loginUrl: string }>(`/admin/trials/${trial.id}/link`, signal).then((d) => d.loginUrl),
    enabled: trial.userId !== null,
    staleTime: Infinity,
  });

  const extend = useMutation({
    mutationFn: (days: number) => adminApi.post(`/admin/trials/${trial.id}/extend`, { days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.trials });
      toast.success(t('trials.detail.extended'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => adminApi.delete(`/admin/trials/${trial.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.trials });
      toast.success(t('trials.detail.deleted'));
      navigate('/admin/trials');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const askRemove = async () => {
    if (await confirm({ title: t('trials.detail.deleteTitle'), message: t('trials.detail.deleteMessage'), confirmLabel: t('actions.delete'), danger: true })) remove.mutate();
  };

  const dates = [
    [t('trials.detail.created'), formatDateTime(trial.createdAt)],
    [t('trials.detail.opened'), trial.openedAt ? formatDateTime(trial.openedAt) : t('trials.detail.notYet')],
    [t('trials.detail.ends'), trial.expiresAt ? formatDateTime(trial.expiresAt) : t('trials.detail.endsAfterOpening')],
    [t('trials.detail.lastLogin'), trial.lastLogin ? formatDateTime(trial.lastLogin) : t('trials.detail.notYet')],
    [t('trials.detail.disclaimer'), trial.disclaimerAcceptedAt ? formatDateTime(trial.disclaimerAcceptedAt) : t('trials.detail.notYet')],
  ];

  return (
    <section className={`${card} space-y-4`}>
      <h3 className="text-lg font-semibold text-gray-900">{t('trials.detail.access')}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {dates.map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      {trial.userId === null ? (
        <Alert kind="info">{t('trials.detail.accountDeleted')}</Alert>
      ) : link.data ? (
        <ShareLink url={link.data} phone={trial.phone} firstName={trial.firstName} />
      ) : link.isError ? (
        <Alert kind="error">{errorMessage(link.error)}</Alert>
      ) : null}
      {trial.userId !== null && trial.state !== 'not_opened' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 flex items-center gap-1.5">
            <FiClock className="w-4 h-4" aria-hidden />
            {t('trials.detail.extend')}
          </span>
          {[3, 7].map((days) => (
            <Button key={days} size="sm" variant="secondary" loading={extend.isPending && extend.variables === days} onClick={() => extend.mutate(days)}>
              {t('trials.detail.extendDays', { count: days })}
            </Button>
          ))}
        </div>
      )}
      <div className="pt-2 border-t border-gray-100">
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" icon={<FiTrash2 className="w-4 h-4" aria-hidden />} onClick={askRemove} loading={remove.isPending}>
          {t('trials.detail.delete')}
        </Button>
      </div>
    </section>
  );
};

const AnswersCard = ({ trial }: { trial: Trial }) => {
  const { t } = useTranslation('admin');
  if (trial.answers.length === 0) return null;
  return (
    <section className={`${card} space-y-3`}>
      <h3 className="text-lg font-semibold text-gray-900">
        {t('trials.detail.answers')}
        {trial.score !== null && <span className="ml-2 text-sm font-normal text-gray-500">{t('trials.scoreValue', { score: trial.score })}</span>}
      </h3>
      <dl className="divide-y divide-gray-100">
        {trial.answers.map((a, i) => (
          <div key={i} className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1">
            <dt className="text-sm text-gray-600">{a.question}</dt>
            <dd className="text-sm font-medium text-gray-900 sm:text-right whitespace-pre-line">
              {a.days !== undefined ? (
                t('trials.daysPerWeek', { count: a.days })
              ) : (
                <>
                  {a.answer} {a.points !== undefined && <span className="text-xs text-gray-400">({t('trials.points', { count: a.points })})</span>}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

/** /admin/trials/:trialId — contacts, status, link and that person's copy of the plan. */
const TrialDetailPage = () => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const { trialId } = useParams<{ trialId: string }>();
  const trials = useTrials();

  if (trials.isPending) return <LoadingState />;
  if (trials.isError) return <ErrorState message={errorMessage(trials.error)} onRetry={() => trials.refetch()} />;

  const trial = trials.data.find((x) => x.id === Number(trialId));
  const back = (
    <Link to="/admin/trials" className="p-2 hover:bg-gray-100 rounded-xl" aria-label={t('trials.detail.back')} title={t('trials.detail.back')}>
      <FiArrowLeft className="w-6 h-6" aria-hidden />
    </Link>
  );
  if (!trial) {
    return (
      <div className="flex items-center gap-4">
        {back}
        <p className="text-gray-600">{t('trials.detail.notFound')}</p>
      </div>
    );
  }
  const name = trialName(trial) || t('trials.noName');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {back}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
            <KindBadge kind={trial.kind} />
            <TrialStateBadge trial={trial} />
          </div>
          <p className="text-sm text-gray-600">
            {[trial.templateName, trial.discipline && t(`trials.discipline.${trial.discipline}`), t('trials.createdOn', { date: formatDate(trial.createdAt) })]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <ContactForm key={trial.id} trial={trial} />
        <div className="space-y-6">
          <AccessCard trial={trial} />
          <AnswersCard trial={trial} />
        </div>
      </div>

      {trial.userId !== null && (
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('trials.detail.plan')}</h3>
            <p className="text-sm text-gray-600">{t('trials.detail.planHint')}</p>
          </div>
          <PlanTabs userId={trial.userId} name={name} />
        </section>
      )}
    </div>
  );
};

export default TrialDetailPage;
