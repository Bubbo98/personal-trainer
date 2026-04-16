import React, { useState, useEffect, useCallback } from 'react';
import { FiSave, FiChevronDown, FiChevronUp, FiCheck } from 'react-icons/fi';
import { apiCall, STORAGE_KEY } from '../../utils/dashboardUtils';

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
  exercise_id: number;
  week_start: string;
  weight: string;
  sets_done: string;
  reps_done: string;
  notes: string;
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
  const day = today.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

const WorkoutTab: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [drafts, setDrafts] = useState<Record<number, LogDraft>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const weekStart = getCurrentWeekStart();

  const loadData = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      setLoading(true);
      const [planRes, logsRes] = await Promise.all([
        apiCall('/workout/plan', { headers }),
        apiCall(`/workout/logs?weekStart=${weekStart}`, { headers }),
      ]);

      const exList: Exercise[] = planRes.data?.exercises || [];
      const logList: ExerciseLog[] = logsRes.data?.logs || [];

      setExercises(exList);
      setLogs(logList);

      // Pre-fill drafts from existing logs
      const initial: Record<number, LogDraft> = {};
      for (const log of logList) {
        initial[log.exercise_id] = {
          weight: log.weight || '',
          sets_done: log.sets_done != null ? String(log.sets_done) : '',
          reps_done: log.reps_done || '',
          notes: log.notes || '',
        };
      }
      setDrafts(initial);

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

  // Group exercises by day
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
  const sortedDayNumbers = Object.keys(days)
    .map(Number)
    .sort((a, b) => a - b);

  const updateDraft = (exerciseId: number, field: keyof LogDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [exerciseId]: { ...(prev[exerciseId] || { weight: '', sets_done: '', reps_done: '', notes: '' }), [field]: value },
    }));
  };

  const handleSave = async (exerciseId: number) => {
    const draft = drafts[exerciseId];
    if (!draft) return;

    // Skip if all fields empty
    if (!draft.weight && !draft.sets_done && !draft.reps_done && !draft.notes) return;

    const token = localStorage.getItem(STORAGE_KEY);

    try {
      setSaving((prev) => ({ ...prev, [exerciseId]: true }));

      await apiCall('/workout/logs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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

  if (exercises.length === 0) {
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

  const weekLabel = new Date(weekStart + 'T12:00:00').toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Week header */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Settimana corrente</p>
        <p className="font-semibold">Dal {weekLabel}</p>
        <p className="text-xs text-gray-400 mt-1">
          Compila i pesi che hai usato — tutto è facoltativo.
        </p>
      </div>

      {sortedDayNumbers.map((dayNum) => {
        const { dayName, exercises: dayExercises } = days[dayNum];
        const isExpanded = expandedDays[dayNum] !== false;

        return (
          <div key={dayNum} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Day header */}
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
                      {/* Exercise info */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{ex.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                            {ex.sets && (
                              <span className="text-xs text-gray-500">
                                Serie: <span className="font-medium text-gray-700">{ex.sets}</span>
                              </span>
                            )}
                            {ex.reps && (
                              <span className="text-xs text-gray-500">
                                Reps: <span className="font-medium text-gray-700">{ex.reps}</span>
                              </span>
                            )}
                            {ex.rest && (
                              <span className="text-xs text-gray-500">
                                Recupero: <span className="font-medium text-gray-700">{ex.rest}</span>
                              </span>
                            )}
                          </div>
                          {ex.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 italic">{ex.notes}</p>
                          )}
                        </div>

                        {/* Save button */}
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

                      {/* Log inputs */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Peso (kg)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draft.weight}
                            onChange={(e) => updateDraft(ex.id, 'weight', e.target.value)}
                            placeholder="es. 70"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Serie fatte</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={draft.sets_done}
                            onChange={(e) => updateDraft(ex.id, 'sets_done', e.target.value)}
                            placeholder={ex.sets || '—'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Reps fatte</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draft.reps_done}
                            onChange={(e) => updateDraft(ex.id, 'reps_done', e.target.value)}
                            placeholder={ex.reps || '—'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
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
    </div>
  );
};

export default WorkoutTab;
