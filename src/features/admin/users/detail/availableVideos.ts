import { numberMatchScore } from '../../../../lib/search';
import type { AdminVideo, TrainingDay } from '../../types';

/** Library videos not in the day, filtered by text, category and muscle group. */
export function availableVideos(library: AdminVideo[], day: TrainingDay, filters: { search: string; category: string; muscleGroup: string }) {
  const inDay = new Set(day.videos.map((v) => v.id));
  const term = filters.search.trim().toLowerCase();
  let list = library.filter(
    (v) =>
      !inDay.has(v.id) &&
      (!filters.category || v.category === filters.category) &&
      (!filters.muscleGroup || v.muscleGroup === filters.muscleGroup) &&
      (!term || v.title.toLowerCase().includes(term) || v.category.toLowerCase().includes(term) || (v.description ?? '').toLowerCase().includes(term)),
  );
  if (/^\d+$/.test(term)) list = [...list].sort((a, b) => numberMatchScore(a.title, term) - numberMatchScore(b.title, term));
  return list;
}
