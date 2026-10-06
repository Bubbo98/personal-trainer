import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FiBarChart2, FiChevronDown, FiPlus, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';
import Button from '../../../../components/ui/Button';
import { useConfirm } from '../../../../components/ui/ConfirmDialog';
import { inputClass } from '../../../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/ui/States';
import { useToast } from '../../../../components/ui/Toast';
import { adminApi } from '../../../../lib/api';
import { useErrorMessage } from '../../../../lib/errors';
import { newKey } from '../../../../lib/keys';
import { formatDate } from '../../../../lib/format';
import { displayWeight } from '../../../dashboard/workout';
import { useDragSensors } from '../../components/useDragSensors';
import { DragHandle, Sortable } from '../../components/sortable';
import { adminKeys, usePlanExercises, useWeightLogs } from '../../queries';
import type { AdminWeightLog, PlanDay, PlanExercise } from '../../types';
import { emptyExercise, fromParsed, nextDayNumber, planIsValid, toPlanDays, toPlanPayload } from './planEditor';

const cell = inputClass.replace('px-4 py-2.5', 'px-3 py-2').replace('rounded-xl', 'rounded-lg') + ' text-sm';

const ExerciseRow = ({ exercise, onChange, onRemove }: { exercise: PlanExercise; onChange: (ex: PlanExercise) => void; onRemove: () => void }) => {
  const { t } = useTranslation('admin');
  const field = (key: 'name' | 'sets' | 'reps' | 'rest' | 'notes', placeholder: string) => (
    <input aria-label={t(`plan.columns.${key}`)} value={exercise[key]} placeholder={placeholder} onChange={(e) => onChange({ ...exercise, [key]: e.target.value })} className={cell} />
  );
  return (
    <Sortable id={exercise.key} className="flex items-start gap-2">
      {(handle) => (
        <>
          <DragHandle handle={handle} className="mt-3" />
          <div className="flex-1 border sm:border-0 border-gray-100 rounded-lg p-3 sm:p-0 grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_2fr_auto_auto] gap-2 items-center">
            <div className="col-span-2 sm:col-span-1">{field('name', t('plan.namePlaceholder'))}</div>
            {field('sets', t('plan.columns.sets'))}
            {field('reps', t('plan.columns.reps'))}
            {field('rest', t('plan.columns.rest'))}
            <div className="col-span-2 sm:col-span-1">{field('notes', t('plan.notesPlaceholder'))}</div>
            <select
              aria-label={t('plan.columns.weightSlots')}
              title={t('plan.weightSlotsHint')}
              value={exercise.weightSlots}
              onChange={(e) => onChange({ ...exercise, weightSlots: Number(e.target.value) })}
              className={`${cell} sm:w-16`}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button type="button" onClick={onRemove} className="justify-self-end p-2 text-red-400 hover:text-red-600" aria-label={t('plan.removeExercise')}>
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </>
      )}
    </Sortable>
  );
};

const DayEditor = ({ day, onChange, onRemove }: { day: PlanDay; onChange: (day: PlanDay) => void; onRemove: () => void }) => {
  const { t } = useTranslation('admin');
  const sensors = useDragSensors();
  const [open, setOpen] = useState(true);
  const reorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = day.exercises.findIndex((e) => e.key === active.id);
    const to = day.exercises.findIndex((e) => e.key === over.id);
    if (from !== -1 && to !== -1) onChange({ ...day, exercises: arrayMove(day.exercises, from, to) });
  };
  return (
    <section className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? t('actions.collapse') : t('actions.expand')} className="text-gray-500 hover:text-gray-900">
          <FiChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        <input value={day.dayName} aria-label={t('plan.dayName')} onChange={(e) => onChange({ ...day, dayName: e.target.value })} className="flex-1 min-w-0 font-semibold text-gray-900 bg-transparent border-0 outline-none focus:ring-0 p-0" />
        <span className="text-xs text-gray-400 whitespace-nowrap">{t('plan.exerciseCount', { count: day.exercises.length })}</span>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600" aria-label={t('plan.removeDay')}>
          <FiTrash2 className="w-4 h-4" aria-hidden />
        </button>
      </div>
      {open && (
        <div className="p-4 space-y-2">
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto_auto] gap-2 pl-6 pr-10 text-xs font-semibold text-gray-400 uppercase tracking-wide" aria-hidden>
            <span>{t('plan.columns.name')}</span>
            <span>{t('plan.columns.sets')}</span>
            <span>{t('plan.columns.reps')}</span>
            <span>{t('plan.columns.rest')}</span>
            <span>{t('plan.columns.notes')}</span>
            <span className="w-16">{t('plan.columns.weightSlots')}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
            <SortableContext items={day.exercises.map((e) => e.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {day.exercises.map((exercise) => (
                  <ExerciseRow
                    key={exercise.key}
                    exercise={exercise}
                    onChange={(updated) => onChange({ ...day, exercises: day.exercises.map((e) => (e.key === exercise.key ? updated : e)) })}
                    onRemove={() => onChange({ ...day, exercises: day.exercises.filter((e) => e.key !== exercise.key) })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button type="button" onClick={() => onChange({ ...day, exercises: [...day.exercises, emptyExercise()] })} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mt-2">
            <FiPlus className="w-4 h-4" aria-hidden />
            {t('plan.addExercise')}
          </button>
        </div>
      )}
    </section>
  );
};

const PlanEditor = ({ userId, initial, hasPlan }: { userId: number; initial: PlanDay[]; hasPlan: boolean }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [days, setDays] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const update = (next: PlanDay[]) => {
    setDays(next);
    setDirty(true);
  };

  const refresh = () => {
    for (const key of [adminKeys.plan(userId), adminKeys.links(userId), adminKeys.logs(userId)]) queryClient.invalidateQueries({ queryKey: key });
  };

  const parse = useMutation({
    mutationFn: () => adminApi.post<{ days: Parameters<typeof fromParsed>[0] }>(`/workout/admin/parse-pdf/${userId}`),
    onSuccess: ({ days: parsed }) => {
      if (!parsed.length) return toast.info(t('plan.parseEmpty'));
      update(fromParsed(parsed));
      toast.success(t('plan.parsed', { exercises: parsed.reduce((n, d) => n + d.exercises.length, 0), days: parsed.length }));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const save = useMutation({
    mutationFn: () => adminApi.post(`/workout/admin/plan/${userId}`, toPlanPayload(days)),
    onSuccess: () => {
      setDirty(false);
      toast.success(t('plan.saved'));
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => adminApi.delete(`/workout/admin/plan/${userId}`),
    onSuccess: () => {
      toast.success(t('plan.deleted'));
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          loading={parse.isPending}
          onClick={async () => {
            if (await confirm({ title: t('plan.parseConfirmTitle'), message: t('plan.parseConfirmMessage'), confirmLabel: t('plan.parse') })) parse.mutate();
          }}
          icon={<FiRefreshCw className="w-4 h-4" aria-hidden />}
        >
          {parse.isPending ? t('plan.parsing') : t('plan.parse')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const number = nextDayNumber(days);
            update([...days, { key: newKey(), dayNumber: number, dayName: t('plan.dayFallback', { number }), exercises: [emptyExercise()] }]);
          }}
          icon={<FiPlus className="w-4 h-4" aria-hidden />}
        >
          {t('plan.addDay')}
        </Button>
        {dirty && <span className="text-xs font-medium text-amber-700">{t('plan.unsaved')}</span>}
        <div className="ml-auto flex gap-2">
          {days.length > 0 && (
            <Button
              loading={save.isPending}
              onClick={() => (planIsValid(days) ? save.mutate() : toast.error(t('plan.emptyName')))}
              icon={<FiSave className="w-4 h-4" aria-hidden />}
            >
              {t('plan.save')}
            </Button>
          )}
          {hasPlan && (
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={async () => {
                if (await confirm({ title: t('plan.deleteTitle'), message: t('plan.deleteMessage'), danger: true, confirmLabel: t('actions.delete') })) remove.mutate();
              }}
              icon={<FiTrash2 className="w-4 h-4" aria-hidden />}
            >
              {t('plan.delete')}
            </Button>
          )}
        </div>
      </div>

      {days.length === 0 && <EmptyState title={t('plan.emptyTitle')} message={t('plan.emptyMessage')} />}

      {days.map((day) => (
        <DayEditor
          key={day.key}
          day={day}
          onChange={(updated) => update(days.map((d) => (d.key === day.key ? updated : d)))}
          onRemove={() => update(days.filter((d) => d.key !== day.key))}
        />
      ))}
    </div>
  );
};

const WeightLogs = ({ userId, userName }: { userId: number; userName: string }) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const logs = useWeightLogs(userId);
  if (logs.isPending) return <LoadingState />;
  if (logs.isError) return <ErrorState message={errorMessage(logs.error)} onRetry={() => logs.refetch()} />;
  if (logs.data.length === 0) return <EmptyState title={t('logs.emptyTitle')} message={t('logs.emptyMessage', { name: userName })} />;

  const weeks = new Map<string, AdminWeightLog[]>();
  for (const log of logs.data) weeks.set(log.week_start, [...(weeks.get(log.week_start) ?? []), log]);

  return (
    <div className="space-y-4">
      {[...weeks.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([week, weekLogs]) => {
          const days = new Map<string, AdminWeightLog[]>();
          for (const log of weekLogs) {
            const key = String(log.day_number ?? '?');
            days.set(key, [...(days.get(key) ?? []), log]);
          }
          return (
            <section key={week} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">{t('logs.week', { date: formatDate(week, 'long') })}</h4>
                <span className="text-xs text-gray-400">{t('logs.count', { count: weekLogs.length })}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {[...days.entries()]
                  .sort(([a], [b]) => (Number(a) || Infinity) - (Number(b) || Infinity))
                  .map(([dayKey, dayLogs]) => (
                    <div key={dayKey} className="p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">{dayLogs[0].day_name || t('plan.dayFallback', { number: dayKey })}</p>
                      <ul className="space-y-2">
                        {dayLogs.map((log) => {
                          const weight = displayWeight(log.weight);
                          return (
                            <li key={log.id} className="flex flex-wrap items-start gap-x-6 gap-y-1 text-sm">
                              <span className="font-medium text-gray-900 min-w-[160px]">
                                {log.exercise_name}
                                {log.exercise_id == null && <span className="ml-2 text-xs font-normal text-gray-400">({t('logs.removedExercise')})</span>}
                              </span>
                              {(log.planned_sets || log.planned_reps) && (
                                <span className="text-gray-500">{t('logs.planned', { sets: log.planned_sets || '–', reps: log.planned_reps || '–' })}</span>
                              )}
                              {weight && <span className="text-blue-700 font-semibold">{weight} kg</span>}
                              {log.sets_done != null ? (
                                <span className="text-gray-600">{log.reps_done ? t('logs.setsReps', { sets: log.sets_done, reps: log.reps_done }) : t('logs.sets', { sets: log.sets_done })}</span>
                              ) : (
                                log.reps_done && <span className="text-gray-600">{t('logs.reps', { reps: log.reps_done })}</span>
                              )}
                              {!weight && log.sets_done == null && !log.reps_done && <span className="text-gray-400 italic">{t('logs.noData')}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>
            </section>
          );
        })}
    </div>
  );
};

/** "Weights & progress": the client's exercise plan and the weights they logged. */
const WorkoutPlanPanel = ({ userId, userName }: { userId: number; userName: string }) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const plan = usePlanExercises(userId);
  const [section, setSection] = useState<'plan' | 'logs'>('plan');

  return (
    <div className="space-y-4">
      <div role="group" aria-label={t('plan.sectionsLabel')} className="flex gap-2">
        {(['plan', 'logs'] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={section === id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium ${section === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {id === 'logs' && <FiBarChart2 className="w-4 h-4" aria-hidden />}
            {id === 'plan' ? t('plan.exercises') : t('plan.history')}
          </button>
        ))}
      </div>
      {section === 'logs' ? (
        <WeightLogs userId={userId} userName={userName} />
      ) : plan.isPending ? (
        <LoadingState />
      ) : plan.isError ? (
        <ErrorState message={errorMessage(plan.error)} onRetry={() => plan.refetch()} />
      ) : (
        // A new load (after save/delete) restarts the editor from the server
        <PlanEditor key={plan.dataUpdatedAt} userId={userId} hasPlan={plan.data.length > 0} initial={toPlanDays(plan.data, (number) => t('plan.dayFallback', { number }))} />
      )}
    </div>
  );
};

export default WorkoutPlanPanel;
