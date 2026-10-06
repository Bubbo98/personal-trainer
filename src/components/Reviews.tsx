import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FiChevronLeft, FiChevronRight, FiStar } from 'react-icons/fi';
import { publicApi } from '../lib/api';
import { formatDate, parseDate } from '../lib/format';

interface PublicReview {
  id: number;
  rating: number;
  title: string | null;
  comment: string;
  createdAt: string;
  author: { displayName: string };
}

const Stars = ({ rating, label }: { rating: number; label: string }) => (
  <span className="flex items-center gap-1" role="img" aria-label={label}>
    {[1, 2, 3, 4, 5].map((n) => (
      <FiStar key={n} className={`w-4 h-4 ${n <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} aria-hidden />
    ))}
  </span>
);

/** 1 review per page on phones, 3 on larger screens. */
function usePageSize() {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const onChange = () => setWide(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return wide ? 3 : 1;
}

const monthYear = (value: string) => {
  const date = parseDate(value);
  return date ? formatDate(date, 'long').replace(/^\d+\s/, '') : '';
};

/**
 * Client reviews ("featured" on the home page, all approved ones on About).
 * Nothing is rendered when there are no reviews to show.
 */
const Reviews = ({ type = 'featured' }: { type?: 'featured' | 'public' }) => {
  const { t } = useTranslation(['public', 'dashboard']);
  const reviews = useQuery({
    queryKey: ['public', 'reviews', type],
    queryFn: ({ signal }) => publicApi.get<{ reviews: PublicReview[] }>(`/reviews/${type}`, signal).then((d) => d.reviews),
    staleTime: 10 * 60_000,
  });
  const pageSize = usePageSize();
  const [page, setPage] = useState(0);

  const list = reviews.data ?? [];
  if (reviews.isPending || list.length === 0) return null;

  const pages = Math.ceil(list.length / pageSize);
  const current = Math.min(page, pages - 1);

  return (
    <section className="py-16 lg:py-20 bg-gray-50" aria-labelledby="reviews-title">
      <div className="max-w-7xl mx-auto px-6 lg:px-16">
        <h2 id="reviews-title" className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-4">
          {t('reviews.title')}
        </h2>
        <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">{t('reviews.subtitle')}</p>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6" aria-live="polite">
          {list.slice(current * pageSize, current * pageSize + pageSize).map((review) => (
            <li key={review.id} className="bg-white rounded-xl shadow-lg p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Stars rating={review.rating} label={t('dashboard:review.ratingValue', { value: review.rating })} />
                <span className="text-sm text-gray-500">{monthYear(review.createdAt)}</span>
              </div>
              {review.title && <h3 className="font-semibold text-gray-900 mb-3">{review.title}</h3>}
              <blockquote className="text-gray-700 mb-4 flex-grow leading-relaxed whitespace-pre-line">“{review.comment}”</blockquote>
              <p className="pt-4 border-t border-gray-100 font-medium text-gray-900">{review.author.displayName}</p>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label={t('reviews.previousReviews')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              <FiChevronLeft className="w-5 h-5" aria-hidden />
            </button>
            <div className="flex gap-2">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`${t('reviews.goToPage')} ${i + 1}`}
                  aria-current={i === current || undefined}
                  className={`w-3 h-3 rounded-full transition-colors ${i === current ? 'bg-gray-900' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current === pages - 1}
              aria-label={t('reviews.nextReviews')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              <FiChevronRight className="w-5 h-5" aria-hidden />
            </button>
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">{t('reviews.shareExperience')}</p>
          <Link to="/booking" className="inline-block bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors font-medium">
            {t('reviews.startJourney')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
