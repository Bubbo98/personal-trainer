import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiImage, FiUpload } from 'react-icons/fi';
import Spinner from '../../../components/ui/Spinner';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { thumbnailUrl } from '../../../lib/thumbnails';
import { putFile, resizeForThumbnail } from './upload';

interface Props {
  video: { id: number; title: string; thumbnailKey?: string | null };
  /** Called with the new R2 key once the photo is uploaded and saved. */
  onChange: (thumbnailKey: string) => void;
}

/**
 * A video's photo; click or drop an image to replace it: it's shrunk in the
 * browser, uploaded straight to R2 and saved on the video.
 */
const ThumbnailUploader = ({ video, onChange }: Props) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenKey, setBrokenKey] = useState<string | null>(null);

  const src = thumbnailUrl(video);
  const showImage = src && brokenKey !== video.thumbnailKey;

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t('videos.thumbnail.onlyImages'));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      let blob: Blob;
      try {
        blob = await resizeForThumbnail(file);
      } catch {
        setError(t('videos.thumbnail.processFailed'));
        return;
      }
      const { uploadUrl, key } = await adminApi.post<{ uploadUrl: string; key: string }>(`/admin/videos/${video.id}/thumbnail/upload-url`, {
        contentType: blob.type,
      });
      await putFile(uploadUrl, blob, blob.type);
      await adminApi.put(`/admin/videos/${video.id}/thumbnail`, { key });
      onChange(key);
    } catch (err) {
      setError(errorMessage(err, t('videos.thumbnail.failed')));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        aria-label={`${showImage ? t('videos.thumbnail.change') : t('videos.thumbnail.upload')}: ${video.title}`}
        title={t('videos.thumbnail.dropHint')}
        className={`group relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-colors ${
          dragging ? 'border-gray-900 bg-gray-100' : 'border-gray-300 bg-gray-50 hover:border-gray-500'
        }`}
      >
        {showImage ? (
          <img src={src} alt="" loading="lazy" onError={() => setBrokenKey(video.thumbnailKey ?? null)} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400 text-sm">
            <FiImage className="w-8 h-8" aria-hidden />
            {t('videos.thumbnail.none')}
          </span>
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-white text-sm font-medium transition-opacity ${
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        >
          {uploading ? <Spinner size="sm" className="border-white" /> : <FiUpload className="w-4 h-4" aria-hidden />}
          {uploading ? t('videos.thumbnail.uploading') : showImage ? t('videos.thumbnail.change') : t('videos.thumbnail.upload')}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ThumbnailUploader;
