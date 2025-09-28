import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlay } from 'react-icons/fi';
import { Video } from '../../types/dashboard';
import { formatDuration, formatDate, getLocalizedText } from '../../utils/dashboardUtils';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => onPlay(video)}
            className="bg-gray-900 text-white p-4 rounded-full hover:bg-gray-800 transition-colors shadow-lg"
            aria-label={`${t('dashboard.playVideo')} ${video.title}`}
          >
            {React.createElement(FiPlay as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 ml-1" })}
          </button>
        </div>

        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {formatDuration(video.duration)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
            {video.description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="capitalize font-medium">{video.category}</span>
          <span>{getLocalizedText.addedOn} {formatDate(video.grantedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;