import { API_BASE_URL } from '../config';

interface VideoWithThumbnail {
  id: number;
  thumbnailKey?: string | null;
}

/**
 * URL of a video's thumbnail, or null when it has none. The backend redirects
 * to the image on R2; the key in the query string makes browsers reload it
 * when it changes.
 */
export function thumbnailUrl(video: VideoWithThumbnail): string | null {
  if (!video.thumbnailKey) return null;
  return `${API_BASE_URL}/thumbnails/${video.id}?v=${encodeURIComponent(video.thumbnailKey)}`;
}

const MAX_WIDTH = 800;

/**
 * Shrinks a photo in the browser before upload (max 800px wide, WebP — or
 * JPEG where the browser can't encode WebP), so thumbnails stay ~50KB.
 */
export async function resizeForThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await toBlob('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob('image/jpeg');
  if (!jpeg) throw new Error('Impossibile elaborare l\'immagine');
  return jpeg;
}
