import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiCheck, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate } from '../../../lib/format';
import { adminKeys, useReviews } from '../queries';
import { displayName, type AdminReview } from '../types';

const Stars = ({ rating }: { rating: number }) => (
  <span className="flex items-center gap-0.5" aria-hidden>
    {[1, 2, 3, 4, 5].map((n) => (
      <FiStar key={n} className={`w-4 h-4 ${n <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ))}
  </span>
);

/** Approving, featuring (shown on the home page) and deleting client reviews. */
const ReviewsPage = () => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const reviews = useReviews();

  const change = useMutation({
    mutationFn: ({ review, action }: { review: AdminReview; action: 'approve' | 'feature'; value: boolean }) =>
      action === 'approve' ? adminApi.put(`/admin/reviews/${review.id}/approve`, { approved: !review.isApproved }) : adminApi.put(`/admin/reviews/${review.id}/feature`, { featured: !review.isFeatured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.reviews }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = async (review: AdminReview) => {
    if (!(await confirm({ title: t('reviews.deleteTitle', { name: displayName(review.user) }), confirmLabel: t('actions.delete'), danger: true }))) return;
    try {
      await adminApi.delete(`/admin/reviews/${review.id}`);
      queryClient.invalidateQueries({ queryKey: adminKeys.reviews });
      toast.success(t('reviews.deleted'));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (reviews.isPending) return <LoadingState />;
  if (reviews.isError) return <ErrorState message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />;

  const list = reviews.data;
  const busy = (review: AdminReview) => change.isPending && change.variables?.review.id === review.id;
  const average = list.length ? (list.reduce((sum, r) => sum + r.rating, 0) / list.length).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('reviews.title')}</h2>
        <p className="text-sm text-gray-600">{t('reviews.count', { count: list.length })}</p>
      </div>

      {list.length === 0 ? (
        <p className="text-center py-12 bg-white rounded-xl text-gray-600">{t('reviews.empty')}</p>
      ) : (
        <ul className="grid gap-6">
          {list.map((review) => (
            <li key={review.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                    <h3 className="font-semibold text-gray-900">{displayName(review.user)}</h3>
                    <span className="flex items-center gap-2">
                      <Stars rating={review.rating} />
                      <span className="text-sm text-gray-600">{t('reviews.rating', { value: review.rating })}</span>
                    </span>
                  </div>
                  {review.title && <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>}
                  <p className="text-gray-700 mb-3 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
                  <p className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500">
                    <span>{t('reviews.createdOn', { date: formatDate(review.createdAt) })}</span>
                    {review.updatedAt !== review.createdAt && <span>{t('reviews.editedOn', { date: formatDate(review.updatedAt) })}</span>}
                    {review.approvedAt && <span>{t('reviews.approvedOn', { date: formatDate(review.approvedAt) })}</span>}
                  </p>
                </div>
                <div className="flex sm:flex-col gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {review.isApproved ? t('reviews.approved') : t('reviews.pending')}
                  </span>
                  {Boolean(review.isFeatured) && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">{t('reviews.featured')}</span>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className={review.isApproved ? '!bg-yellow-600 !border-yellow-600 hover:!bg-yellow-700' : '!bg-green-600 !border-green-600 hover:!bg-green-700'}
                    loading={busy(review) && change.variables?.action === 'approve'}
                    disabled={busy(review)}
                    onClick={() => change.mutate({ review, action: 'approve', value: !review.isApproved })}
                    icon={review.isApproved ? <FiX className="w-4 h-4" aria-hidden /> : <FiCheck className="w-4 h-4" aria-hidden />}
                  >
                    {review.isApproved ? t('reviews.unapprove') : t('reviews.approve')}
                  </Button>
                  {Boolean(review.isApproved) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy(review) && change.variables?.action === 'feature'}
                      disabled={busy(review)}
                      onClick={() => change.mutate({ review, action: 'feature', value: !review.isFeatured })}
                      icon={<FiStar className="w-4 h-4" aria-hidden />}
                    >
                      {review.isFeatured ? t('reviews.unfeature') : t('reviews.feature')}
                    </Button>
                  )}
                </div>
                <Button size="sm" variant="danger" onClick={() => remove(review)} icon={<FiTrash2 className="w-4 h-4" aria-hidden />}>
                  {t('actions.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {list.length > 0 && (
        <section className="bg-white rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reviews.stats.title')}</h3>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {(
              [
                ['total', list.length, 'text-gray-900'],
                ['approved', list.filter((r) => r.isApproved).length, 'text-green-600'],
                ['featured', list.filter((r) => r.isFeatured).length, 'text-blue-600'],
                ['average', average, 'text-gray-900'],
              ] as const
            ).map(([key, value, color]) => (
              <div key={key} className="flex flex-col-reverse">
                <dt className="text-sm text-gray-600">{t(`reviews.stats.${key}`)}</dt>
                <dd className={`text-2xl font-bold ${color}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
};

export default ReviewsPage;
