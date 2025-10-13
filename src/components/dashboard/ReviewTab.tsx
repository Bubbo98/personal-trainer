import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiStar, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { Review, ReviewFormData } from '../../types/dashboard';
import { STORAGE_KEY, formatDate, apiCall } from '../../utils/dashboardUtils';

const ReviewTab: React.FC = () => {
  const { t } = useTranslation();
  const [review, setReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFormData, setReviewFormData] = useState<ReviewFormData>({
    rating: 5,
    title: '',
    comment: ''
  });

  // Load user's review
  const loadUserReview = useCallback(async () => {
    try {
      const authToken = localStorage.getItem(STORAGE_KEY);
      if (!authToken) return;

      const response = await apiCall('/reviews/my', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setReview(response.data.review);
    } catch (error) {
      console.error('Failed to load review:', error);
    }
  }, []);

  useEffect(() => {
    loadUserReview();
  }, [loadUserReview]);

  // Submit review
  const submitReview = useCallback(async () => {
    try {
      setReviewLoading(true);
      const authToken = localStorage.getItem(STORAGE_KEY);
      if (!authToken) return;

      await apiCall('/reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(reviewFormData)
      });

      // Reload user's review
      await loadUserReview();

      setShowReviewForm(false);
      setReviewFormData({ rating: 5, title: '', comment: '' });
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setReviewLoading(false);
    }
  }, [reviewFormData, loadUserReview]);

  // Delete review
  const deleteReview = useCallback(async () => {
    try {
      setReviewLoading(true);
      const authToken = localStorage.getItem(STORAGE_KEY);
      if (!authToken) return;

      await apiCall('/reviews/my', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setReview(null);
    } catch (error) {
      console.error('Failed to delete review:', error);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  // Review handlers
  const handleReviewSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await submitReview();
  }, [submitReview]);

  const handleReviewDelete = useCallback(async () => {
    if (window.confirm('Sei sicuro di voler eliminare la tua recensione?')) {
      await deleteReview();
    }
  }, [deleteReview]);

  const handleEditReview = useCallback(() => {
    if (review) {
      setReviewFormData({
        rating: review.rating,
        title: review.title,
        comment: review.comment
      });
      setShowReviewForm(true);
    }
  }, [review]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">La tua recensione</h3>
        {!review && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
          >
            {React.createElement(FiStar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
            <span>Lascia una recensione</span>
          </button>
        )}
      </div>

      {review && !showReviewForm ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  React.createElement(FiStar as React.ComponentType<{ className?: string }>, {
                    key: i.toString(),
                    className: `w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`
                  })
                ))}
              </div>
              <span className="text-sm text-gray-600">({review.rating}/5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEditReview}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                disabled={reviewLoading}
              >
                {React.createElement(FiEdit3 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
              </button>
              <button
                onClick={handleReviewDelete}
                className="text-red-600 hover:text-red-800 transition-colors"
                disabled={reviewLoading}
              >
                {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
              </button>
            </div>
          </div>
          {review.title && (
            <h4 className="font-semibold text-gray-900">{review.title}</h4>
          )}
          <p className="text-gray-700">{review.comment}</p>
          <div className="text-sm text-gray-500">
            {review.isApproved ? (
              <span className="text-green-600">✓ Recensione approvata e visibile pubblicamente</span>
            ) : (
              <span className="text-yellow-600">⏳ In attesa di approvazione</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            Pubblicata il {formatDate(review.createdAt)}
            {review.updatedAt !== review.createdAt && (
              <span> • {t('dashboard.modifiedOn')} {formatDate(review.updatedAt)}</span>
            )}
          </div>
        </div>
      ) : showReviewForm ? (
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valutazione
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setReviewFormData(prev => ({ ...prev, rating }))}
                  className={`w-8 h-8 ${rating <= reviewFormData.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                >
                  {React.createElement(FiStar as React.ComponentType<{ className?: string }>, {
                    className: `w-6 h-6 ${rating <= reviewFormData.rating ? 'fill-current' : ''}`
                  })}
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">({reviewFormData.rating}/5)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titolo (opzionale)
            </label>
            <input
              type="text"
              value={reviewFormData.title}
              onChange={(e) => setReviewFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              placeholder="Titolo della recensione..."
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commento *
            </label>
            <textarea
              value={reviewFormData.comment}
              onChange={(e) => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              rows={4}
              placeholder="Condividi la tua esperienza con gli allenamenti di Joshua..."
              required
              minLength={10}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1">
              {reviewFormData.comment.length}/1000 caratteri (minimo 10)
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => {
                setShowReviewForm(false);
                setReviewFormData({ rating: 5, title: '', comment: '' });
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={reviewLoading}
            >
              {t('dashboard.cancel')}
            </button>
            <button
              type="submit"
              disabled={reviewLoading || reviewFormData.comment.length < 10}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {reviewLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{review ? 'Aggiorna recensione' : 'Pubblica recensione'}</span>
            </button>
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            ℹ️ La tua recensione sarà visibile pubblicamente solo dopo l'approvazione dell'amministratore.
          </div>
        </form>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Non hai ancora lasciato una recensione.</p>
          <p className="text-sm">Condividi la tua esperienza con gli allenamenti di Joshua!</p>
        </div>
      )}
    </div>
  );
};

export default ReviewTab;
