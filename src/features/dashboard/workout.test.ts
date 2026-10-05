import type { Exercise, ExerciseLog, TrainingDay, Video } from './types';
import {
  buildPlanDays,
  displayWeight,
  groupDayVideos,
  groupHistory,
  initialDrafts,
  joinWeights,
  splitDayName,
  splitWeights,
  suggestedWeights,
  weightsPending,
} from './workout';

const exercise = (over: Partial<Exercise>): Exercise => ({
  id: 1,
  day_number: 1,
  day_name: 'Giorno 1',
  order_index: 0,
  name: 'Panca',
  sets: '4',
  reps: '10',
  rest: '90"',
  notes: null,
  weight_slots: 1,
  ...over,
});

const log = (over: Partial<ExerciseLog>): ExerciseLog => ({
  id: 1,
  exercise_id: 1,
  week_start: '2026-09-28',
  weight: '50',
  sets_done: null,
  reps_done: null,
  notes: null,
  exercise_name: null,
  day_number_snapshot: 1,
  day_name_snapshot: null,
  ...over,
});

const video = (over: Partial<Video>): Video => ({
  id: 1,
  title: 'v',
  description: '',
  filePath: 'v.mp4',
  duration: 60,
  category: 'Palestra',
  createdAt: '2026-01-01',
  ...over,
});

describe('weights', () => {
  it('splits plain and multi-slot values', () => {
    expect(splitWeights('', 2)).toEqual(['', '']);
    expect(splitWeights(null, 1)).toEqual(['']);
    expect(splitWeights('60', 1)).toEqual(['60']);
    expect(splitWeights('60', 3)).toEqual(['60', '', '']);
    expect(splitWeights('["20","22.5"]', 2)).toEqual(['20', '22.5']);
    expect(splitWeights('["20","22.5","25"]', 2)).toEqual(['20', '22.5']);
    expect(splitWeights('["20"]', 3)).toEqual(['20', '', '']);
    expect(splitWeights('[broken', 2)).toEqual(['[broken', '']);
  });

  it('joins weights back', () => {
    expect(joinWeights([' 60 '], 1)).toBe('60');
    expect(joinWeights(['20', ' 22.5'], 2)).toBe('["20","22.5"]');
    expect(joinWeights(['', ''], 2)).toBe('');
  });

  it('displays stored weights', () => {
    expect(displayWeight(null)).toBeNull();
    expect(displayWeight('60')).toBe('60');
    expect(displayWeight('["20","","25"]')).toBe('20 / 25');
    expect(displayWeight('["",""]')).toBeNull();
  });

  it('reads suggested weights from the notes', () => {
    expect(suggestedWeights('Peso consigliato: 20-22,5 kg', 2)).toEqual(['20', '22,5']);
    expect(suggestedWeights('peso consigliato: 50', 1)).toEqual(['50']);
    expect(suggestedWeights('Recupero lento', 1)).toEqual(['']);
    expect(suggestedWeights(null, 2)).toEqual(['', '']);
  });
});

describe('splitDayName', () => {
  it('splits label and subtitle', () => {
    expect(splitDayName('Giorno 1 - MACCHINARI')).toEqual({ label: 'Giorno 1', subtitle: 'MACCHINARI' });
    expect(splitDayName('Giorno 2')).toEqual({ label: 'Giorno 2', subtitle: '' });
  });
});

describe('initialDrafts', () => {
  const week = '2026-10-05';

  it("uses this week's log", () => {
    const drafts = initialDrafts([exercise({})], [log({ week_start: week, weight: '70', reps_done: '8' })], week);
    expect(drafts[1]).toEqual({ weight: '70', repsDone: '8' });
  });

  it('carries over the latest previous weight, not the reps', () => {
    const logs = [log({ id: 1, week_start: '2026-09-21', weight: '55' }), log({ id: 2, week_start: '2026-09-28', weight: '60', reps_done: '9' })];
    expect(initialDrafts([exercise({})], logs, week)[1]).toEqual({ weight: '60', repsDone: '' });
  });

  it("keeps the carried weight when this week's log has none", () => {
    const logs = [log({ week_start: week, weight: null, reps_done: '10' }), log({ id: 2, week_start: '2026-09-28', weight: '60' })];
    expect(initialDrafts([exercise({})], logs, week)[1]).toEqual({ weight: '60', repsDone: '10' });
  });

  it('ignores logs of exercises no longer in the plan and empty weeks', () => {
    const logs = [log({ exercise_id: null }), log({ id: 3, exercise_id: 1, weight: null })];
    expect(initialDrafts([exercise({})], logs, week)).toEqual({});
  });
});

describe('weightsPending', () => {
  it('is pending only with a plan and nothing logged this week', () => {
    expect(weightsPending([], [], '2026-10-05')).toBe(false);
    expect(weightsPending([exercise({})], [log({})], '2026-10-05')).toBe(true);
    expect(weightsPending([exercise({})], [log({ week_start: '2026-10-05' })], '2026-10-05')).toBe(false);
  });
});

describe('buildPlanDays', () => {
  const fallback = (n: number) => `Giorno ${n}`;

  it('attaches videos to their exercises and keeps the others as extras', () => {
    const exercises = [exercise({ id: 1, order_index: 1 }), exercise({ id: 2, order_index: 0, name: 'Squat' })];
    const days: TrainingDay[] = [
      { id: 10, dayNumber: 1, dayName: 'Day', videos: [video({ id: 1, exerciseId: 1 }), video({ id: 2, exerciseId: null }), video({ id: 3, exerciseId: 99 })] },
    ];
    const [day] = buildPlanDays(exercises, days, fallback);
    expect(day.exercises.map((e) => e.name)).toEqual(['Squat', 'Panca']);
    expect(day.videosByExercise.get(1)!.map((v) => v.id)).toEqual([1]);
    expect(day.videosByExercise.get(2)).toEqual([]);
    expect(day.extras.map((v) => v.id)).toEqual([2, 3]);
  });

  it('shows a video linked to an exercise of another day under that exercise', () => {
    const exercises = [exercise({ id: 1, day_number: 1 }), exercise({ id: 2, day_number: 2, day_name: 'Giorno 2' })];
    const days: TrainingDay[] = [{ id: 10, dayNumber: 1, dayName: null, videos: [video({ id: 7, exerciseId: 2 })] }];
    const result = buildPlanDays(exercises, days, fallback);
    expect(result.find((d) => d.number === 2)!.videosByExercise.get(2)!.map((v) => v.id)).toEqual([7]);
    expect(result.find((d) => d.number === 1)!.extras).toEqual([]);
  });

  it('drops days with nothing to show and names days without exercises', () => {
    const days: TrainingDay[] = [
      { id: 1, dayNumber: 3, dayName: null, videos: [video({ id: 1 })] },
      { id: 2, dayNumber: 4, dayName: 'Vuoto', videos: [] },
    ];
    const result = buildPlanDays([], days, fallback);
    expect(result.map((d) => [d.number, d.name])).toEqual([[3, 'Giorno 3']]);
  });
});

describe('groupDayVideos', () => {
  it('batches loose videos and gathers groups in order', () => {
    const items = groupDayVideos([
      video({ id: 1 }),
      video({ id: 2 }),
      video({ id: 3, groupId: 5, groupLabel: 'Superset A' }),
      video({ id: 4 }),
      video({ id: 5, groupId: 5 }),
    ]);
    expect(items.map((i) => [i.type, i.videos.map((v) => v.id)])).toEqual([
      ['videos', [1, 2]],
      ['group', [3, 5]],
      ['videos', [4]],
    ]);
    expect(items[1]).toMatchObject({ label: 'Superset A' });
  });
});

describe('groupHistory', () => {
  it('skips the current week and orders weeks and days', () => {
    const logs = [
      log({ id: 1, week_start: '2026-09-21', day_number_snapshot: 2 }),
      log({ id: 2, week_start: '2026-09-28', day_number_snapshot: 2 }),
      log({ id: 3, week_start: '2026-09-28', day_number_snapshot: 1 }),
      log({ id: 4, week_start: '2026-10-05' }),
      log({ id: 5, week_start: '2026-09-28', day_number_snapshot: null, exercise_id: 8 }),
    ];
    const weeks = groupHistory(logs, '2026-10-05');
    expect(weeks.map((w) => w.week)).toEqual(['2026-09-28', '2026-09-21']);
    expect(weeks[0].count).toBe(3);
    expect(weeks[0].days.map((d) => d.logs.map((l) => l.id))).toEqual([[3], [2], [5]]);
  });
});
