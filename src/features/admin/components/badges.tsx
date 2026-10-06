import { useTranslation } from 'react-i18next';
import { FiClock } from 'react-icons/fi';
import { daysUntil, formatDate } from '../../../lib/format';

const tone = (days: number) =>
  days < 0 ? 'bg-red-100 text-red-800 border-red-300' : days < 7 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-green-100 text-green-800 border-green-300';

/** Plan expiry: "12g" in lists, a full sentence with the date elsewhere. */
export const ExpiryBadge = ({ date, compact = false }: { date: string | null | undefined; compact?: boolean }) => {
  const { t } = useTranslation('admin');
  const days = daysUntil(date);
  if (days === null) return null;
  const text = compact
    ? days < 0
      ? t('expiry.expired')
      : days === 0
        ? t('expiry.shortToday')
        : t('expiry.short', { count: days })
    : days < 0
      ? t('expiry.expiredAgo', { count: -days })
      : days === 0
        ? t('expiry.today')
        : days === 1
          ? t('expiry.tomorrow')
          : t('expiry.inDays', { count: days });
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${tone(days)}`}
      title={compact ? t('expiry.date', { date: formatDate(date, 'long') }) : undefined}
    >
      <FiClock className="w-3 h-3" aria-hidden />
      {text}
    </span>
  );
};

const ANSWER_TONES: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  all: 'bg-green-100 text-green-800',
  completely: 'bg-green-100 text-green-800',
  excellent: 'bg-green-100 text-green-800',
  none: 'bg-green-100 text-green-800',
  very_high: 'bg-green-100 text-green-800',
  mostly: 'bg-blue-100 text-blue-800',
  good: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  almost_all: 'bg-yellow-100 text-yellow-800',
  sometimes: 'bg-yellow-100 text-yellow-800',
  fair: 'bg-yellow-100 text-yellow-800',
  minor: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
  few_or_none: 'bg-red-100 text-red-800',
  no: 'bg-red-100 text-red-800',
  poor: 'bg-red-100 text-red-800',
  significant: 'bg-red-100 text-red-800',
};

export type AnswerKind = 'energy' | 'workouts' | 'mealPlan' | 'sleep' | 'discomfort' | 'motivation';

/** A check-in answer as a colored chip, labelled like the client saw it. */
export const AnswerBadge = ({ kind, value, size = 'sm' }: { kind: AnswerKind; value: string | null | undefined; size?: 'sm' | 'md' }) => {
  const { t } = useTranslation('dashboard');
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <span className={`inline-block rounded font-medium ${size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} ${ANSWER_TONES[value] ?? 'bg-gray-100 text-gray-800'}`}>
      {t(`checkin.answers.${kind}.${value}` as 'checkin.answers.energy.high', { defaultValue: value })}
    </span>
  );
};
