import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronRight, FiInfo, FiPlay } from 'react-icons/fi';
import Modal from '../../../components/ui/Modal';
import { formatDate, formatDuration } from '../../../lib/format';
import { thumbnailUrl } from '../../../lib/thumbnails';
import type { Technique, Video } from '../types';
import VideoPlayerModal from './VideoPlayerModal';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  /** 'card' = full card for grids; 'row' = compact row under an exercise. */
  variant?: 'card' | 'row';
}

const Thumbnail = ({ video, fit }: { video: Video; fit: 'cover' | 'contain' }) => {
  const [broken, setBroken] = useState(false);
  const src = thumbnailUrl(video);
  if (!src || broken) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
      onError={() => setBroken(true)}
    />
  );
};

/** "Technique" button: one technique opens directly, several open a picker first. */
const TechniqueButton = ({ techniques, compact }: { techniques: Technique[]; compact?: boolean }) => {
  const { t } = useTranslation('dashboard');
  const [picking, setPicking] = useState(false);
  const [playing, setPlaying] = useState<Technique | null>(null);

  if (techniques.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (techniques.length === 1 ? setPlaying(techniques[0]) : setPicking(true))}
        className={`flex-shrink-0 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'
        }`}
      >
        <FiInfo className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden />
        {techniques.length === 1 ? t('videos.technique') : t('videos.techniques', { count: techniques.length })}
      </button>

      {picking && (
        <Modal title={t('videos.chooseTechnique')} onClose={() => setPicking(false)} size="sm">
          <ul className="divide-y divide-gray-100">
            {techniques.map((technique) => (
              <li key={technique.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicking(false);
                    setPlaying(technique);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-5 py-3.5 hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 font-medium text-gray-900 text-sm">
                    <FiInfo className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden />
                    {technique.title}
                  </span>
                  <FiChevronRight className="w-4 h-4 text-gray-400" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {playing && <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />}
    </>
  );
};

const VideoCard = ({ video, onPlay, variant = 'card' }: VideoCardProps) => {
  const { t } = useTranslation('dashboard');
  const techniques = video.techniques ?? [];
  const playLabel = t('videos.play', { title: video.title });

  if (variant === 'row') {
    return (
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-2">
        <button
          type="button"
          onClick={() => onPlay(video)}
          className="relative flex-shrink-0 w-24 aspect-video rounded-md bg-gray-100 overflow-hidden"
          aria-label={playLabel}
        >
          <Thumbnail video={video} fit="cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow">
              <FiPlay className="w-4 h-4 text-gray-900 ml-0.5" aria-hidden />
            </span>
          </span>
        </button>
        <button type="button" onClick={() => onPlay(video)} className="flex-1 min-w-0 text-left">
          <span className="block text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{video.title}</span>
          <span className="block text-xs text-gray-500 mt-0.5">{formatDuration(video.duration)}</span>
        </button>
        <TechniqueButton techniques={techniques} compact />
      </div>
    );
  }

  const added = video.addedAt || video.grantedAt;

  return (
    // h-full + flex column: cards in a grid row share a height, buttons stay at the bottom
    <article className="h-full flex flex-col bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        <Thumbnail video={video} fit="contain" />
        <span className="absolute bottom-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-sm">{formatDuration(video.duration)}</span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
        {video.description && <p className="text-gray-600 text-sm mb-3 line-clamp-3 whitespace-pre-wrap">{video.description}</p>}
        <div className="mt-auto pt-1 flex items-center justify-between gap-2 text-sm text-gray-500">
          <span className="capitalize font-medium">{video.category}</span>
          {added && <span>{t('videos.addedOn', { date: formatDate(added) })}</span>}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onPlay(video)}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 border border-gray-900 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            aria-label={playLabel}
          >
            <FiPlay className="w-4 h-4 ml-0.5" aria-hidden />
            {t('videos.watch')}
          </button>
          <TechniqueButton techniques={techniques} />
        </div>
      </div>
    </article>
  );
};

export default VideoCard;
