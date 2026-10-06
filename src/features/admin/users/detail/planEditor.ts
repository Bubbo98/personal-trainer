import { newKey } from '../../../../lib/keys';
import type { PlanDay, PlanExercise, ServerExercise } from '../../types';

export const emptyExercise = (): PlanExercise => ({ key: newKey(), name: '', sets: '', reps: '', rest: '', notes: '', weightSlots: 1 });

/** Saved exercises grouped by day, in plan order. */
export function toPlanDays(exercises: ServerExercise[], fallbackName: (n: number) => string): PlanDay[] {
  const days = new Map<number, PlanDay>();
  for (const ex of [...exercises].sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index)) {
    if (!days.has(ex.day_number)) {
      days.set(ex.day_number, { key: newKey(), dayNumber: ex.day_number, dayName: ex.day_name || fallbackName(ex.day_number), exercises: [] });
    }
    days.get(ex.day_number)!.exercises.push({
      key: newKey(),
      id: ex.id,
      name: ex.name,
      sets: ex.sets ?? '',
      reps: ex.reps ?? '',
      rest: ex.rest ?? '',
      notes: ex.notes ?? '',
      weightSlots: ex.weight_slots || 1,
    });
  }
  return [...days.values()];
}

interface ParsedDay {
  dayNumber: number;
  dayName: string;
  exercises: { name: string; sets?: string; reps?: string; rest?: string; notes?: string; weightSlots?: number; weight_slots?: number }[];
}

/** Days proposed by the PDF parser (no ids: saving replaces the plan). */
export const fromParsed = (days: ParsedDay[]): PlanDay[] =>
  days.map((d) => ({
    key: newKey(),
    dayNumber: d.dayNumber,
    dayName: d.dayName,
    exercises: d.exercises.map((ex) => ({
      key: newKey(),
      name: ex.name,
      sets: ex.sets ?? '',
      reps: ex.reps ?? '',
      rest: ex.rest ?? '',
      notes: ex.notes ?? '',
      weightSlots: ex.weightSlots || ex.weight_slots || 1,
    })),
  }));

export const nextDayNumber = (days: PlanDay[]) => (days.length ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1);

export const planIsValid = (days: PlanDay[]) => days.every((d) => d.exercises.every((ex) => ex.name.trim()));

/** Body of POST /workout/admin/plan/:userId. */
export const toPlanPayload = (days: PlanDay[]) => ({
  days: days.map((d) => ({
    dayNumber: d.dayNumber,
    dayName: d.dayName.trim(),
    exercises: d.exercises.map((ex) => ({
      ...(ex.id ? { id: ex.id } : {}),
      name: ex.name.trim(),
      sets: ex.sets.trim(),
      reps: ex.reps.trim(),
      rest: ex.rest.trim(),
      notes: ex.notes.trim(),
      weightSlots: ex.weightSlots,
    })),
  })),
});
