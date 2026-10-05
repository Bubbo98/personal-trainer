import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiSearch, FiX } from 'react-icons/fi';
import Pills from '../../../components/ui/Pills';
import { EmptyState } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/Field';
import VideoCard from '../components/VideoCard';
import type { Video } from '../types';
import { filterVideos, videoCategories } from './videoSearch';

/** All the client's videos with category filter, search and a few stats. */
const VideoLibrary = ({ videos, onPlay }: { videos: Video[]; onPlay: (video: Video) => void }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(() => videoCategories(videos), [videos]);
  const results = useMemo(() => filterVideos(videos, { category, query: deferredQuery }), [videos, category, deferredQuery]);
  const searching = deferredQuery.trim() !== '';

  if (videos.length === 0) {
    return <EmptyState icon={<FiGrid className="w-14 h-14" aria-hidden />} title={t('videos.emptyTitle')} message={t('videos.emptyMessage')} />;
  }

  return (
    <div>
      {categories.length > 0 && (
        <Pills
          label={t('videos.categoriesLabel')}
          value={category}
          onChange={setCategory}
          options={[
            { value: null, label: t('videos.allCategories'), count: videos.length },
            ...categories.map((c) => ({ value: c.name, label: <span className="capitalize">{c.name}</span>, count: c.count })),
          ]}
        />
      )}

      <div className="relative mb-6" role="search">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('videos.searchPlaceholder')}
          aria-label={t('videos.searchLabel')}
          className={`${inputClass} pl-10 pr-10 py-3`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={t('common:common.clearSearch')}
          >
            <FiX className="w-5 h-5" aria-hidden />
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<FiGrid className="w-14 h-14" aria-hidden />}
          title={searching ? t('videos.noResultsTitle') : t('videos.noCategoryTitle')}
          message={searching ? t('videos.noResultsMessage', { query: deferredQuery.trim() }) : t('videos.noCategoryMessage')}
          action={
            searching && (
              <button type="button" onClick={() => setQuery('')} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                {t('common:common.clearSearch')}
              </button>
            )
          }
        />
      ) : (
        <>
          {(searching || category) && (
            <p className="mb-4 text-sm text-gray-600" aria-live="polite">
              {t('videos.resultsCount', { count: results.length })}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((video) => (
              <VideoCard key={video.id} video={video} onPlay={onPlay} />
            ))}
          </div>
        </>
      )}

      <section className="mt-16 bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('videos.statsTitle')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <Stat label={t('videos.statsVideos')} value={videos.length} />
          <Stat label={t('videos.statsCategories')} value={categories.length} />
          <Stat label={t('videos.statsMinutes')} value={Math.floor(videos.reduce((sum, v) => sum + (v.duration || 0), 0) / 60)} />
        </dl>
      </section>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col-reverse">
    <dt className="text-gray-600">{label}</dt>
    <dd className="text-3xl font-bold text-gray-900">{value}</dd>
  </div>
);

export default VideoLibrary;
