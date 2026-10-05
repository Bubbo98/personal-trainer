import { numberMatchScore } from '../../../lib/search';
import type { Video } from '../types';

/** Categories of the videos with their counts, alphabetical. */
export function videoCategories(videos: Video[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const video of videos) {
    if (video.category) counts.set(video.category, (counts.get(video.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Videos of a category matching a search in title or description. Searching a
 * bare number ("5") orders titles by the matching number (5, 15, 25…).
 */
export function filterVideos(videos: Video[], { category, query }: { category: string | null; query: string }): Video[] {
  const term = query.trim().toLowerCase();
  let result = category ? videos.filter((v) => v.category === category) : videos;
  if (term) {
    result = result.filter((v) => v.title.toLowerCase().includes(term) || (v.description ?? '').toLowerCase().includes(term));
    if (/^\d+$/.test(term)) result = [...result].sort((a, b) => numberMatchScore(a.title, term) - numberMatchScore(b.title, term));
  }
  return result;
}
