import React, { useRef, useState } from 'react';
import { FiImage, FiLoader, FiUpload } from 'react-icons/fi';
import { apiCall } from '../../utils/adminUtils';
import { thumbnailUrl, resizeForThumbnail } from '../../utils/thumbnails';

type IconType = React.ComponentType<{ className?: string }>;
const icon = (Icon: unknown, className: string) => React.createElement(Icon as IconType, { className });

interface Props {
  video: { id: number; title: string; thumbnailKey?: string | null; thumbnailPath?: string | null };
  /** Called with the new R2 key once the photo is uploaded and saved. */
  onChange: (thumbnailKey: string) => void;
}

/**
 * Shows a video's photo and lets the admin replace it: click or drop an image,
 * it's shrunk in the browser, uploaded straight to R2 and saved on the video.
 */
const ThumbnailUploader: React.FC<Props> = ({ video, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  // Only R2 photos count: an old local file name may point to nothing
  const src = video.thumbnailKey ? thumbnailUrl(video) : null;

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Scegli un\'immagine (JPG, PNG, WebP…)');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const blob = await resizeForThumbnail(file);
      const { data } = await apiCall(`/admin/videos/${video.id}/thumbnail/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ contentType: blob.type }),
      });
      const put = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
      if (!put.ok) throw new Error(`Upload non riuscito (${put.status})`);
      await apiCall(`/admin/videos/${video.id}/thumbnail`, { method: 'PUT', body: JSON.stringify({ key: data.key }) });
      setBroken(false);
      onChange(data.key);
    } catch (err: any) {
      console.error('Thumbnail upload failed:', err);
      setError(err.message || 'Upload non riuscito');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={`group relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-colors ${
          dragging ? 'border-gray-900 bg-gray-100' : 'border-gray-300 bg-gray-50 hover:border-gray-500'
        }`}
        title="Clicca o trascina qui una foto"
      >
        {src && !broken ? (
          <img src={src} alt={video.title} onError={() => setBroken(true)} className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400 text-sm">
            {icon(FiImage, 'w-8 h-8')}
            Nessuna foto
          </span>
        )}
        <span className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-white text-sm font-medium transition-opacity ${
          uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {uploading ? icon(FiLoader, 'w-4 h-4 animate-spin') : icon(FiUpload, 'w-4 h-4')}
          {uploading ? 'Caricamento…' : src && !broken ? 'Cambia foto' : 'Carica foto'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default ThumbnailUploader;
