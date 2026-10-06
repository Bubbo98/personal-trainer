import { firstOfPlanIds, parseZones } from './checkins/checkinUtils';
import { pageItems } from './components/pageItems';
import { catalogIsValid } from './supplements/catalog';
import { filterUsers } from './users/filterUsers';
import { availableVideos } from './users/detail/availableVideos';
import { localMidnightIso, toInputDate } from './users/detail/dateInputs';
import { fromParsed, nextDayNumber, planIsValid, toPlanDays, toPlanPayload } from './users/detail/planEditor';
import { addItem, confirmAll, exerciseStatus, hasProposals, initialDraft, removeItem, removedCount, toPayload, type LinkDay } from './users/detail/linker';
import type { AdminUser, AdminVideo, Checkin, ServerExercise } from './types';

const user = (over: Partial<AdminUser>): AdminUser => ({
  id: 1,
  username: 'mrossi',
  email: 'mario@example.com',
  firstName: 'Mario',
  lastName: 'Rossi',
  isActive: true,
  isPaying: true,
  checkinExempt: false,
  trainerId: 1,
  createdAt: '2026-01-01',
  videoCount: 0,
  pdf: null,
  ...over,
});

describe('filterUsers', () => {
  const users = [
    user({ id: 1 }),
    user({ id: 2, firstName: 'Anna', lastName: 'Bianchi', username: 'abianchi', email: null, isPaying: false }),
    user({ id: 3, trainerId: 2, firstName: 'Luca' }),
    user({ id: 4, trainerId: null, firstName: 'Senza', lastName: 'Trainer', username: 'st' }),
  ];

  it('splits by trainer (no trainer = Joshua) and paying status', () => {
    expect(filterUsers(users, { trainerId: 1, list: 'paying', search: '' }).map((u) => u.id)).toEqual([1, 4]);
    expect(filterUsers(users, { trainerId: 1, list: 'nonPaying', search: '' }).map((u) => u.id)).toEqual([2]);
    expect(filterUsers(users, { trainerId: 2, list: 'paying', search: '' }).map((u) => u.id)).toEqual([3]);
  });

  it('searches names, full name, username and email', () => {
    expect(filterUsers(users, { trainerId: 1, list: 'paying', search: 'mario rossi' }).map((u) => u.id)).toEqual([1]);
    expect(filterUsers(users, { trainerId: 1, list: 'paying', search: 'MARIO@' }).map((u) => u.id)).toEqual([1, 4]);
    expect(filterUsers(users, { trainerId: 1, list: 'nonPaying', search: 'abian' }).map((u) => u.id)).toEqual([2]);
  });
});

describe('pageItems', () => {
  it('keeps first, last and neighbours with gaps', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(6, 12)).toEqual([1, 'gap', 4, 5, 6, 7, 8, 'gap', 12]);
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 'gap', 10]);
  });
});

describe('check-in helpers', () => {
  const checkin = (over: Partial<Checkin>): Checkin => ({ id: 1, user_id: 1, feedback_date: '2026-09-01', created_at: '2026-09-01 10:00:00', pdf_change_date: 'p1', ...over }) as Checkin;

  it('finds the first check-in of each plan version', () => {
    const list = [
      checkin({ id: 1, feedback_date: '2026-09-15' }),
      checkin({ id: 2, feedback_date: '2026-09-08', created_at: '2026-09-08 09:00:00' }),
      checkin({ id: 3, feedback_date: '2026-09-08', created_at: '2026-09-08 08:00:00' }),
      checkin({ id: 4, pdf_change_date: 'p2', feedback_date: '2026-10-01' }),
      checkin({ id: 5, pdf_change_date: null }),
      checkin({ id: 6, user_id: 2 }),
    ];
    expect([...firstOfPlanIds(list)].sort()).toEqual([3, 4, 6]);
  });

  it('parses stored zones', () => {
    expect(parseZones('["Spalla","Polso"]')).toEqual(['Spalla', 'Polso']);
    expect(parseZones(null)).toEqual([]);
    expect(parseZones('oops')).toEqual([]);
    expect(parseZones('{"a":1}')).toEqual([]);
  });
});

describe('catalogIsValid', () => {
  const product = { key: 'p', name: 'Creatina', imageUrl: '', productUrl: 'https://shop.example/creatina' };
  it('requires names and http(s) links', () => {
    expect(catalogIsValid([{ key: 'c', name: 'Creatina', products: [product] }])).toBe(true);
    expect(catalogIsValid([{ key: 'c', name: ' ', products: [product] }])).toBe(false);
    expect(catalogIsValid([{ key: 'c', name: 'X', products: [{ ...product, productUrl: 'javascript:alert(1)' }] }])).toBe(false);
    expect(catalogIsValid([{ key: 'c', name: 'X', products: [{ ...product, imageUrl: 'not a url' }] }])).toBe(false);
  });
});

describe('date inputs', () => {
  it('round-trips a calendar day in local time', () => {
    const iso = localMidnightIso('2026-10-10')!;
    expect(new Date(iso).getDate()).toBe(10);
    expect(new Date(iso).getHours()).toBe(0);
    expect(toInputDate(iso)).toBe('2026-10-10');
    expect(localMidnightIso('')).toBeNull();
    expect(toInputDate(null)).toBe('');
  });
});

describe('plan editor', () => {
  const server: ServerExercise[] = [
    { id: 2, day_number: 1, day_name: 'Giorno 1', order_index: 1, name: 'B', sets: '3', reps: '10', rest: null, notes: null, weight_slots: 2 },
    { id: 1, day_number: 1, day_name: 'Giorno 1', order_index: 0, name: 'A', sets: null, reps: null, rest: null, notes: null, weight_slots: null },
    { id: 3, day_number: 3, day_name: null, order_index: 0, name: 'C', sets: '', reps: '', rest: '', notes: '', weight_slots: 1 },
  ];

  it('groups saved exercises by day in order', () => {
    const days = toPlanDays(server, (n) => `Day ${n}`);
    expect(days.map((d) => [d.dayNumber, d.dayName, d.exercises.map((e) => e.name)])).toEqual([
      [1, 'Giorno 1', ['A', 'B']],
      [3, 'Day 3', ['C']],
    ]);
    expect(days[0].exercises[1].weightSlots).toBe(2);
    expect(nextDayNumber(days)).toBe(4);
    expect(nextDayNumber([])).toBe(1);
  });

  it('keeps ids of existing exercises in the payload and trims text', () => {
    const days = toPlanDays(server, (n) => `Day ${n}`);
    days[0].exercises[0].name = '  A bis ';
    const payload = toPlanPayload(days);
    expect(payload.days[0].exercises[0]).toEqual({ id: 1, name: 'A bis', sets: '', reps: '', rest: '', notes: '', weightSlots: 1 });
    const parsed = toPlanPayload(fromParsed([{ dayNumber: 1, dayName: 'G1', exercises: [{ name: 'X', sets: '4' }] }]));
    expect(parsed.days[0].exercises[0]).not.toHaveProperty('id');
  });

  it('rejects exercises without a name', () => {
    expect(planIsValid(toPlanDays(server, String))).toBe(true);
    expect(planIsValid(fromParsed([{ dayNumber: 1, dayName: 'G', exercises: [{ name: ' ' }] }]))).toBe(false);
  });
});

describe('availableVideos', () => {
  const video = (id: number, title: string, over: Partial<AdminVideo> = {}): AdminVideo => ({ id, title, description: null, filePath: '', duration: 0, category: 'palestra', createdAt: '', ...over });
  const library = [video(1, 'Panca 25'), video(2, 'Squat 5', { muscleGroup: 'Quadricipite' }), video(3, 'Plank', { category: 'corpoLibero' }), video(4, 'Stacco 15')];
  const day = { id: 1, dayNumber: 1, dayName: null, videos: [{ ...video(4, 'Stacco 15'), assignmentId: 1, orderIndex: 0, addedAt: '', techniques: [], groupId: null, groupLabel: null }] };

  it('excludes the day videos and applies the filters', () => {
    expect(availableVideos(library, day, { search: '', category: '', muscleGroup: '' }).map((v) => v.id)).toEqual([1, 2, 3]);
    expect(availableVideos(library, day, { search: '', category: 'corpoLibero', muscleGroup: '' }).map((v) => v.id)).toEqual([3]);
    expect(availableVideos(library, day, { search: '', category: '', muscleGroup: 'Quadricipite' }).map((v) => v.id)).toEqual([2]);
    expect(availableVideos(library, day, { search: '5', category: '', muscleGroup: '' }).map((v) => v.id)).toEqual([2, 1]);
  });
});

describe('exercise ↔ video linker', () => {
  const days: LinkDay[] = [
    {
      dayNumber: 1,
      dayName: 'Giorno 1',
      exercises: [
        { id: 10, name: 'Panca', sets: '4', reps: '8', links: [{ assignmentId: 100, videoId: 1, title: 'Panca', dayNumber: 1, techniques: [] }], suggestions: [] },
        {
          id: 11,
          name: 'Croci',
          sets: null,
          reps: null,
          links: [],
          suggestions: [{ assignmentId: 101, videoId: 2, title: 'Croci?', dayNumber: 1, techniques: [], confidence: 'maybe', fromLibrary: false }],
        },
        { id: 12, name: 'Dip', sets: null, reps: null, links: [], suggestions: [] },
      ],
      extras: [{ assignmentId: 102, videoId: 3, title: 'Stretching', dayNumber: 1, techniques: [] }],
    },
  ];

  it('starts from saved links, then suggestions', () => {
    const draft = initialDraft(days);
    expect(draft.exercises[10][0].status).toBe('saved');
    expect(draft.exercises[11][0].status).toBe('maybe');
    expect([10, 11, 12].map((id) => exerciseStatus(draft.exercises[id]))).toEqual(['ok', 'check', 'missing']);
    expect(hasProposals(draft)).toBe(true);
    expect(hasProposals(confirmAll(draft))).toBe(false);
  });

  it('moves a removed day video to the extras instead of dropping it', () => {
    const draft = removeItem(initialDraft(days), days, { kind: 'exercise', id: 10 }, 0);
    expect(draft.exercises[10]).toEqual([]);
    expect(draft.extras[1].map((v) => v.videoId)).toEqual([3, 1]);
    expect(removedCount(days, draft)).toBe(0);
    const dropped = removeItem(draft, days, { kind: 'extra', id: 1 }, 1);
    expect(removedCount(days, dropped)).toBe(1);
  });

  it('takes a day video out of the extras when linked to an exercise, without duplicates', () => {
    const extra = days[0].extras[0];
    let draft = addItem(initialDraft(days), { kind: 'exercise', id: 12 }, extra, false);
    draft = addItem(draft, { kind: 'exercise', id: 12 }, extra, false);
    expect(draft.exercises[12].map((v) => v.videoId)).toEqual([3]);
    expect(draft.extras[1]).toEqual([]);
    expect(toPayload(days, draft).links.find((l) => l.exerciseId === 12)!.videos).toEqual([{ assignmentId: 102, videoId: 3, techniqueIds: [] }]);
  });
});
