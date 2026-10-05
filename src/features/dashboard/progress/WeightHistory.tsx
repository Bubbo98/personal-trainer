import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiClock, FiTrendingUp } from 'react-icons/fi';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate, weekStart } from '../../../lib/format';
import { useExercises, useWorkoutLogs } from '../queries';
import type { Exercise, ExerciseLog } from '../types';
import { displayWeight, groupHistory } from '../workout';

const WeekPanel = ({ week, count, children }: { week: string; count: number; children: ReactNode }) => {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
        >
          <span>
            <span className="font-medium text-gray-700">{t('history.week', { date: formatDate(week, 'long') })}</span>
            <span className="text-xs text-gray-400 ml-3">{t('history.loggedCount', { count })}</span>
          </span>
          <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </h3>
      {open && (
        <div id={panelId} className="divide-y divide-gray-100">
          {children}
        </div>
      )}
    </section>
  );
};

/** Weights logged in past weeks, newest first. */
const WeightHistory = () => {
  const { t } = useTranslation('dashboard');
  const errorMessage = useErrorMessage();
  const exercises = useExercises();
  const logs = useWorkoutLogs();

  if (exercises.isPending || logs.isPending) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }
  if (logs.isError) return <ErrorState message={errorMessage(logs.error)} onRetry={() => logs.refetch()} />;

  const plan: Exercise[] = exercises.data ?? [];
  const weeks = groupHistory(logs.data, weekStart());

  if (weeks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState icon={<FiTrendingUp className="w-12 h-12" aria-hidden />} title={t('history.emptyTitle')} message={t('history.emptyMessage')} />
      </div>
    );
  }

  // Logs of exercises still in the plan lack snapshots on old rows: fall back to the plan
  const exerciseOf = (log: ExerciseLog) => plan.find((e) => e.id === log.exercise_id);
  const nameOf = (log: ExerciseLog) => log.exercise_name || exerciseOf(log)?.name || t('workout.unknownExercise');
  const dayOf = (log: ExerciseLog) =>
    log.day_name_snapshot || exerciseOf(log)?.day_name || t('workout.dayFallback', { number: log.day_number_snapshot ?? '?' });

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <h2 className="flex items-center gap-2 text-gray-500 text-sm font-semibold uppercase tracking-wide">
        <FiClock className="w-4 h-4" aria-hidden />
        {t('history.title')}
      </h2>

      {weeks.map(({ week, count, days }) => (
        <WeekPanel key={week} week={week} count={count}>
          {days.map(({ key, logs: dayLogs }) => (
            <div key={key} className="px-5 py-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{dayOf(dayLogs[0])}</h4>
              <ul className="space-y-2">
                {dayLogs.map((log) => {
                  const weight = displayWeight(log.weight);
                  return (
                    <li key={log.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm">
                      <span className="font-medium text-gray-900 min-w-[140px]">{nameOf(log)}</span>
                      {weight && <span className="font-semibold text-gray-900">{weight} kg</span>}
                      {log.sets_done != null ? (
                        <span className="text-gray-500">
                          {log.reps_done
                            ? t('history.setsReps', { sets: log.sets_done, reps: log.reps_done })
                            : t('history.setsOnly', { sets: log.sets_done })}
                        </span>
                      ) : (
                        log.reps_done && <span className="text-gray-500">{t('workout.reps', { value: log.reps_done })}</span>
                      )}
                      {!weight && log.sets_done == null && !log.reps_done && (
                        <span className="text-gray-400 italic text-xs">{t('history.noData')}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </WeekPanel>
      ))}
    </div>
  );
};

export default WeightHistory;
