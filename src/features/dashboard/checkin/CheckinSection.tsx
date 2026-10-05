import { useTranslation } from 'react-i18next';
import { FiAward, FiCheckCircle, FiClock, FiMessageSquare } from 'react-icons/fi';
import { Alert, EmptyState, ErrorState, Skeleton } from '../../../components/ui/States';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate } from '../../../lib/format';
import { useCheckins, useCheckinStatus, useSubmitCheckin } from '../queries';
import type { AnswerKind, Checkin, CheckinStatus, SessionUser } from '../types';
import CheckinForm from './CheckinForm';
import { nextCheckin } from './checkin';

const StatusCard = ({ status }: { status: CheckinStatus }) => {
  const { t } = useTranslation('dashboard');
  if (!status.reason) return null;
  const next = nextCheckin(status);
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 flex items-start gap-3">
      <FiCheckCircle className="w-6 h-6 mt-0.5 text-blue-600 flex-shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-gray-900 mb-1">{t(`checkin.status.${status.reason}.title`)}</p>
        <p className="text-sm text-gray-700">{t(`checkin.status.${status.reason}.message`)}</p>
        {next && (
          <>
            <div className="mt-4 mb-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">
                  {next.daysLeft > 0 ? t('checkin.daysLeft', { count: next.daysLeft }) : t('checkin.availableSoon')}
                </span>
                <span className="text-blue-600 font-semibold">{Math.round(next.progress)}%</span>
              </div>
              <div
                className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(next.progress)}
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500" style={{ width: `${next.progress}%` }} />
              </div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">{t('checkin.nextAvailable')}</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{formatDate(next.date, 'full')}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TONES: Record<string, string> = {
  good: 'bg-green-100 text-green-800',
  ok: 'bg-blue-100 text-blue-800',
  meh: 'bg-yellow-100 text-yellow-800',
  bad: 'bg-red-100 text-red-800',
};

// How each answer reads at a glance
const ANSWER_TONE: Record<string, keyof typeof TONES> = {
  high: 'good', medium: 'meh', low: 'bad',
  all: 'good', almost_all: 'meh', few_or_none: 'bad',
  completely: 'good', mostly: 'ok', sometimes: 'meh', no: 'bad',
  excellent: 'good', good: 'ok', fair: 'meh', poor: 'bad',
  none: 'good', minor: 'meh', significant: 'bad',
  very_high: 'good',
};

const CheckinCard = ({ checkin }: { checkin: Checkin }) => {
  const { t } = useTranslation('dashboard');
  const metrics: { kind: AnswerKind; value: string }[] = [
    { kind: 'energy', value: checkin.energy_level },
    { kind: 'workouts', value: checkin.workouts_completed },
    { kind: 'mealPlan', value: checkin.meal_plan_followed },
    { kind: 'sleep', value: checkin.sleep_quality },
    { kind: 'discomfort', value: checkin.physical_discomfort },
    { kind: 'motivation', value: checkin.motivation_level },
  ];
  // Motivation "good" is one step below "very_high": read it as ok, not as the best answer
  const tone = (kind: AnswerKind, value: string) => TONES[kind === 'motivation' && value === 'good' ? 'ok' : (ANSWER_TONE[value] ?? 'ok')];

  return (
    <article className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-gray-900">{t('checkin.checkOf', { date: formatDate(checkin.feedback_date) })}</h4>
          <p className="text-xs text-gray-400 mt-0.5">{t('checkin.submittedOn', { date: formatDate(checkin.created_at) })}</p>
        </div>
        {checkin.current_weight != null && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-gray-400">{t('checkin.labels.weight')}</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{checkin.current_weight} kg</p>
          </div>
        )}
      </div>
      <dl className="px-4 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {metrics.map(({ kind, value }) => (
          <div key={kind}>
            <dt className="text-xs text-gray-500 mb-1">{t(`checkin.labels.${kind}`)}</dt>
            <dd>
              <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${tone(kind, value)}`}>
                {t(`checkin.answers.${kind}.${value}` as 'checkin.answers.energy.high', { defaultValue: value })}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {checkin.weekly_highlights && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-1">{t('checkin.labels.highlights')}</p>
          <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-wrap">{checkin.weekly_highlights}</p>
        </div>
      )}
    </article>
  );
};

/** Weekly check-in: the form when due, otherwise when the next one opens; past check-ins below. */
const CheckinSection = ({ user, onCompleted }: { user: SessionUser; onCompleted: () => void }) => {
  const { t } = useTranslation('dashboard');
  const errorMessage = useErrorMessage();
  const status = useCheckinStatus();
  const checkins = useCheckins();
  const submit = useSubmitCheckin();

  if (status.isPending || checkins.isPending) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (status.isError) return <ErrorState message={errorMessage(status.error)} onRetry={() => status.refetch()} />;

  const due = status.data.shouldShow;
  const list = checkins.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiMessageSquare className="w-8 h-8 text-gray-900 flex-shrink-0" aria-hidden />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('checkin.title')}</h2>
          <p className="text-gray-600">{t('checkin.subtitle')}</p>
        </div>
      </div>

      {due ? (
        <div className="space-y-4">
          {!status.data.lastFeedbackAt && (
            <Alert kind="warning" icon={<FiAward className="w-5 h-5" aria-hidden />} title={t('checkin.firstTitle')}>
              {t('checkin.firstMessage')}
            </Alert>
          )}
          <Alert kind="info" icon={<FiClock className="w-5 h-5" aria-hidden />} title={t('checkin.dueTitle')}>
            {t('checkin.dueMessage')}
          </Alert>
          <CheckinForm
            identity={{
              firstName: user.firstName || user.username,
              lastName: user.lastName || user.username,
              email: user.email ?? '',
            }}
            submitting={submit.isPending}
            onSubmit={async (submission) => {
              await submit.mutateAsync(submission);
              onCompleted();
            }}
          />
        </div>
      ) : (
        <StatusCard status={status.data} />
      )}

      {list.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('checkin.historyTitle')}</h3>
          <div className="space-y-4">
            {list.map((checkin) => (
              <CheckinCard key={checkin.id} checkin={checkin} />
            ))}
          </div>
        </section>
      ) : (
        !due && <EmptyState icon={<FiMessageSquare className="w-12 h-12" aria-hidden />} title={t('checkin.emptyTitle')} message={t('checkin.emptyMessage')} />
      )}
    </div>
  );
};

export default CheckinSection;
