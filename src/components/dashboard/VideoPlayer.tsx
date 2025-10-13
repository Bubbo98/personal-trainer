import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiClock } from 'react-icons/fi';
import { Video } from '../../types/dashboard';
import { formatDuration } from '../../utils/dashboardUtils';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const { t } = useTranslation();
  // Use signed URL from R2 if available, otherwise fallback to old path
  const videoSrc = video.signedUrl || `/videos/${video.filePath}`;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close only if clicking on the backdrop (not on the video container)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl mx-4">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white text-xl hover:text-gray-300 z-10"
          aria-label={t('dashboard.closeVideo')}
        >
          ✕
        </button>

        <div className="bg-white rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
          <video
            controls
            autoPlay
            className="w-full h-auto max-h-[60vh]"
            src={videoSrc}
            onError={() => console.error('Video loading failed:', videoSrc)}
          >
            <source src={videoSrc} type="video/mp4" />
            Il tuo browser non supporta la riproduzione video.
          </video>

          <div className="p-4 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{video.title}</h3>
            {video.description && (
              <p className="text-gray-700 mb-2 whitespace-pre-wrap">{video.description}</p>
            )}
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span className="flex items-center space-x-1">
                {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                <span>{formatDuration(video.duration)}</span>
              </span>
              <span className="capitalize">{video.category}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;