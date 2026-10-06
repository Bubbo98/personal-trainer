import { API_BASE_URL } from '../config';

/**
 * URL of a video's thumbnail, or null when it has none. The backend redirects
 * to the image on R2; the key in the query string makes browsers reload it
 * when it changes.
 */
export function thumbnailUrl(video: { id: number; thumbnailKey?: string | null }): string | null {
  if (!video.thumbnailKey) return null;
  return `${API_BASE_URL}/thumbnails/${video.id}?v=${encodeURIComponent(video.thumbnailKey)}`;
}
