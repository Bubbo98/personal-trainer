import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FiClock } from 'react-icons/fi';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatDuration } from '../../../lib/format';
import { keys } from '../queries';

/** The same video's URL in the refreshed lists (signed URLs differ only in the query string). */
const findFreshUrl = (data: unknown, path: string): string | null => {
  if (typeof data === 'string') return data.split('?')[0] === path ? data : null;
  if (!data || typeof data !== 'object') return null;
  for (const value of Object.values(data)) {
    const found = findFreshUrl(value, path);
    if (found) return found;
  }
  return null;
};

interface PlayableVideo {
  title: string;
  description?: string | null;
  signedUrl?: string | null;
  duration?: number;
  category?: string;
}

/** Plays a video (or technique) in a dialog. */
const VideoPlayerModal = ({ video, onClose }: { video: PlayableVideo; onClose: () => void }) => {
  const { t } = useTranslation('dashboard');
  const queryClient = useQueryClient();
  const [src, setSrc] = useState(video.signedUrl);
  const [retried, setRetried] = useState(false);
  const [failed, setFailed] = useState(false);

  // A failure is usually an expired signed URL: once, fetch fresh lists and play again with the new URL
  const onError = async () => {
    if (retried || !src) return setFailed(true);
    setRetried(true);
    await Promise.all([keys.videos, keys.trainingDays].map((queryKey) => queryClient.refetchQueries({ queryKey })));
    const path = src.split('?')[0];
    const fresh = [keys.videos, keys.trainingDays].map((key) => findFreshUrl(queryClient.getQueryData(key), path)).find(Boolean);
    if (fresh && fresh !== src) setSrc(fresh);
    else setFailed(true);
  };

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: keys.videos });
    queryClient.invalidateQueries({ queryKey: keys.trainingDays });
    onClose();
  };

  return (
    <Modal title={video.title} onClose={onClose} size="xl" variant="media">
      <div className="bg-black">
        {src && !failed ? (
          <video controls autoPlay playsInline className="w-full max-h-[60vh]" src={src} onError={onError}>
            {t('videos.unsupported')}
          </video>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-4 text-gray-300 px-6 text-center">
            <p>{t('videos.playbackError')}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              {t('videos.reload')}
            </Button>
          </div>
        )}
      </div>
      {(video.description || video.duration !== undefined) && (
        <div className="px-5 py-4">
          {video.description && <p className="text-gray-700 mb-3 whitespace-pre-wrap leading-relaxed">{video.description}</p>}
          {video.duration !== undefined && (
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <FiClock className="w-4 h-4" aria-hidden />
                {formatDuration(video.duration)}
              </span>
              {video.category && <span className="capitalize">{video.category}</span>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default VideoPlayerModal;
