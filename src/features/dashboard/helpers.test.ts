import itDashboard from '../../locales/it/dashboard.json';
import enDashboard from '../../locales/en/dashboard.json';
import { numberMatchScore } from '../../lib/search';
import { ARTICULAR_ZONES, MUSCULAR_ZONES, nextCheckin, parseWeight } from './checkin/checkin';
import { filterVideos, videoCategories } from './training/videoSearch';
import { ANSWER_OPTIONS, type Video } from './types';

const video = (id: number, title: string, category = 'Palestra', description = ''): Video => ({
  id,
  title,
  description,
  category,
  filePath: '',
  duration: 0,
  createdAt: '',
});

describe('video search', () => {
  const videos = [video(1, 'Squat 25'), video(2, 'Panca 5', 'CorpoLibero'), video(3, 'Stacco (1°) - 15', 'Palestra', 'tecnica squat'), video(4, 'Angolo 45°')];

  it('counts categories', () => {
    expect(videoCategories(videos)).toEqual([
      { name: 'CorpoLibero', count: 1 },
      { name: 'Palestra', count: 3 },
    ]);
  });

  it('filters by category and text in title or description', () => {
    expect(filterVideos(videos, { category: 'CorpoLibero', query: '' }).map((v) => v.id)).toEqual([2]);
    expect(filterVideos(videos, { category: null, query: ' SQUAT ' }).map((v) => v.id)).toEqual([1, 3]);
  });

  it('orders a bare number search by the matching number', () => {
    expect(filterVideos(videos, { category: null, query: '5' }).map((v) => v.id)).toEqual([2, 3, 1, 4]);
  });

  it('ignores angle and set markers when ranking numbers', () => {
    expect(numberMatchScore('Angolo 45°', '4')).toBe(Infinity);
    expect(numberMatchScore('(1°) - 30/34 ; (2°) - 38/41', '3')).toBe(30);
  });
});

describe('nextCheckin', () => {
  const now = new Date('2026-10-05T12:00:00Z');

  it('waits one week after a plan update', () => {
    const next = nextCheckin({ shouldShow: false, reason: 'too_soon', pdfUpdatedAt: '2026-10-02T12:00:00.000Z' }, now)!;
    expect(next.date.toISOString()).toBe('2026-10-09T12:00:00.000Z');
    expect(next.daysLeft).toBe(4);
    expect(Math.round(next.progress)).toBe(43);
  });

  it('waits two weeks after the last check', () => {
    const next = nextCheckin({ shouldShow: false, reason: 'too_soon_since_last', lastFeedbackAt: '2026-09-28T12:00:00.000Z' }, now)!;
    expect(next.daysLeft).toBe(7);
    expect(next.progress).toBe(50);
  });

  it('has nothing to count for other reasons', () => {
    expect(nextCheckin({ shouldShow: false, reason: 'exempt' }, now)).toBeNull();
    expect(nextCheckin({ shouldShow: false, reason: 'too_soon' }, now)).toBeNull();
  });
});

describe('parseWeight', () => {
  it.each([
    ['72.5', 72.5],
    ['72,5', 72.5],
    [' 80 ', 80],
    ['20', 20],
    ['300', 300],
    ['19.9', null],
    ['301', null],
    ['abc', null],
    ['', null],
  ])('%s → %s', (input, expected) => {
    expect(parseWeight(input)).toBe(expected);
  });
});

describe('check-in translations', () => {
  it('has a label for every answer and zone in both languages', () => {
    for (const bundle of [itDashboard, enDashboard]) {
      for (const [kind, options] of Object.entries(ANSWER_OPTIONS)) {
        const answers = bundle.checkin.answers[kind as keyof typeof bundle.checkin.answers] as Record<string, string>;
        for (const option of options) expect(answers[option], `${kind}.${option}`).toBeTruthy();
      }
      for (const zone of [...MUSCULAR_ZONES, ...ARTICULAR_ZONES]) expect(bundle.checkin.zones[zone], zone).toBeTruthy();
    }
  });
});
