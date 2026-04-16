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

  // Construct thumbnail URL
  const thumbnailUrl = video.thumbnailPath
    ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001'}/thumbnails/${video.thumbnailPath}`
    : null;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        {/* Thumbnail Image */}
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-contain"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        )}

        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {formatDuration(video.duration)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3 whitespace-pre-wrap">
            {video.description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
          <span className="capitalize font-medium">{video.category}</span>
          {(video.addedAt || video.grantedAt) && (
            <span>{getLocalizedText.addedOn} {formatDate(video.addedAt || video.grantedAt!)}</span>
          )}
        </div>
        <button
          onClick={() => onPlay(video)}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          aria-label={`${t('dashboard.playVideo')} ${video.title}`}
        >
          {React.createElement(FiPlay as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 ml-0.5" })}
          Guarda video
        </button>
      </div>
    </div>
  );
};

export default VideoCard;