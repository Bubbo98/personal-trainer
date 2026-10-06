/**
 * Direct browser uploads to R2 through presigned PUT URLs. XHR instead of
 * fetch: fetch can't report upload progress.
 */
export function putFile(url: string, body: Blob, contentType: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`))));
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Aborted')));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(body);
  });
}

/** Duration in whole seconds read from a local video file; 0 when the browser can't tell. */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(seconds) ? Math.floor(seconds) : 0);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done(0);
    video.src = url;
  });
}

const MAX_THUMBNAIL_WIDTH = 800;

/**
 * Shrinks a photo before upload (max 800px wide, WebP — JPEG where the
 * browser can't encode WebP), so thumbnails stay around 50 KB.
 */
export async function resizeForThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_THUMBNAIL_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas not supported');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await toBlob('image/webp');
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await toBlob('image/jpeg');
  if (!jpeg) throw new Error('Image encoding failed');
  return jpeg;
}
