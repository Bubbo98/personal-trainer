import React, { useState, useEffect } from 'react';
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

// Types
interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  isFeatured: boolean;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

interface ReviewsData {
  reviews: Review[];
  totalCount: number;
}

interface ReviewCardProps {
  review: Review;
}

interface ReviewsCarouselProps {
  reviews: Review[];
}

// API function
const fetchReviews = async (type: 'featured' | 'public' = 'featured'): Promise<ReviewsData> => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const response = await fetch(`${API_BASE_URL}/reviews/${type}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch reviews');
  }

  return data.data;
};

// Components
const StarRating: React.FC<{ rating: number; className?: string }> = ({ rating, className = '' }) => (
  <div className={`flex items-center space-x-1 ${className}`}>
    {[...Array(5)].map((_, i) => (
      React.createElement(FiStar as React.ComponentType<{ className?: string }>, {
        key: i.toString(),
        className: `w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`
      })
    ))}
  </div>
);

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <StarRating rating={review.rating} />
        <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
      </div>

      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-3">{review.title}</h4>
      )}

      <p className="text-gray-700 mb-4 flex-grow leading-relaxed">
        "{review.comment}"
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="font-medium text-gray-900">
          {review.author.displayName}
        </span>
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <span>{review.rating}/5</span>
        </div>
      </div>
    </div>
  );
};

const ReviewsCarousel: React.FC<ReviewsCarouselProps> = ({ reviews }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemsPerPage = isMobile ? 1 : 3;
  const totalPages = Math.ceil(reviews.length / itemsPerPage);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const getCurrentReviews = () => {
    const start = currentIndex * itemsPerPage;
    return reviews.slice(start, start + itemsPerPage);
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('reviews.noReviews')}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {getCurrentReviews().map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={prevSlide}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            disabled={currentIndex === 0}
            aria-label={t('reviews.previousReviews')}
          >
            {React.createElement(FiChevronLeft as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
          </button>

          <div className="flex space-x-2">
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-gray-900' : 'bg-gray-300'
                }`}
                aria-label={`${t('reviews.goToPage')} ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            disabled={currentIndex === totalPages - 1}
            aria-label={t('reviews.nextReviews')}
          >
            {React.createElement(FiChevronRight as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
          </button>
        </div>
      )}
    </div>
  );
};

interface ReviewsProps {
  type?: 'featured' | 'public';
}

const Reviews: React.FC<ReviewsProps> = ({ type = 'featured' }) => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchReviews(type);
        setReviews(data.reviews);
      } catch (err) {
        console.error('Failed to load reviews:', err);
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [type]);

  const sectionClassName = 'py-16 lg:py-20 bg-gray-50';
  const containerClassName = 'max-w-7xl mx-auto px-6 lg:px-16';
  const titleClassName = 'text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-4';
  const subtitleClassName = 'text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto';

  return (
    <section className={sectionClassName} aria-label="Recensioni clienti">
      <div className={containerClassName}>
        <h2 className={titleClassName}>
          {t('reviews.title')}
        </h2>
        <p className={subtitleClassName}>
          {t('reviews.subtitle')}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('reviews.loading')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              {t('reviews.retry')}
            </button>
          </div>
        ) : (
          <ReviewsCarousel reviews={reviews} />
        )}

        {!loading && !error && reviews.length > 0 && (
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              {t('reviews.shareExperience')}
            </p>
            <a
              href="/booking"
              className="inline-block bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors font-medium"
            >
              {t('reviews.startJourney')}
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default Reviews;