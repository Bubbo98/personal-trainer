import type { Technique } from '../../types';

/**
 * Exercise ↔ video links editor, pure part. A link is a training-day video
 * attached to a plan exercise; day videos without an exercise are the day's
 * "extras" (stretching, warm-up…), which the client sees too.
 */

export interface LinkVideo {
  assignmentId: number | null;
  videoId: number;
  title: string;
  /** Day the video sits in (a link may use another day's video); unset for library videos. */
  dayNumber?: number;
  techniques: Technique[];
}

export interface Suggestion extends LinkVideo {
  confidence: 'sure' | 'maybe';
  fromLibrary: boolean;
}

export interface LinkExercise {
  id: number;
  name: string;
  sets: string | null;
  reps: string | null;
  links: LinkVideo[];
  suggestions: Suggestion[];
}

export interface LinkDay {
  dayNumber: number;
  dayName: string;
  exercises: LinkExercise[];
  extras: LinkVideo[];
}

/** 'saved' = linked in the DB; 'sure' / 'maybe' = proposed automatically; 'manual' = added or confirmed by hand. */
export type ItemStatus = 'saved' | 'sure' | 'maybe' | 'manual';

export interface DraftItem extends LinkVideo {
  status: ItemStatus;
  fromLibrary: boolean;
}

/** Where a video chip lives: under an exercise, or in a day's extras. */
export type Slot = { kind: 'exercise'; id: number } | { kind: 'extra'; id: number };
export const slotKey = (slot: Slot) => `${slot.kind}-${slot.id}`;

export interface Draft {
  exercises: Record<number, DraftItem[]>;
  extras: Record<number, DraftItem[]>;
}

/** Saved links win; exercises without links start from the suggestions. */
export function initialDraft(days: LinkDay[]): Draft {
  const draft: Draft = { exercises: {}, extras: {} };
  for (const day of days) {
    for (const ex of day.exercises) {
      draft.exercises[ex.id] =
        ex.links.length > 0
          ? ex.links.map((l) => ({ ...l, status: 'saved', fromLibrary: false }))
          : ex.suggestions.map(({ confidence, fromLibrary, ...video }) => ({ ...video, techniques: video.techniques ?? [], status: confidence, fromLibrary }));
    }
    draft.extras[day.dayNumber] = day.extras.map((v) => ({ ...v, status: 'saved', fromLibrary: false }));
  }
  return draft;
}

/** Green when all videos are confirmed, amber when one needs a check, red when there's none. */
export function exerciseStatus(items: DraftItem[]): 'ok' | 'check' | 'missing' {
  if (items.length === 0) return 'missing';
  return items.some((i) => i.status === 'maybe') ? 'check' : 'ok';
}

export const hasProposals = (draft: Draft) => Object.values(draft.exercises).some((items) => items.some((i) => i.status === 'sure' || i.status === 'maybe'));

/** Day videos already in the DB that the draft drops: saving removes them from the client's days. */
export function removedCount(days: LinkDay[], draft: Draft): number {
  const original = new Set<number>();
  for (const day of days) {
    for (const v of day.extras) if (v.assignmentId) original.add(v.assignmentId);
    for (const ex of day.exercises) for (const v of [...ex.links, ...ex.suggestions]) if (v.assignmentId) original.add(v.assignmentId);
  }
  const kept = new Set<number>();
  for (const items of [...Object.values(draft.exercises), ...Object.values(draft.extras)]) {
    for (const item of items) if (item.assignmentId) kept.add(item.assignmentId);
  }
  return [...original].filter((id) => !kept.has(id)).length;
}

const itemsOf = (draft: Draft, slot: Slot) => (slot.kind === 'exercise' ? draft.exercises[slot.id] : draft.extras[slot.id]) ?? [];

function withItems(draft: Draft, slot: Slot, items: DraftItem[]): Draft {
  return slot.kind === 'exercise'
    ? { ...draft, exercises: { ...draft.exercises, [slot.id]: items } }
    : { ...draft, extras: { ...draft.extras, [slot.id]: items } };
}

/**
 * Removing a day video from an exercise keeps it in its day (it moves to the
 * extras, where it can be deleted); removing it from the extras drops it on save.
 */
export function removeItem(draft: Draft, days: LinkDay[], slot: Slot, index: number): Draft {
  const item = itemsOf(draft, slot)[index];
  let next = withItems(draft, slot, itemsOf(draft, slot).filter((_, i) => i !== index));
  if (slot.kind === 'exercise' && item?.assignmentId) {
    const dayNumber = item.dayNumber ?? days.find((d) => d.exercises.some((e) => e.id === slot.id))?.dayNumber;
    if (dayNumber != null) {
      const extraSlot: Slot = { kind: 'extra', id: dayNumber };
      const extras = itemsOf(next, extraSlot);
      if (!extras.some((e) => e.assignmentId === item.assignmentId)) next = withItems(next, extraSlot, [...extras, { ...item, status: 'saved' }]);
    }
  }
  return next;
}

/** Adds a video; a day video picked for an exercise leaves that day's extras. */
export function addItem(draft: Draft, slot: Slot, video: LinkVideo, fromLibrary: boolean): Draft {
  let next = draft;
  if (slot.kind === 'exercise' && video.assignmentId && video.dayNumber != null) {
    const extraSlot: Slot = { kind: 'extra', id: video.dayNumber };
    next = withItems(next, extraSlot, itemsOf(next, extraSlot).filter((e) => e.assignmentId !== video.assignmentId));
  }
  const items = itemsOf(next, slot);
  if (items.some((i) => i.videoId === video.videoId)) return next;
  return withItems(next, slot, [...items, { ...video, status: 'manual', fromLibrary }]);
}

export const confirmItem = (draft: Draft, slot: Slot, index: number): Draft =>
  withItems(draft, slot, itemsOf(draft, slot).map((item, i) => (i === index ? { ...item, status: 'manual' } : item)));

/** Marks every automatic proposal as checked. */
export function confirmAll(draft: Draft): Draft {
  const exercises: Record<number, DraftItem[]> = {};
  for (const [id, items] of Object.entries(draft.exercises)) {
    exercises[Number(id)] = items.map((i) => (i.status === 'sure' || i.status === 'maybe' ? { ...i, status: 'manual' } : i));
  }
  return { ...draft, exercises };
}

export function toggleTechnique(draft: Draft, slot: Slot, index: number, technique: Technique): Draft {
  return withItems(
    draft,
    slot,
    itemsOf(draft, slot).map((item, i) => {
      if (i !== index) return item;
      const has = item.techniques.some((t) => t.id === technique.id);
      return { ...item, techniques: has ? item.techniques.filter((t) => t.id !== technique.id) : [...item.techniques, technique] };
    }),
  );
}

/** Videos used in a day, by its exercises or as its extras. */
export function videosInDay(draft: Draft, day: LinkDay): Set<number> {
  const used = new Set<number>();
  for (const ex of day.exercises) for (const item of draft.exercises[ex.id] ?? []) used.add(item.videoId);
  for (const item of draft.extras[day.dayNumber] ?? []) used.add(item.videoId);
  return used;
}

/** Body of PUT /workout/admin/links/:userId. */
export function toPayload(days: LinkDay[], draft: Draft) {
  const item = (i: DraftItem) => ({ assignmentId: i.assignmentId, videoId: i.videoId, techniqueIds: i.techniques.map((t) => t.id) });
  return {
    links: days.flatMap((d) => d.exercises).map((ex) => ({ exerciseId: ex.id, videos: (draft.exercises[ex.id] ?? []).map(item) })),
    extras: days.map((d) => ({ dayNumber: d.dayNumber, videos: (draft.extras[d.dayNumber] ?? []).map(item) })),
  };
}
