import { useTranslation } from 'react-i18next';
import { FiExternalLink, FiStar } from 'react-icons/fi';
import { GOOGLE_PROFILE, GOOGLE_REVIEWS } from '../lib/googleReviews';

const Stars = ({ value, className = 'w-5 h-5' }: { value: number; className?: string }) => (
  <span className="flex gap-0.5" aria-hidden>
    {[1, 2, 3, 4, 5].map((n) => (
      <FiStar key={n} className={`${className} ${n <= Math.round(value) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ))}
  </span>
);

/** Rating and reviews from Google (static: in the prerendered page, no third-party request). */
const GoogleReviews = () => {
  const { t, i18n } = useTranslation('public');
  const rating = GOOGLE_PROFILE.rating.toLocaleString(i18n.resolvedLanguage, { minimumFractionDigits: 1 });

  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="google-reviews-title">
      <div className="max-w-7xl mx-auto px-6 lg:px-16 text-center">
        <h2 id="google-reviews-title" className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          {t('reviews.title')}
        </h2>
        <div className="flex items-center justify-center gap-3 mb-10" role="img" aria-label={t('reviews.googleRating', { rating, count: GOOGLE_PROFILE.count })}>
          <span className="text-3xl font-bold text-gray-900">{rating}</span>
          <Stars value={GOOGLE_PROFILE.rating} className="w-6 h-6" />
          <span className="text-gray-600">{t('reviews.googleCount', { count: GOOGLE_PROFILE.count })}</span>
        </div>

        {GOOGLE_REVIEWS.length > 0 && (
          <ul className="grid gap-6 md:grid-cols-2 text-left mb-10">
            {GOOGLE_REVIEWS.map((review) => (
              <li key={review.author} className="bg-gray-50 rounded-2xl p-6 flex flex-col">
                <Stars value={review.stars} />
                <blockquote className="text-gray-700 leading-relaxed my-4 flex-grow">“{review.text}”</blockquote>
                <p className="font-semibold text-gray-900">{review.author}</p>
              </li>
            ))}
          </ul>
        )}

        <a
          href={GOOGLE_PROFILE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 hover:text-white transition-colors"
        >
          {t('reviews.readOnGoogle')} <FiExternalLink aria-hidden />
          <span className="sr-only">{t('contact.opensInNewTab')}</span>
        </a>
      </div>
    </section>
  );
};

export default GoogleReviews;
