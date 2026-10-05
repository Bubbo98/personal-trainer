import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FiClock } from 'react-icons/fi';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatDuration } from '../../../lib/format';
import { keys } from '../queries';

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
  const [failed, setFailed] = useState(false);

  // A failure is usually an expired signed URL: fresh lists bring new ones
  const reload = () => {
    queryClient.invalidateQueries({ queryKey: keys.videos });
    queryClient.invalidateQueries({ queryKey: keys.trainingDays });
    onClose();
  };

  return (
    <Modal title={video.title} onClose={onClose} size="xl" variant="media">
      <div className="bg-black">
        {video.signedUrl && !failed ? (
          <video controls autoPlay playsInline className="w-full max-h-[60vh]" src={video.signedUrl} onError={() => setFailed(true)}>
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
