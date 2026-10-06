import { useTranslation } from 'react-i18next';
import Modal from '../../../components/ui/Modal';
import { formatDate } from '../../../lib/format';
import { AnswerBadge, type AnswerKind } from '../components/badges';
import type { Checkin } from '../types';
import { parseZones } from './checkinUtils';

const DISCOMFORT_BG: Record<string, string> = { none: 'bg-green-50', minor: 'bg-yellow-50' };

const CheckinDetailModal = ({ checkin, onClose }: { checkin: Checkin; onClose: () => void }) => {
  const { t } = useTranslation(['admin', 'dashboard']);
  const name = [checkin.user_first_name, checkin.user_last_name].filter(Boolean).join(' ') || checkin.username;
  const muscular = parseZones(checkin.muscular_zones);
  const articular = parseZones(checkin.articular_zones);
  const zoneLabel = (zone: string) => t(`dashboard:checkin.zones.${zone}` as 'dashboard:checkin.zones.Collo', { defaultValue: zone });

  const answers: { kind: AnswerKind; label: string; value: string }[] = [
    { kind: 'energy', label: t('checkins.labels.energy'), value: checkin.energy_level },
    { kind: 'workouts', label: t('checkins.labels.workouts'), value: checkin.workouts_completed },
    { kind: 'mealPlan', label: t('checkins.labels.mealPlan'), value: checkin.meal_plan_followed },
    { kind: 'sleep', label: t('checkins.labels.sleep'), value: checkin.sleep_quality },
    { kind: 'motivation', label: t('checkins.labels.motivation'), value: checkin.motivation_level },
  ];

  return (
    <Modal title={t('checkins.detailTitle', { name })} onClose={onClose} size="lg">
      <div className="p-5 sm:p-6 space-y-6">
        <section className="bg-gray-50 p-4 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">{t('checkins.userInfo')}</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="inline text-gray-600">{t('checkins.name')}: </dt>
              <dd className="inline font-medium">{checkin.first_name} {checkin.last_name}</dd>
            </div>
            {checkin.email && (
              <div>
                <dt className="inline text-gray-600">{t('checkins.email')}: </dt>
                <dd className="inline font-medium break-all">{checkin.email}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-gray-600">{t('checkins.username')}: </dt>
              <dd className="inline font-medium">{checkin.username}</dd>
            </div>
            <div>
              <dt className="inline text-gray-600">{t('checkins.date')}: </dt>
              <dd className="inline font-medium">{formatDate(checkin.feedback_date, 'long')}</dd>
            </div>
          </dl>
        </section>

        <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {answers.map((answer) => (
            <div key={answer.kind} className="bg-gray-50 p-4 rounded-xl">
              <dt className="text-sm text-gray-600 mb-1">{answer.label}</dt>
              <dd>
                <AnswerBadge kind={answer.kind} value={answer.value} size="md" />
              </dd>
            </div>
          ))}
          <div className={`p-4 rounded-xl ${DISCOMFORT_BG[checkin.physical_discomfort] ?? 'bg-red-50'}`}>
            <dt className="text-sm text-gray-600 mb-1">{t('checkins.labels.discomfort')}</dt>
            <dd>
              <AnswerBadge kind="discomfort" value={checkin.physical_discomfort} size="md" />
              {checkin.discomfort_details && <p className="mt-2 text-sm text-gray-800 bg-white/50 p-2 rounded">{checkin.discomfort_details}</p>}
              {muscular.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-700">💪 {t('checkins.muscular')}</p>
                  <ul className="flex flex-wrap gap-1 mt-1">
                    {muscular.map((zone) => (
                      <li key={zone} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">{zoneLabel(zone)}</li>
                    ))}
                  </ul>
                  {checkin.muscular_notes && <p className="text-xs text-gray-600 mt-1 italic whitespace-pre-wrap">📝 {checkin.muscular_notes}</p>}
                </div>
              )}
              {articular.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-700">🦴 {t('checkins.articular')}</p>
                  <ul className="flex flex-wrap gap-1 mt-1">
                    {articular.map((zone) => (
                      <li key={zone} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">{zoneLabel(zone)}</li>
                    ))}
                  </ul>
                  {checkin.articular_notes && <p className="text-xs text-gray-600 mt-1 italic whitespace-pre-wrap">📝 {checkin.articular_notes}</p>}
                </div>
              )}
            </dd>
          </div>
        </dl>

        {checkin.current_weight != null && (
          <section className="bg-blue-50 p-4 rounded-xl">
            <h3 className="text-sm text-gray-600 mb-1">{t('checkins.labels.weight')}</h3>
            <p className="text-2xl font-bold text-blue-800">{checkin.current_weight} kg</p>
          </section>
        )}

        {checkin.weekly_highlights && (
          <section className="bg-green-50 p-4 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-2">{t('checkins.labels.highlights')}</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{checkin.weekly_highlights}</p>
          </section>
        )}

        <div className="text-xs text-gray-500 border-t pt-4 space-y-0.5">
          <p>{t('checkins.submittedOn', { date: formatDate(checkin.created_at, 'long') })}</p>
          {checkin.pdf_change_date && <p>{t('checkins.planChangedOn', { date: formatDate(checkin.pdf_change_date, 'long') })}</p>}
        </div>
      </div>
    </Modal>
  );
};

export default CheckinDetailModal;
