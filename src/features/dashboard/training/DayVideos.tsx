import { useTranslation } from 'react-i18next';
import VideoCard from '../components/VideoCard';
import type { TrainingDay, Video } from '../types';
import { groupDayVideos } from '../workout';

const GRID = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

/** Training days as video grids (clients whose plan has no parsed exercises). */
const DayVideos = ({ days, onPlay, onShowAll }: { days: TrainingDay[]; onPlay: (video: Video) => void; onShowAll?: () => void }) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">{t('days.title')}</h2>
        {onShowAll && (
          <button type="button" onClick={onShowAll} className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline">
            {t('days.viewAllVideos')}
          </button>
        )}
      </div>

      {days.map((day) => (
        <section key={day.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
            <h3 className="text-xl font-bold text-white">{day.dayName || t('workout.dayFallback', { number: day.dayNumber })}</h3>
            <p className="text-sm text-gray-300 mt-1">{t('workout.videoCount', { count: day.videos.length })}</p>
          </div>

          {day.videos.length === 0 ? (
            <p className="p-8 text-center text-gray-500">{t('days.noVideos')}</p>
          ) : (
            <div className="p-4 sm:p-6 space-y-4">
              {groupDayVideos(day.videos).map((item) =>
                item.type === 'videos' ? (
                  <div key={item.key} className={GRID}>
                    {item.videos.map((video) => (
                      <VideoCard key={video.assignmentId ?? video.id} video={video} onPlay={onPlay} />
                    ))}
                  </div>
                ) : (
                  <div key={item.key} className="border-2 border-indigo-200 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-widest">{item.label || t('days.superset')}</span>
                      <span className="text-xs text-indigo-100">— {t('days.groupCount', { count: item.videos.length })}</span>
                    </div>
                    <div className={`p-3 sm:p-4 bg-indigo-50/40 ${GRID}`}>
                      {item.videos.map((video) => (
                        <VideoCard key={video.assignmentId ?? video.id} video={video} onPlay={onPlay} />
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

export default DayVideos;
