import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlay, FiInfo, FiX, FiChevronRight } from 'react-icons/fi';
import { Video, TechniqueVideo } from '../../types/dashboard';
import { formatDuration, formatDate, getLocalizedText } from '../../utils/dashboardUtils';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
}

const TechniqueModal: React.FC<{ technique: TechniqueVideo; onClose: () => void }> = ({ technique, onClose }) => {
  const videoSrc = technique.signedUrl || null;

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-y-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {React.createElement(FiInfo as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-blue-500" })}
            <h3 className="font-bold text-gray-900 text-base">{technique.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
            {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
          </button>
        </div>

        {videoSrc && (
          <div className="bg-black flex-shrink-0">
            <video
              controls
              autoPlay
              src={videoSrc}
              className="w-full max-h-[50vh]"
            />
          </div>
        )}

        {technique.description && (
          <div className="px-5 py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{technique.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TechniquePickerModal: React.FC<{
  techniques: TechniqueVideo[];
  onSelect: (t: TechniqueVideo) => void;
  onClose: () => void;
}> = ({ techniques, onSelect, onClose }) => {
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Scegli una tecnica</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {techniques.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                {React.createElement(FiInfo as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-blue-500 flex-shrink-0" })}
                <span className="font-medium text-gray-900 text-sm">{t.title}</span>
              </div>
              {React.createElement(FiChevronRight as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  const { t } = useTranslation();
  const [activeTechnique, setActiveTechnique] = useState<TechniqueVideo | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const techniques = video.techniques || [];

  const handleTechniqueClick = () => {
    if (techniques.length === 1) {
      setActiveTechnique(techniques[0]);
    } else if (techniques.length > 1) {
      setShowPicker(true);
    }
  };

  const thumbnailUrl = video.thumbnailPath
    ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001'}/thumbnails/${video.thumbnailPath}`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
        <div className="relative aspect-video bg-gray-100">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onPlay(video)}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              aria-label={`${t('dashboard.playVideo')} ${video.title}`}
            >
              {React.createElement(FiPlay as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 ml-0.5" })}
              Guarda video
            </button>

            {techniques.length > 0 && (
              <button
                onClick={handleTechniqueClick}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                {React.createElement(FiInfo as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                {techniques.length === 1 ? 'Tecnica' : `Tecniche (${techniques.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTechnique && (
        <TechniqueModal
          technique={activeTechnique}
          onClose={() => setActiveTechnique(null)}
        />
      )}

      {showPicker && (
        <TechniquePickerModal
          techniques={techniques}
          onSelect={(t) => { setShowPicker(false); setActiveTechnique(t); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
};

export default VideoCard;
