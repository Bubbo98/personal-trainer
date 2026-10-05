import type { Exercise, ExerciseLog, TrainingDay, Video } from './types';

/**
 * Weight-log helpers. An exercise with several weight slots (supersets…)
 * stores its weights as a JSON array string: '["20","22.5"]'.
 */

/** The individual weights of a stored value, padded/cut to `slots`. */
export function splitWeights(stored: string | null | undefined, slots: number): string[] {
  const empty = Array<string>(slots).fill('');
  if (!stored) return empty;
  if (stored.startsWith('[')) {
    try {
      const values = JSON.parse(stored);
      if (Array.isArray(values)) return empty.map((_, i) => String(values[i] ?? ''));
    } catch {
      /* not JSON after all: a plain value */
    }
  }
  return [stored, ...empty.slice(1)];
}

/** Stored form of the weights: a plain value for one slot, a JSON array otherwise. */
export function joinWeights(weights: string[], slots: number): string {
  if (slots <= 1) return (weights[0] ?? '').trim();
  const trimmed = weights.map((w) => w.trim());
  return trimmed.some(Boolean) ? JSON.stringify(trimmed) : '';
}

/** Readable form of a stored weight ("20 / 22.5"), or null when empty. */
export function displayWeight(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.startsWith('[')) {
    try {
      const values = JSON.parse(stored);
      if (Array.isArray(values)) {
        const filled = values.map(String).filter((v) => v.trim());
        return filled.length ? filled.join(' / ') : null;
      }
    } catch {
      /* plain value */
    }
  }
  return stored;
}

/** Weights suggested by the trainer in the notes ("Peso consigliato: 20-22"), as placeholders. */
export function suggestedWeights(notes: string | null | undefined, slots: number): string[] {
  const empty = Array<string>(slots).fill('');
  const match = notes?.match(/Peso consigliato:\s*(.+)/i);
  if (!match) return empty;
  const numbers = match[1].match(/\d+(?:[.,]\d+)?/g) ?? [];
  return empty.map((_, i) => numbers[i] ?? '');
}

/** "Giorno 1 - MACCHINARI" → { label: "Giorno 1", subtitle: "MACCHINARI" } */
export function splitDayName(name: string): { label: string; subtitle: string } {
  const dash = name.indexOf(' - ');
  return dash === -1 ? { label: name, subtitle: '' } : { label: name.slice(0, dash), subtitle: name.slice(dash + 3) };
}

export interface Draft {
  weight: string;
  repsDone: string;
}

/**
 * Starting values of this week's inputs: this week's log when there is one,
 * otherwise last logged weight of the exercise is carried over, so weights
 * persist week to week until a new plan brings new exercises.
 */
export function initialDrafts(exercises: Exercise[], logs: ExerciseLog[], week: string): Record<number, Draft> {
  const latest = new Map<number, ExerciseLog>();
  const current = new Map<number, ExerciseLog>();
  // Newest week first, whatever order the server used
  const sorted = [...logs].sort((a, b) => b.week_start.localeCompare(a.week_start));
  for (const log of sorted) {
    if (log.exercise_id == null) continue;
    if (log.week_start === week) current.set(log.exercise_id, log);
    else if (log.weight && !latest.has(log.exercise_id) && log.week_start < week) latest.set(log.exercise_id, log);
  }

  const drafts: Record<number, Draft> = {};
  for (const exercise of exercises) {
    const thisWeek = current.get(exercise.id);
    const carried = latest.get(exercise.id)?.weight ?? '';
    if (thisWeek || carried) {
      drafts[exercise.id] = {
        weight: thisWeek?.weight || carried,
        repsDone: thisWeek?.reps_done ?? '',
      };
    }
  }
  return drafts;
}

/** Plan has exercises but nothing was logged this week: drives the reminder dot. */
export function weightsPending(exercises: Exercise[], logs: ExerciseLog[], week: string): boolean {
  return exercises.length > 0 && !logs.some((log) => log.week_start === week);
}

export interface PlanDay {
  number: number;
  name: string;
  exercises: Exercise[];
  /** Videos per exercise of this day. */
  videosByExercise: Map<number, Video[]>;
  /** Day videos not attached to an exercise of the plan (stretching…). */
  extras: Video[];
}

/**
 * Merges the plan's exercises with the training-day videos into one list of
 * days. Days with nothing to show (all videos attached to exercises of other
 * days) are dropped.
 */
export function buildPlanDays(exercises: Exercise[], trainingDays: TrainingDay[], fallbackName: (n: number) => string): PlanDay[] {
  const exerciseIds = new Set(exercises.map((e) => e.id));
  const videosByExercise = new Map<number, Video[]>();
  for (const day of trainingDays) {
    for (const video of day.videos) {
      if (video.exerciseId != null && exerciseIds.has(video.exerciseId)) {
        videosByExercise.set(video.exerciseId, [...(videosByExercise.get(video.exerciseId) ?? []), video]);
      }
    }
  }

  const numbers = [...new Set([...exercises.map((e) => e.day_number), ...trainingDays.map((d) => d.dayNumber)])].sort((a, b) => a - b);

  return numbers
    .map((number) => {
      const dayExercises = exercises
        .filter((e) => e.day_number === number)
        .sort((a, b) => a.order_index - b.order_index);
      const trainingDay = trainingDays.find((d) => d.dayNumber === number);
      const extras = (trainingDay?.videos ?? []).filter((v) => v.exerciseId == null || !exerciseIds.has(v.exerciseId));
      return {
        number,
        name: dayExercises[0]?.day_name || trainingDay?.dayName || fallbackName(number),
        exercises: dayExercises,
        videosByExercise: new Map(dayExercises.map((e) => [e.id, videosByExercise.get(e.id) ?? []])),
        extras,
      };
    })
    .filter((day) => day.exercises.length > 0 || day.extras.length > 0);
}

export type DayItem =
  | { type: 'videos'; key: string; videos: Video[] }
  | { type: 'group'; key: string; label: string | null; videos: Video[] };

/**
 * A training day's videos in order, with consecutive loose videos batched in
 * one grid and grouped videos (supersets) gathered under their group.
 */
export function groupDayVideos(videos: Video[]): DayItem[] {
  const items: DayItem[] = [];
  const groups = new Map<number, Extract<DayItem, { type: 'group' }>>();
  for (const video of videos) {
    const videoKey = String(video.assignmentId ?? video.id);
    if (video.groupId != null) {
      const group = groups.get(video.groupId);
      if (group) {
        group.videos.push(video);
      } else {
        const created = { type: 'group' as const, key: `group-${video.groupId}`, label: video.groupLabel ?? null, videos: [video] };
        groups.set(video.groupId, created);
        items.push(created);
      }
    } else {
      const last = items[items.length - 1];
      if (last?.type === 'videos') last.videos.push(video);
      else items.push({ type: 'videos', key: `videos-${videoKey}`, videos: [video] });
    }
  }
  return items;
}

/** Past weeks' logs, newest week first, each split by day in plan order. */
export function groupHistory(logs: ExerciseLog[], currentWeek: string) {
  const weeks = new Map<string, ExerciseLog[]>();
  for (const log of logs) {
    if (log.week_start === currentWeek) continue;
    weeks.set(log.week_start, [...(weeks.get(log.week_start) ?? []), log]);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([week, weekLogs]) => {
      const days = new Map<string, ExerciseLog[]>();
      for (const log of weekLogs) {
        const key = String(log.day_number_snapshot ?? `x${log.exercise_id}`);
        days.set(key, [...(days.get(key) ?? []), log]);
      }
      return {
        week,
        count: weekLogs.length,
        days: [...days.entries()]
          .sort(([a], [b]) => (Number(a) || Infinity) - (Number(b) || Infinity))
          .map(([key, dayLogs]) => ({ key, logs: dayLogs })),
      };
    });
}
