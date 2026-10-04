import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiRefreshCw, FiSave, FiChevronDown, FiChevronUp, FiBarChart2, FiMenu } from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiCall } from '../../utils/adminUtils';

interface Exercise {
  id?: number;
  _key: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
  weight_slots?: number;
}

interface Day {
  dayNumber: number;
  dayName: string;
  exercises: Exercise[];
}

interface ExerciseLog {
  id: number;
  exercise_id: number | null;
  exercise_name: string;
  day_number: number;
  day_name: string;
  week_start: string;
  weight: string | null;
  sets_done: number | null;
  reps_done: string | null;
  planned_sets: string;
  planned_reps: string;
}

interface Props {
  userId: number;
  userName: string;
}

let exerciseKeySeq = 0;
const genExerciseKey = (): string => `ex-${Date.now()}-${exerciseKeySeq++}`;

const EMPTY_EXERCISE = (): Exercise => ({ _key: genExerciseKey(), name: '', sets: '', reps: '', rest: '', notes: '' });

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

// Sortable exercise row — drag handle reorders the exercise within its day
const SortableExerciseRow: React.FC<{
  exercise: Exercise;
  onChange: (field: keyof Exercise, value: string) => void;
  onRemove: () => void;
}> = ({ exercise, onChange, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        {...attributes}
        {...listeners}
        type="button"
        style={{ touchAction: 'none' }}
        className="flex-shrink-0 mt-2 sm:mt-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        {React.createElement(FiMenu as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
      </button>
      <div className="flex-1 border sm:border-0 border-gray-100 rounded-lg sm:rounded-none p-3 sm:p-0 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] sm:gap-2 sm:items-center space-y-2 sm:space-y-0">
        {/* Esercizio */}
        <div>
          <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Esercizio</label>
          <input
            value={exercise.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Nome esercizio"
            className={inputClass}
          />
        </div>
        {/* Serie + Reps su 2 colonne, Recupero a larghezza piena */}
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <div>
            <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Serie</label>
            <input
              value={exercise.sets}
              onChange={(e) => onChange('sets', e.target.value)}
              placeholder="Serie"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Reps</label>
            <input
              value={exercise.reps}
              onChange={(e) => onChange('reps', e.target.value)}
              placeholder="Reps"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Recupero</label>
          <input
            value={exercise.rest}
            onChange={(e) => onChange('rest', e.target.value)}
            placeholder="Recupero"
            className={inputClass}
          />
        </div>
        {/* Note + elimina su una riga */}
        <div className="flex gap-2 items-end sm:contents">
          <div className="flex-1">
            <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Note</label>
            <input
              value={exercise.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Note (opz.)"
              className={inputClass}
            />
          </div>
          <button
            onClick={onRemove}
            className="flex-shrink-0 flex items-center justify-center p-2 text-red-400 hover:text-red-600 transition-colors"
          >
            {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
          </button>
        </div>
      </div>
    </div>
  );
};

const TrainingPlanAdmin: React.FC<Props> = ({ userId, userName }) => {
  const [days, setDays] = useState<Day[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'plan' | 'logs'>('plan');
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiCall(`/workout/admin/plan/${userId}`);
      const exercises: (Exercise & { day_number: number; day_name: string; order_index: number })[] =
        res.data.exercises || [];

      if (exercises.length === 0) {
        setDays([]);
        setHasPlan(false);
        return;
      }

      setHasPlan(true);

      // Group by day
      const dayMap: Record<number, Day> = {};
      for (const ex of exercises) {
        if (!dayMap[ex.day_number]) {
          dayMap[ex.day_number] = {
            dayNumber: ex.day_number,
            dayName: ex.day_name || `Giorno ${ex.day_number}`,
            exercises: [],
          };
        }
        dayMap[ex.day_number].exercises.push({
          id: (ex as any).id,
          _key: genExerciseKey(),
          name: ex.name,
          sets: ex.sets || '',
          reps: ex.reps || '',
          rest: ex.rest || '',
          notes: ex.notes || '',
          weight_slots: (ex as any).weight_slots || 1,
        });
      }

      const sorted = Object.values(dayMap).sort((a, b) => a.dayNumber - b.dayNumber);
      setDays(sorted);
      const exp: Record<number, boolean> = {};
      sorted.forEach((d) => (exp[d.dayNumber] = true));
      setExpandedDays(exp);
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadLogs = useCallback(async () => {
    try {
      const res = await apiCall(`/workout/admin/logs/${userId}`);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadPlan();
    loadLogs();
  }, [loadPlan, loadLogs]);

  // ── Parse PDF ─────────────────────────────────────────────────────────────
  const handleParsePdf = async () => {
    if (!window.confirm('Vuoi estrarre la scheda dal PDF caricato? La scheda attuale verrà sovrascritta dopo la tua conferma.')) return;
    try {
      setParsing(true);
      const res = await apiCall(`/workout/admin/parse-pdf/${userId}`, { method: 'POST' });
      const parsed: { dayNumber: number; dayName: string; exercises: Exercise[] }[] = res.data.days || [];
      if (parsed.length === 0) {
        alert('Nessun esercizio rilevato nel PDF. Inseriscili manualmente.');
        return;
      }
      const withKeys = parsed.map((d) => ({
        ...d,
        exercises: d.exercises.map((ex) => ({ ...ex, _key: genExerciseKey() })),
      }));
      setDays(withKeys);
      setHasPlan(true);
      const exp: Record<number, boolean> = {};
      parsed.forEach((d) => (exp[d.dayNumber] = true));
      setExpandedDays(exp);
      showSuccess(`Estratti ${parsed.reduce((s, d) => s + d.exercises.length, 0)} esercizi da ${parsed.length} giorni. Verifica e salva.`);
    } catch (err: any) {
      alert(err.message || 'Errore durante il parsing del PDF');
    } finally {
      setParsing(false);
    }
  };

  // ── Save Plan ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      await apiCall(`/workout/admin/plan/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ days }),
      });
      showSuccess('Scheda salvata con successo!');
      loadPlan();
    } catch (err: any) {
      alert(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Plan ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Eliminare tutta la scheda di allenamento?')) return;
    try {
      await apiCall(`/workout/admin/plan/${userId}`, { method: 'DELETE' });
      setDays([]);
      setHasPlan(false);
      showSuccess('Scheda eliminata.');
    } catch (err: any) {
      alert(err.message || 'Errore');
    }
  };

  // ── Day helpers ───────────────────────────────────────────────────────────
  const addDay = () => {
    const nextNum = days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;
    const newDay: Day = { dayNumber: nextNum, dayName: `Giorno ${nextNum}`, exercises: [EMPTY_EXERCISE()] };
    setDays((prev) => [...prev, newDay]);
    setExpandedDays((prev) => ({ ...prev, [nextNum]: true }));
  };

  const removeDay = (dayNumber: number) => {
    setDays((prev) => prev.filter((d) => d.dayNumber !== dayNumber));
  };

  const updateDayName = (dayNumber: number, name: string) => {
    setDays((prev) => prev.map((d) => (d.dayNumber === dayNumber ? { ...d, dayName: name } : d)));
  };

  // ── Exercise helpers ──────────────────────────────────────────────────────
  const addExercise = (dayNumber: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber ? { ...d, exercises: [...d.exercises, EMPTY_EXERCISE()] } : d
      )
    );
  };

  const removeExercise = (dayNumber: number, idx: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber
          ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) }
          : d
      )
    );
  };

  const updateExercise = (dayNumber: number, idx: number, field: keyof Exercise, value: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber
          ? {
              ...d,
              exercises: d.exercises.map((ex, i) =>
                i === idx ? { ...ex, [field]: value } : ex
              ),
            }
          : d
      )
    );
  };

  // ── Drag & drop reorder ───────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExerciseDragEnd = (event: DragEndEvent, dayNumber: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d;
        const oldIndex = d.exercises.findIndex((ex) => ex._key === active.id);
        const newIndex = d.exercises.findIndex((ex) => ex._key === over.id);
        if (oldIndex === -1 || newIndex === -1) return d;
        return { ...d, exercises: arrayMove(d.exercises, oldIndex, newIndex) };
      })
    );
  };

  // ── Logs grouping ─────────────────────────────────────────────────────────
  const logsByWeek = logs.reduce<Record<string, ExerciseLog[]>>((acc, log) => {
    const key = log.week_start;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const weeks = Object.keys(logsByWeek).sort((a, b) => (a > b ? -1 : 1));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success message */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {successMsg}
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('plan')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeSection === 'plan'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Scheda Esercizi
        </button>
        <button
          onClick={() => setActiveSection('logs')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeSection === 'logs'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {React.createElement(FiBarChart2 as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
          Storico Pesi
        </button>
      </div>

      {/* ── PLAN section ─────────────────────────────────────────────────── */}
      {activeSection === 'plan' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleParsePdf}
              disabled={parsing}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
            >
              {React.createElement(FiRefreshCw as React.ComponentType<{ className?: string }>, {
                className: `w-4 h-4 ${parsing ? 'animate-spin' : ''}`,
              })}
              {parsing ? 'Estrazione...' : 'Estrai dal PDF'}
            </button>
            <button
              onClick={addDay}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
              Aggiungi Giorno
            </button>
            {days.length > 0 && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-50 ml-auto"
                >
                  {React.createElement(FiSave as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
                  {saving ? 'Salvataggio...' : 'Salva Scheda'}
                </button>
                {hasPlan && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm"
                  >
                    {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
                    Elimina Scheda
                  </button>
                )}
              </>
            )}
          </div>

          {/* Empty state */}
          {days.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              <p className="font-medium mb-1">Nessuna scheda caricata</p>
              <p className="text-sm">Usa "Estrai dal PDF" oppure aggiungi i giorni manualmente.</p>
            </div>
          )}

          {/* Days */}
          {days.map((day) => (
            <div key={day.dayNumber} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                <button
                  onClick={() =>
                    setExpandedDays((prev) => ({ ...prev, [day.dayNumber]: !prev[day.dayNumber] }))
                  }
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {expandedDays[day.dayNumber]
                    ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5' })
                    : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5' })}
                </button>
                <input
                  value={day.dayName}
                  onChange={(e) => updateDayName(day.dayNumber, e.target.value)}
                  className="flex-1 font-semibold text-gray-900 bg-transparent border-0 outline-none focus:ring-0 p-0"
                />
                <span className="text-xs text-gray-400">{day.exercises.length} esercizi</span>
                <button
                  onClick={() => removeDay(day.dayNumber)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
                </button>
              </div>

              {/* Exercises table */}
              {expandedDays[day.dayNumber] && (
                <div className="p-4 space-y-2">
                  {/* Header row */}
                  <div className="hidden sm:flex items-center gap-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    <span className="w-4 flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] gap-2">
                      <span>Esercizio</span>
                      <span>Serie</span>
                      <span>Reps</span>
                      <span>Recupero</span>
                      <span>Note</span>
                      <span />
                    </div>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleExerciseDragEnd(event, day.dayNumber)}
                  >
                    <SortableContext
                      items={day.exercises.map((ex) => ex._key)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {day.exercises.map((ex, idx) => (
                          <SortableExerciseRow
                            key={ex._key}
                            exercise={ex}
                            onChange={(field, value) => updateExercise(day.dayNumber, idx, field, value)}
                            onRemove={() => removeExercise(day.dayNumber, idx)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <button
                    onClick={() => addExercise(day.dayNumber)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mt-2"
                  >
                    {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
                    Aggiungi esercizio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── LOGS section ─────────────────────────────────────────────────── */}
      {activeSection === 'logs' && (
        <div className="space-y-4">
          {weeks.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              <p className="font-medium mb-1">Nessun log ancora</p>
              <p className="text-sm">{userName} non ha ancora registrato pesi.</p>
            </div>
          ) : (
            weeks.map((week) => {
              const weekLogs = logsByWeek[week];
              const weekDate = new Date(week);
              const label = weekDate.toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });

              // Group by day
              const byDay = weekLogs.reduce<Record<number, ExerciseLog[]>>((acc, l) => {
                if (!acc[l.day_number]) acc[l.day_number] = [];
                acc[l.day_number].push(l);
                return acc;
              }, {});

              return (
                <div key={week} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Settimana dal {label}</span>
                    <span className="text-xs text-gray-400">{weekLogs.length} log</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {Object.entries(byDay)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([dayNum, dayLogs]) => (
                        <div key={dayNum} className="p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-3">
                            {dayLogs[0].day_name || `Giorno ${dayNum}`}
                          </p>
                          <div className="space-y-2">
                            {dayLogs.map((log) => (
                              <div
                                key={log.id}
                                className="flex flex-wrap items-start gap-x-6 gap-y-1 text-sm"
                              >
                                <span className="font-medium text-gray-900 min-w-[160px]">
                                  {log.exercise_name}
                                </span>
                                <span className="text-gray-500">
                                  Previste: {log.planned_sets}×{log.planned_reps}
                                </span>
                                {log.weight && (
                                  <span className="text-blue-700 font-semibold">{log.weight} kg</span>
                                )}
                                {log.sets_done != null && (
                                  <span className="text-gray-600">
                                    {log.sets_done} serie
                                    {log.reps_done ? ` × ${log.reps_done} reps` : ''}
                                  </span>
                                )}
                                {!log.weight && log.sets_done == null && (
                                  <span className="text-gray-400 italic">nessun dato</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TrainingPlanAdmin;
