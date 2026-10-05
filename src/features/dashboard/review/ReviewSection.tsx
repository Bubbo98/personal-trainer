import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FiEdit3, FiStar, FiTrash2 } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { TextAreaField, TextField } from '../../../components/ui/Field';
import { Alert, ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate } from '../../../lib/format';
import { useDeleteReview, useMyReview, useSaveReview } from '../queries';
import type { Review, ReviewInput } from '../types';

const MIN_COMMENT = 10;
const MAX_COMMENT = 1000;

export const Stars = ({ rating, size = 'w-5 h-5' }: { rating: number; size?: string }) => (
  <span className="flex items-center gap-0.5" aria-hidden>
    {[1, 2, 3, 4, 5].map((n) => (
      <FiStar key={n} className={`${size} ${n <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ))}
  </span>
);

const ReviewForm = ({ initial, onDone }: { initial: Review | null; onDone: () => void }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const save = useSaveReview();
  const [form, setForm] = useState<ReviewInput>({
    rating: initial?.rating ?? 5,
    title: initial?.title ?? '',
    comment: initial?.comment ?? '',
  });
  const tooShort = form.comment.trim().length < MIN_COMMENT;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (tooShort) return;
    try {
      await save.mutateAsync({ ...form, title: form.title.trim(), comment: form.comment.trim() });
      toast.success(t('review.saved'));
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-1.5">{t('review.rating')}</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1 rounded focus-within:ring-2 focus-within:ring-gray-900">
              <input
                type="radio"
                name="review-rating"
                value={n}
                checked={form.rating === n}
                onChange={() => setForm((f) => ({ ...f, rating: n }))}
                className="sr-only"
              />
              <FiStar className={`w-7 h-7 transition-colors ${n <= form.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-300'}`} aria-hidden />
              <span className="sr-only">{t('review.starLabel', { count: n })}</span>
            </label>
          ))}
          <span className="ml-2 text-sm text-gray-600">{t('review.ratingValue', { value: form.rating })}</span>
        </div>
      </fieldset>

      <TextField
        label={
          <>
            {t('review.reviewTitle')} <span className="text-gray-400 font-normal">({t('common:common.optional')})</span>
          </>
        }
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder={t('review.titlePlaceholder')}
        maxLength={200}
      />

      <TextAreaField
        label={t('review.comment')}
        value={form.comment}
        onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
        placeholder={t('review.commentPlaceholder')}
        rows={4}
        required
        minLength={MIN_COMMENT}
        maxLength={MAX_COMMENT}
        hint={t('review.commentHint', { count: form.comment.length })}
      />

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          {t('common:common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending} disabled={tooShort}>
          {initial ? t('review.update') : t('review.publish')}
        </Button>
      </div>

      <Alert kind="info">{t('review.approvalNotice')}</Alert>
    </form>
  );
};

/** The client's own review of the trainer (reachable from the ?tab=reviews link). */
const ReviewSection = () => {
  const { t } = useTranslation('dashboard');
  const review = useMyReview();
  const remove = useDeleteReview();
  const confirm = useConfirm();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [editing, setEditing] = useState(false);

  const deleteReview = async () => {
    const ok = await confirm({ title: t('review.deleteConfirmTitle'), message: t('review.deleteConfirmMessage'), confirmLabel: t('review.delete'), danger: true });
    if (!ok) return;
    try {
      await remove.mutateAsync();
      toast.success(t('review.deleted'));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (review.isPending) return <LoadingState />;
  if (review.isError) return <ErrorState message={errorMessage(review.error)} onRetry={() => review.refetch()} />;

  const current = review.data;

  return (
    <section className="max-w-2xl mx-auto bg-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('review.title')}</h2>
        {!current && !editing && (
          <Button onClick={() => setEditing(true)} icon={<FiStar className="w-4 h-4" aria-hidden />}>
            {t('review.write')}
          </Button>
        )}
      </div>

      {editing ? (
        <ReviewForm initial={current} onDone={() => setEditing(false)} />
      ) : current ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Stars rating={current.rating} />
              <span className="text-sm text-gray-600">{t('review.ratingValue', { value: current.rating })}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setEditing(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label={t('review.edit')} disabled={remove.isPending}>
                <FiEdit3 className="w-4 h-4" aria-hidden />
              </button>
              <button type="button" onClick={deleteReview} className="p-2 rounded-lg text-red-600 hover:bg-red-50" aria-label={t('review.delete')} disabled={remove.isPending}>
                <FiTrash2 className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
          {current.title && <h3 className="font-semibold text-gray-900">{current.title}</h3>}
          <p className="text-gray-700 whitespace-pre-wrap">{current.comment}</p>
          <p className={`text-sm ${current.isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
            {current.isApproved ? `✓ ${t('review.approved')}` : `⏳ ${t('review.pending')}`}
          </p>
          <p className="text-xs text-gray-400">
            {t('review.publishedOn', { date: formatDate(current.createdAt) })}
            {current.updatedAt !== current.createdAt && ` • ${t('review.editedOn', { date: formatDate(current.updatedAt) })}`}
          </p>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>{t('review.emptyTitle')}</p>
          <p className="text-sm">{t('review.emptyMessage')}</p>
        </div>
      )}
    </section>
  );
};

export default ReviewSection;
