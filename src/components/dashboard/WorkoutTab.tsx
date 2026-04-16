import React, { useState, useEffect, useCallback } from 'react';
import { FiSave, FiChevronDown, FiChevronUp, FiCheck, FiClock } from 'react-icons/fi';
import { apiCall } from '../../utils/dashboardUtils';

interface Exercise {
  id: number;
  day_number: number;
  day_name: string;
  order_index: number;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
}

interface ExerciseLog {
  id: number;
  exercise_id: number;
  week_start: string;
  weight: string | null;
  sets_done: number | null;
  reps_done: string | null;
  notes: string | null;
  exercise_name: string | null;
  day_number_snapshot: number | null;
  day_name_snapshot: string | null;
}

interface LogDraft {
  weight: string;
  sets_done: string;
  reps_done: string;
  notes: string;
}

/** Returns the Monday of the current week as YYYY-MM-DD */
function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string): string {
  return new Date(weekStart + 'T12:00:00').toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const WorkoutTab: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [drafts, setDrafts] = useState<Record<number, LogDraft>>({});
  const [pastLogs, setPastLogs] = useState<ExerciseLog[]>([]);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [expandedPastWeeks, setExpandedPastWeeks] = useState<Record<string, boolean>>({});
  const weekStart = getCurrentWeekStart();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [planRes, currentLogsRes, allLogsRes] = await Promise.all([
        apiCall('/workout/plan'),
        apiCall(`/workout/logs?weekStart=${weekStart}`),
        apiCall('/workout/logs'),
      ]);

      const exList: Exercise[] = planRes.data?.exercises || [];
      const currentLogList: ExerciseLog[] = currentLogsRes.data?.logs || [];
      const allLogList: ExerciseLog[] = allLogsRes.data?.logs || [];

      setExercises(exList);

      // Pre-fill drafts from current week logs
      const initial: Record<number, LogDraft> = {};
      for (const log of currentLogList) {
        initial[log.exercise_id] = {
          weight: log.weight || '',
          sets_done: log.sets_done != null ? String(log.sets_done) : '',
          reps_done: log.reps_done || '',
          notes: log.notes || '',
        };
      }
      setDrafts(initial);

      // Past logs = all logs excluding current week
      setPastLogs(allLogList.filter((l) => l.week_start !== weekStart));

      // Expand all days by default
      const exp: Record<number, boolean> = {};
      exList.forEach((ex) => (exp[ex.day_number] = true));
      setExpandedDays(exp);
    } catch (err) {
      console.error('Failed to load workout data:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group current-plan exercises by day
  const days = exercises.reduce<Record<number, { dayName: string; exercises: Exercise[] }>>(
    (acc, ex) => {
      if (!acc[ex.day_number]) {
        acc[ex.day_number] = { dayName: ex.day_name || `Giorno ${ex.day_number}`, exercises: [] };
      }
      acc[ex.day_number].exercises.push(ex);
      return acc;
    },
    {}
  );
  const sortedDayNumbers = Object.keys(days).map(Number).sort((a, b) => a - b);

  // Group past logs: week → day → logs
  const pastByWeek = pastLogs.reduce<Record<string, ExerciseLog[]>>((acc, log) => {
    if (!acc[log.week_start]) acc[log.week_start] = [];
    acc[log.week_start].push(log);
    return acc;
  }, {});
  const pastWeeks = Object.keys(pastByWeek).sort((a, b) => (a > b ? -1 : 1));

  // Resolve exercise name for a log (snapshot or current plan)
  const resolveExerciseName = (log: ExerciseLog): string => {
    if (log.exercise_name) return log.exercise_name;
    const ex = exercises.find((e) => e.id === log.exercise_id);
    return ex?.name || 'Esercizio sconosciuto';
  };

  const resolveDayName = (log: ExerciseLog): string => {
    if (log.day_name_snapshot) return log.day_name_snapshot;
    const ex = exercises.find((e) => e.id === log.exercise_id);
    return ex?.day_name || `Giorno ${log.day_number_snapshot ?? '?'}`;
  };

  const updateDraft = (exerciseId: number, field: keyof LogDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || { weight: '', sets_done: '', reps_done: '', notes: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (exerciseId: number) => {
    const draft = drafts[exerciseId];
    if (!draft) return;
    if (!draft.weight && !draft.sets_done && !draft.reps_done && !draft.notes) return;

    try {
      setSaving((prev) => ({ ...prev, [exerciseId]: true }));
      await apiCall('/workout/logs', {
        method: 'POST',
        body: JSON.stringify({
          exerciseId,
          weekStart,
          weight: draft.weight || null,
          setsDone: draft.sets_done ? parseInt(draft.sets_done) : null,
          repsDone: draft.reps_done || null,
          notes: draft.notes || null,
        }),
      });
      setSaved((prev) => ({ ...prev, [exerciseId]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [exerciseId]: false })), 2000);
    } catch (err) {
      console.error('Failed to save log:', err);
      alert('Errore nel salvataggio. Riprova.');
    } finally {
      setSaving((prev) => ({ ...prev, [exerciseId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (exercises.length === 0 && pastLogs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna scheda disponibile</h3>
          <p className="text-gray-500 text-sm">
            Il tuo personal trainer non ha ancora caricato la scheda degli esercizi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* ── Settimana corrente ───────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Settimana corrente</p>
        <p className="font-semibold">Dal {formatWeekLabel(weekStart)}</p>
        <p className="text-xs text-gray-400 mt-1">Compila i pesi che hai usato — tutto è facoltativo.</p>
      </div>

      {exercises.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
          Nessuna scheda attiva al momento.
        </div>
      )}

      {sortedDayNumbers.map((dayNum) => {
        const { dayName, exercises: dayExercises } = days[dayNum];
        const isExpanded = expandedDays[dayNum] !== false;

        return (
          <div key={dayNum} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setExpandedDays((prev) => ({ ...prev, [dayNum]: !isExpanded }))}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-900">{dayName}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{dayExercises.length} esercizi</span>
                {isExpanded
                  ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5 text-gray-400' })
                  : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5 text-gray-400' })}
              </div>
            </button>

            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {dayExercises.map((ex) => {
                  const draft = drafts[ex.id] || { weight: '', sets_done: '', reps_done: '', notes: '' };
                  const isSaving = saving[ex.id];
                  const isSaved = saved[ex.id];

                  return (
                    <div key={ex.id} className="px-5 py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{ex.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                            {ex.sets && <span className="text-xs text-gray-500">Serie: <span className="font-medium text-gray-700">{ex.sets}</span></span>}
                            {ex.reps && <span className="text-xs text-gray-500">Reps: <span className="font-medium text-gray-700">{ex.reps}</span></span>}
                            {ex.rest && <span className="text-xs text-gray-500">Recupero: <span className="font-medium text-gray-700">{ex.rest}</span></span>}
                          </div>
                          {ex.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{ex.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleSave(ex.id)}
                          disabled={isSaving || isSaved}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ml-3 ${
                            isSaved
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
                          }`}
                        >
                          {isSaved
                            ? React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: 'w-3.5 h-3.5' })
                            : React.createElement(FiSave as React.ComponentType<{ className?: string }>, { className: 'w-3.5 h-3.5' })}
                          {isSaved ? 'Salvato' : isSaving ? '...' : 'Salva'}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Peso (kg)</label>
                          <input type="text" inputMode="decimal" value={draft.weight}
                            onChange={(e) => updateDraft(ex.id, 'weight', e.target.value)}
                            placeholder="es. 70"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Serie fatte</label>
                          <input type="number" inputMode="numeric" value={draft.sets_done}
                            onChange={(e) => updateDraft(ex.id, 'sets_done', e.target.value)}
                            placeholder={ex.sets || '—'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Reps fatte</label>
                          <input type="text" inputMode="numeric" value={draft.reps_done}
                            onChange={(e) => updateDraft(ex.id, 'reps_done', e.target.value)}
                            placeholder={ex.reps || '—'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Storico settimane precedenti ─────────────────────────────────── */}
      {pastWeeks.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-gray-500">
            {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
            <span className="text-sm font-semibold uppercase tracking-wide">Storico settimane precedenti</span>
          </div>

          {pastWeeks.map((week) => {
            const weekLogs = pastByWeek[week];
            const isExpanded = expandedPastWeeks[week] === true;

            // Group logs by day
            const byDay = weekLogs.reduce<Record<string, ExerciseLog[]>>((acc, log) => {
              const key = String(log.day_number_snapshot ?? log.exercise_id);
              if (!acc[key]) acc[key] = [];
              acc[key].push(log);
              return acc;
            }, {});

            return (
              <div key={week} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedPastWeeks((prev) => ({ ...prev, [week]: !isExpanded }))}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-gray-700">Dal {formatWeekLabel(week)}</span>
                    <span className="text-xs text-gray-400 ml-3">{weekLogs.length} esercizi registrati</span>
                  </div>
                  {isExpanded
                    ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4 text-gray-400' })
                    : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4 text-gray-400' })}
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {Object.entries(byDay)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([, dayLogs]) => (
                        <div key={dayLogs[0].exercise_id} className="px-5 py-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                            {resolveDayName(dayLogs[0])}
                          </p>
                          <div className="space-y-2">
                            {dayLogs.map((log) => (
                              <div key={log.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm">
                                <span className="font-medium text-gray-900 min-w-[140px]">
                                  {resolveExerciseName(log)}
                                </span>
                                {log.weight && (
                                  <span className="font-semibold text-gray-900">{log.weight} kg</span>
                                )}
                                {log.sets_done != null && (
                                  <span className="text-gray-500">
                                    {log.sets_done} serie{log.reps_done ? ` × ${log.reps_done} reps` : ''}
                                  </span>
                                )}
                                {!log.weight && log.sets_done == null && (
                                  <span className="text-gray-400 italic text-xs">nessun dato</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkoutTab;
