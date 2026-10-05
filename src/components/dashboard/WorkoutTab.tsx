import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiSave, FiChevronDown, FiChevronUp, FiCheck, FiClock } from 'react-icons/fi';
import { apiCall } from '../../utils/dashboardUtils';
import { type Video } from '../../types/dashboard';
import VideoCard from './VideoCard';

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
  weight_slots?: number;
}

/** Extracts individual weight values from a stored weight string (plain or JSON array). */
function parseWeightsFromDraft(weight: string, slots: number): string[] {
  if (!weight) return Array(slots).fill('');
  if (weight.startsWith('[')) {
    try {
      const arr = JSON.parse(weight) as string[];
      if (Array.isArray(arr))
        return [...arr, ...Array(Math.max(0, slots - arr.length)).fill('')].slice(0, slots);
    } catch { /* fall through */ }
  }
  return [weight, ...Array(Math.max(0, slots - 1)).fill('')];
}

/** Serializes individual weight values into storage format. */
function serializeWeights(weights: string[], slots: number): string {
  if (slots <= 1) return weights[0] || '';
  return JSON.stringify(weights.map((w) => w.trim()));
}

/** Extracts suggested weight values (numbers) from the notes string as placeholder hints. */
function getSuggestedWeights(notes: string | null, slots: number): string[] {
  if (!notes) return Array(slots).fill('');
  const match = notes.match(/Peso consigliato:\s*(.+)/i);
  if (!match) return Array(slots).fill('');
  const nums = match[1].match(/\d+/g) || [];
  return [...nums.slice(0, slots), ...Array(Math.max(0, slots - nums.length)).fill('')];
}

/** Formats a stored weight value for display (handles JSON array multi-weights). */
function formatWeightDisplay(weight: string | null): string | null {
  if (!weight) return null;
  if (weight.startsWith('[')) {
    try {
      const arr = JSON.parse(weight) as string[];
      const values = arr.filter(Boolean);
      return values.length > 0 ? values.join(' / ') : null;
    } catch { /* fall through */ }
  }
  return weight;
}

interface ExerciseLog {
  id: number;
  exercise_id: number | null; // null once the exercise left the plan: name/day come from the snapshots
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
export function getCurrentWeekStart(): string {
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

/** A training day as returned by /videos/training-days (only the fields used here). */
interface PlanDay {
  dayNumber: number;
  dayName: string | null;
  videos: Video[];
}

interface WorkoutTabProps {
  /**
   * 'log' = current-week inputs only, 'history' = past weeks only,
   * 'all' = both (legacy dashboard), 'merged' = each exercise with its videos
   * and inputs, plus the day's other videos (needs trainingDays + onPlayVideo).
   */
  mode?: 'log' | 'history' | 'all' | 'merged';
  /** Called after the current week's weights are saved successfully. */
  onSaved?: () => void;
  trainingDays?: PlanDay[];
  onPlayVideo?: (video: Video) => void;
}

const WorkoutTab: React.FC<WorkoutTabProps> = ({ mode = 'all', onSaved, trainingDays, onPlayVideo }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [drafts, setDrafts] = useState<Record<number, LogDraft>>({});
  const [pastLogs, setPastLogs] = useState<ExerciseLog[]>([]);
  const [dirty, setDirty] = useState<Record<number, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [allSaved, setAllSaved] = useState(false);
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

      // Pre-fill drafts from current week logs. If this week has no log yet for
      // an exercise, carry over the weight from the most recent previous week
      // (allLogList is already ordered by week_start DESC) so weights persist
      // week to week and only reset when a new plan assigns new exercise ids.
      const latestLogByExercise: Record<number, ExerciseLog> = {};
      for (const log of allLogList) {
        // Logs of exercises no longer in the plan have no id: nothing to carry over
        if (log.exercise_id != null && !(log.exercise_id in latestLogByExercise)) {
          latestLogByExercise[log.exercise_id] = log;
        }
      }

      const initial: Record<number, LogDraft> = {};
      for (const ex of exList) {
        const currentLog = currentLogList.find((l) => l.exercise_id === ex.id);
        const carriedWeight = latestLogByExercise[ex.id]?.weight || '';
        if (currentLog) {
          initial[ex.id] = {
            weight: currentLog.weight || carriedWeight,
            sets_done: currentLog.sets_done != null ? String(currentLog.sets_done) : '',
            reps_done: currentLog.reps_done || '',
            notes: currentLog.notes || '',
          };
        } else if (carriedWeight) {
          initial[ex.id] = { weight: carriedWeight, sets_done: '', reps_done: '', notes: '' };
        }
      }
      setDrafts(initial);

      // Past logs = all logs excluding current week
      setPastLogs(allLogList.filter((l) => l.week_start !== weekStart));

      // Expand all days by default — except the merged view, where each day
      // also holds its videos: there only the first day starts open
      const exp: Record<number, boolean> = {};
      if (mode !== 'merged') exList.forEach((ex) => (exp[ex.day_number] = true));
      setExpandedDays(exp);
    } catch (err) {
      console.error('Failed to load workout data:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, mode]);

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

  // ── Autosave (merged view) ────────────────────────────────────────────────
  // Each exercise saves on its own: 1.2s after the last keystroke, or right
  // away when its field loses focus. Refs give the timers the latest values.
  const [saveStatus, setSaveStatus] = useState<Record<number, 'saving' | 'saved' | 'error'>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const saveExercise = useCallback(async (exerciseId: number) => {
    clearTimeout(timersRef.current[exerciseId]);
    delete timersRef.current[exerciseId];
    const draft = draftsRef.current[exerciseId];
    if (!draft) return;

    setSaveStatus((prev) => ({ ...prev, [exerciseId]: 'saving' }));
    try {
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
      // Only clear "dirty" if nothing was typed while the request was in flight
      if (draftsRef.current[exerciseId] === draft) {
        setDirty((prev) => ({ ...prev, [exerciseId]: false }));
      }
      setSaveStatus((prev) => ({ ...prev, [exerciseId]: 'saved' }));
      onSavedRef.current?.();
    } catch (err) {
      console.error('Failed to autosave log:', err);
      setSaveStatus((prev) => ({ ...prev, [exerciseId]: 'error' }));
    }
  }, [weekStart]);

  /** Saves right away an exercise with unsaved changes (on blur / leaving the page). */
  const flushExercise = useCallback((exerciseId: number) => {
    if (dirtyRef.current[exerciseId]) saveExercise(exerciseId);
  }, [saveExercise]);

  // Don't lose pending changes when the user switches section or app
  useEffect(() => {
    if (mode !== 'merged') return;
    const flushAll = () => Object.keys(timersRef.current).forEach((id) => flushExercise(Number(id)));
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushAll(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushAll);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushAll);
      flushAll();
    };
  }, [mode, flushExercise]);

  const updateDraft = (exerciseId: number, field: keyof LogDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || { weight: '', sets_done: '', reps_done: '', notes: '' }),
        [field]: value,
      },
    }));
    setDirty((prev) => ({ ...prev, [exerciseId]: true }));

    if (mode === 'merged') {
      setSaveStatus((prev) => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });
      clearTimeout(timersRef.current[exerciseId]);
      timersRef.current[exerciseId] = setTimeout(() => saveExercise(exerciseId), 1200);
    }
  };

  const dirtyIds = Object.entries(dirty)
    .filter(([, v]) => v)
    .map(([k]) => Number(k));

  const handleSaveAll = async () => {
    const toSave = dirtyIds.filter((id) => {
      const d = drafts[id];
      return d && (d.weight || d.sets_done || d.reps_done || d.notes);
    });
    if (toSave.length === 0) return;

    try {
      setSavingAll(true);
      await Promise.all(
        toSave.map((exerciseId) => {
          const draft = drafts[exerciseId];
          return apiCall('/workout/logs', {
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
        })
      );
      setDirty({});
      setAllSaved(true);
      onSaved?.();
      setTimeout(() => setAllSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save logs:', err);
      alert('Errore nel salvataggio. Riprova.');
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-14 bg-gray-200" />
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-4">
                  <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
                  <div className="w-20 h-10 bg-gray-100 rounded-lg" />
                  <div className="w-20 h-10 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'history' && pastWeeks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📈</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ancora nessuno storico</h3>
          <p className="text-gray-500 text-sm">
            I pesi che salvi in Allenamento › Pesi compariranno qui settimana dopo settimana.
          </p>
        </div>
      </div>
    );
  }

  if ((mode === 'log' && exercises.length === 0) || (mode === 'all' && exercises.length === 0 && pastLogs.length === 0)) {
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

  /** One exercise: header (name, sets/reps/rest, notes), optional videos, weight/reps inputs. */
  const renderExercise = (ex: Exercise, exIdx: number, videos?: Video[]) => {
    const draft = drafts[ex.id] || { weight: '', sets_done: '', reps_done: '', notes: '' };
    const slots = ex.weight_slots || 1;
    const suggested = getSuggestedWeights(ex.notes, slots);
    const individualWeights = parseWeightsFromDraft(draft.weight, slots);
    const inputClass = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
    // Merged view autosaves: leaving a field saves that exercise right away
    const onBlur = mode === 'merged' ? () => flushExercise(ex.id) : undefined;
    const status = mode === 'merged' ? saveStatus[ex.id] : undefined;

    return (
      <div key={ex.id} className="bg-gray-50 rounded-xl p-4">
        {/* Exercise header */}
        <div className="flex items-start gap-2.5 mb-3">
          <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400 w-5 text-right">
            {exIdx + 1}.
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 leading-snug">{ex.name}</p>
              {status === 'saving' && <span className="flex-shrink-0 text-xs text-gray-400 mt-0.5">Salvataggio…</span>}
              {status === 'saved' && (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-green-600 mt-0.5">
                  {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: 'w-3.5 h-3.5' })}
                  Salvato
                </span>
              )}
              {status === 'error' && (
                <button onClick={() => saveExercise(ex.id)} className="flex-shrink-0 text-xs font-medium text-red-600 underline mt-0.5">
                  Non salvato · Riprova
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ex.sets && (
                <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                  {ex.sets} serie
                </span>
              )}
              {ex.reps && (
                <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                  {ex.reps} reps
                </span>
              )}
              {ex.rest && (
                <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                  ⏱ {ex.rest}
                </span>
              )}
            </div>
            {ex.notes && (
              <p className="text-xs text-gray-400 mt-1 italic">{ex.notes}</p>
            )}
          </div>
        </div>

        {/* Videos linked to this exercise (merged view only) */}
        {videos && videos.length > 0 && onPlayVideo && (
          <div className="space-y-2 mb-3">
            {videos.map((video) => (
              <VideoCard key={video.assignmentId ?? video.id} video={video} onPlay={onPlayVideo} variant="row" />
            ))}
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2">
          {slots === 1 ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Peso (kg)</label>
              <input type="text" inputMode="decimal" value={draft.weight}
                onChange={(e) => updateDraft(ex.id, 'weight', e.target.value)}
                onBlur={onBlur}
                placeholder={suggested[0] ? `es. ${suggested[0]}` : 'es. 70'}
                className={inputClass} />
            </div>
          ) : (
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Pesi (kg)</label>
              <div className={`grid gap-2 ${slots === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {individualWeights.map((w, i) => (
                  <input key={i} type="text" inputMode="decimal" value={w}
                    onChange={(e) => {
                      const updated = [...individualWeights];
                      updated[i] = e.target.value;
                      updateDraft(ex.id, 'weight', serializeWeights(updated, slots));
                    }}
                    onBlur={onBlur}
                    placeholder={suggested[i] ? `es. ${suggested[i]}` : ''}
                    className={inputClass} />
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reps fatte</label>
            <input type="text" inputMode="numeric" value={draft.reps_done}
              onChange={(e) => updateDraft(ex.id, 'reps_done', e.target.value)}
              onBlur={onBlur}
              placeholder={ex.reps || '—'}
              className={inputClass} />
          </div>
        </div>
      </div>
    );
  };

  const SaveAllButton = () => (
    <button
      onClick={handleSaveAll}
      disabled={savingAll || allSaved || dirtyIds.length === 0}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        allSaved
          ? 'bg-green-100 text-green-700'
          : dirtyIds.length === 0
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gray-900 text-white hover:bg-gray-800'
      }`}
    >
      {allSaved
        ? React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })
        : React.createElement(FiSave as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
      {allSaved ? 'Salvato!' : savingAll ? 'Salvataggio...' : dirtyIds.length > 0 ? `Salva tutto (${dirtyIds.length})` : 'Salva tutto'}
    </button>
  );

  if (mode === 'merged') {
    const planDays = trainingDays || [];
    const exerciseIds = new Set(exercises.map((e) => e.id));
    const videosByExercise = new Map<number, Video[]>();
    for (const day of planDays) {
      for (const video of day.videos) {
        if (video.exerciseId != null && exerciseIds.has(video.exerciseId)) {
          videosByExercise.set(video.exerciseId, [...(videosByExercise.get(video.exerciseId) || []), video]);
        }
      }
    }
    const allDayNumbers = Array.from(new Set([...sortedDayNumbers, ...planDays.map((d) => d.dayNumber)])).sort((a, b) => a - b);
    const firstDay = allDayNumbers[0];

    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <p className="text-sm text-gray-500 px-1">
          Settimana dal {formatWeekLabel(weekStart)} · segna i pesi mentre ti alleni, si salvano da soli.
        </p>

        {allDayNumbers.map((dayNum) => {
          const planDay = planDays.find((d) => d.dayNumber === dayNum);
          const dayExercises = days[dayNum]?.exercises || [];
          const dayName = days[dayNum]?.dayName || planDay?.dayName || `Giorno ${dayNum}`;
          // Day videos not attached to any exercise (e.g. stretching)
          const extras = (planDay?.videos || []).filter((v) => v.exerciseId == null || !exerciseIds.has(v.exerciseId));
          // A day whose videos are all linked to exercises of other days has nothing left to show
          if (dayExercises.length === 0 && extras.length === 0) return null;
          const isExpanded = expandedDays[dayNum] ?? dayNum === firstDay;

          const dashIdx = dayName.indexOf(' - ');
          const dayLabel = dashIdx !== -1 ? dayName.slice(0, dashIdx) : dayName;
          const daySubtitle = dashIdx !== -1 ? dayName.slice(dashIdx + 3) : '';

          return (
            <div key={dayNum} className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
              <button
                onClick={() => setExpandedDays((prev) => ({ ...prev, [dayNum]: !isExpanded }))}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold text-white">
                    {dayNum}
                  </span>
                  <div className="text-left">
                    <p className="font-semibold text-white leading-tight">{dayLabel}</p>
                    {daySubtitle && <p className="text-xs text-gray-400 leading-tight">{daySubtitle}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {dayExercises.length > 0 ? `${dayExercises.length} esercizi` : `${extras.length} video`}
                  </span>
                  {isExpanded
                    ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5 text-gray-400' })
                    : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5 text-gray-400' })}
                </div>
              </button>

              {isExpanded && (
                <div className="bg-white p-3 space-y-2">
                  {dayExercises.map((ex, exIdx) => renderExercise(ex, exIdx, videosByExercise.get(ex.id) || []))}

                  {extras.length > 0 && onPlayVideo && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                        {dayExercises.length > 0 ? 'Altri video del giorno' : 'Video del giorno'}
                      </p>
                      <div className="space-y-2">
                        {extras.map((video) => (
                          <VideoCard key={video.assignmentId ?? video.id} video={video} onPlay={onPlayVideo} variant="row" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {mode !== 'history' && (<>

      {/* ── Settimana corrente ───────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Settimana corrente</p>
        <p className="font-semibold">Dal {formatWeekLabel(weekStart)}</p>
        <p className="text-xs text-gray-400 mt-1">Compila i pesi che hai usato — tutto è facoltativo.</p>
      </div>

      {exercises.length > 0 && (
        <div className="flex justify-end">
          <SaveAllButton />
        </div>
      )}

      {exercises.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
          Nessuna scheda attiva al momento.
        </div>
      )}

      {sortedDayNumbers.map((dayNum) => {
        const { dayName, exercises: dayExercises } = days[dayNum];
        const isExpanded = expandedDays[dayNum] !== false;

        // Split "Giorno 1 - MACCHINARI" into label + subtitle
        const dashIdx = dayName.indexOf(' - ');
        const dayLabel = dashIdx !== -1 ? dayName.slice(0, dashIdx) : dayName;
        const daySubtitle = dashIdx !== -1 ? dayName.slice(dashIdx + 3) : '';

        return (
          <div key={dayNum} className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
            {/* ── Day header ── */}
            <button
              onClick={() => setExpandedDays((prev) => ({ ...prev, [dayNum]: !isExpanded }))}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold text-white">
                  {dayNum}
                </span>
                <div className="text-left">
                  <p className="font-semibold text-white leading-tight">{dayLabel}</p>
                  {daySubtitle && <p className="text-xs text-gray-400 leading-tight">{daySubtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">{dayExercises.length} esercizi</span>
                {isExpanded
                  ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5 text-gray-400' })
                  : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5 text-gray-400' })}
              </div>
            </button>

            {isExpanded && (
              <div className="bg-white p-3 space-y-2">
                {dayExercises.map((ex, exIdx) => renderExercise(ex, exIdx))}
              </div>
            )}
          </div>
        );
      })}

      {exercises.length > 0 && (
        <div className="flex justify-end">
          <SaveAllButton />
        </div>
      )}
      </>)}

      {/* ── Storico settimane precedenti ─────────────────────────────────── */}
      {(mode === 'history' || (mode === 'all' && pastWeeks.length > 0)) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-500">
            {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
            <span className="text-sm font-semibold uppercase tracking-wide">
              {mode === 'all' ? 'Storico settimane precedenti' : 'Settimane precedenti'}
            </span>
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
                      .map(([dayKey, dayLogs]) => (
                        <div key={dayKey} className="px-5 py-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                            {resolveDayName(dayLogs[0])}
                          </p>
                          <div className="space-y-2">
                            {dayLogs.map((log) => (
                              <div key={log.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm">
                                <span className="font-medium text-gray-900 min-w-[140px]">
                                  {resolveExerciseName(log)}
                                </span>
                                {formatWeightDisplay(log.weight) && (
                                  <span className="font-semibold text-gray-900">{formatWeightDisplay(log.weight)} kg</span>
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
