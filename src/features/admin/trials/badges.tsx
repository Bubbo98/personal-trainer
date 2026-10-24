import { useTranslation } from 'react-i18next';
import type { Trial, TrialStatus } from './types';

const STATE_STYLES = {
  not_opened: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  ended: 'bg-orange-100 text-orange-800',
  link_expired: 'bg-gray-100 text-gray-600',
  deleted: 'bg-gray-100 text-gray-600',
} as const;

/** Where the trial is: link not opened, N days left, ended… */
export const TrialStateBadge = ({ trial }: { trial: Pick<Trial, 'state' | 'daysLeft'> }) => {
  const { t } = useTranslation('admin');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATE_STYLES[trial.state]}`}>
      {trial.state === 'active' ? t('trials.state.active', { count: trial.daysLeft }) : t(`trials.state.${trial.state}`)}
    </span>
  );
};

const STATUS_STYLES: Record<TrialStatus, string> = {
  to_contact: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-blue-100 text-blue-800',
  client: 'bg-green-100 text-green-800',
  not_interested: 'bg-gray-100 text-gray-600',
};

export const TrialStatusBadge = ({ status }: { status: TrialStatus }) => {
  const { t } = useTranslation('admin');
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>{t(`trials.status.${status}`)}</span>;
};

export const KindBadge = ({ kind }: { kind: Trial['kind'] }) => {
  const { t } = useTranslation('admin');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${kind === 'online' ? 'bg-purple-100 text-purple-800' : 'bg-gray-900 text-white'}`}>
      {t(`trials.kind.${kind}`)}
    </span>
  );
};
