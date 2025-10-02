import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiCheck,
  FiX,
  FiStar,
  FiTrash2
} from 'react-icons/fi';
import { apiCall, formatDate } from '../../utils/adminUtils';
import { Review } from '../../types/admin';

const ReviewManagement: React.FC = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/reviews');
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleApproveReview = async (reviewId: number, approved: boolean) => {
    try {
      await apiCall(`/admin/reviews/${reviewId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ approved })
      });
      loadReviews();
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.reviews.operationFailed')}`);
    }
  };

  const handleFeatureReview = async (reviewId: number, featured: boolean) => {
    try {
      await apiCall(`/admin/reviews/${reviewId}/feature`, {
        method: 'PUT',
        body: JSON.stringify({ featured })
      });
      loadReviews();
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.reviews.operationFailed')}`);
    }
  };

  const handleDeleteReview = async (reviewId: number, authorName: string) => {
    if (window.confirm(t('admin.reviews.deleteConfirm', { authorName }))) {
      try {
        await apiCall(`/admin/reviews/${reviewId}`, {
          method: 'DELETE'
        });
        loadReviews();
      } catch (error) {
        alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.reviews.deleteFailed')}`);
      }
    }
  };

  const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, i) => (
        React.createElement(FiStar as React.ComponentType<{ className?: string }>, {
          key: i.toString(),
          className: `w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`
        })
      ))}
    </div>
  );

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('admin.reviews.title')}</h2>
        <div className="text-sm text-gray-600">
          {reviews.length} {t('admin.reviews.totalReviews')}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-600">{t('reviews.noReviews')}</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {review.user.firstName} {review.user.lastName}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <StarRating rating={review.rating} />
                      <span className="text-sm text-gray-600">({review.rating}/5)</span>
                    </div>
                  </div>

                  {review.title && (
                    <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                  )}

                  <p className="text-gray-700 mb-3 leading-relaxed">{review.comment}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500">
                    <span>{t('admin.videos.createdAt')}: {formatDate(review.createdAt)}</span>
                    {review.updatedAt !== review.createdAt && (
                      <span className="hidden sm:inline">{t('admin.reviews.modified')}: {formatDate(review.updatedAt)}</span>
                    )}
                    {review.approvedAt && (
                      <span className="hidden sm:inline">{t('admin.reviews.approved')}: {formatDate(review.approvedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex sm:flex-col gap-2 sm:space-y-1 sm:ml-4">
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {review.isApproved ? t('admin.reviews.approved') : t('admin.reviews.pending')}
                  </span>
                  {review.isFeatured && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
                      {t('admin.reviews.featured')}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {/* Approve/Reject buttons */}
                  {!review.isApproved ? (
                    <button
                      onClick={() => handleApproveReview(review.id, true)}
                      className="bg-green-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-700 flex items-center justify-center space-x-1 flex-1 sm:flex-initial"
                    >
                      {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      <span>{t('admin.reviews.approve')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApproveReview(review.id, false)}
                      className="bg-yellow-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-yellow-700 flex items-center justify-center space-x-1 flex-1 sm:flex-initial"
                    >
                      {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      <span>{t('admin.reviews.unapprove')}</span>
                    </button>
                  )}

                  {/* Feature/Unfeature buttons */}
                  {review.isApproved && (
                    !review.isFeatured ? (
                      <button
                        onClick={() => handleFeatureReview(review.id, true)}
                        className="bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1 flex-1 sm:flex-initial"
                      >
                        {React.createElement(FiStar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                        <span>{t('admin.reviews.toggleFeatured')}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFeatureReview(review.id, false)}
                        className="bg-gray-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-1 flex-1 sm:flex-initial"
                      >
                        {React.createElement(FiStar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                        <span>{t('admin.reviews.toggleFeatured')}</span>
                      </button>
                    )
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteReview(review.id, `${review.user.firstName} ${review.user.lastName}`)}
                  className="bg-red-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-700 flex items-center justify-center space-x-1 w-full sm:w-auto"
                >
                  {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.reviews.statistics')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
              <div className="text-sm text-gray-600">{t('admin.reviews.total')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reviews.filter(r => r.isApproved).length}
              </div>
              <div className="text-sm text-gray-600">{t('admin.reviews.approvedCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reviews.filter(r => r.isFeatured).length}
              </div>
              <div className="text-sm text-gray-600">{t('admin.reviews.featuredCount')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0'}
              </div>
              <div className="text-sm text-gray-600">{t('admin.reviews.averageRating')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewManagement;