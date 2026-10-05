import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiClock, FiDownload, FiFileText, FiLock } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { clientApi, saveFile } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { daysUntil, formatDate, formatFileSize } from '../../../lib/format';
import { usePlanInfo } from '../queries';

const Header = ({ title }: { title: string }) => (
  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
      <FiFileText className="w-7 h-7" aria-hidden />
      {title}
    </h2>
  </div>
);

/** Expiry badge: red once expired, amber in the last week. */
function ExpiryBadge({ date }: { date: string }) {
  const { t } = useTranslation('dashboard');
  const days = daysUntil(date);
  if (days === null) return null;
  const tone = days < 0 ? 'bg-red-100 text-red-800 border-red-300' : days < 7 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-green-100 text-green-800 border-green-300';
  const text =
    days < 0
      ? t('plan.expiredAgo', { count: -days })
      : days === 0
        ? t('plan.expiresToday')
        : days === 1
          ? t('plan.expiresTomorrow')
          : t('plan.expiresIn', { count: days });
  return (
    <div className="mt-3">
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${tone}`}>
        <FiClock className="w-4 h-4" aria-hidden />
        {text}
      </span>
      <p className="text-xs text-gray-500 mt-1">{t('plan.expiresOn', { date: formatDate(date, 'long') })}</p>
    </div>
  );
}

/** The client's plan PDF: details, expiry and download. */
const PlanCard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const plan = usePlanInfo();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const file = await clientApi.download('/pdf/download');
      saveFile(file.blob, file.fileName || t('plan.defaultFileName'));
    } catch (error) {
      toast.error(errorMessage(error, t('common:errors.downloadFailed')));
    } finally {
      setDownloading(false);
    }
  };

  if (plan.isPending) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (plan.isError) return <ErrorState message={errorMessage(plan.error)} onRetry={() => plan.refetch()} />;

  const info = plan.data;
  if (!info) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState icon={<FiFileText className="w-14 h-14" aria-hidden />} title={t('plan.emptyTitle')} message={t('plan.emptyMessage')} />
      </div>
    );
  }

  if (info.locked) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        <Header title={t('plan.title')} />
        <div className="p-8 text-center">
          <FiLock className="w-14 h-14 text-amber-400 mx-auto mb-4" aria-hidden />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('plan.lockedTitle')}</h3>
          <p className="text-gray-600 mb-4">{t('plan.lockedMessage')}</p>
          <p className="inline-block bg-amber-50 border border-amber-200 rounded-xl px-6 py-3 text-xl sm:text-2xl font-bold text-amber-700 capitalize">
            {formatDate(info.visibleFrom, 'full')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      <Header title={t('plan.title')} />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
            <FiFileText className="w-8 h-8 text-red-600" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 break-words">{info.originalName}</h3>
            <dl className="space-y-1 text-sm text-gray-600">
              <div>
                <dt className="inline font-medium">{t('plan.fileSize')}:</dt> <dd className="inline">{formatFileSize(info.fileSize)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">{t('plan.uploadedAt')}:</dt> <dd className="inline">{formatDate(info.uploadedAt, 'long')}</dd>
              </div>
              {info.updatedAt !== info.uploadedAt && (
                <div>
                  <dt className="inline font-medium">{t('plan.updatedAt')}:</dt> <dd className="inline">{formatDate(info.updatedAt, 'long')}</dd>
                </div>
              )}
            </dl>
            {info.expirationDate && <ExpiryBadge date={info.expirationDate} />}
          </div>
        </div>

        <Button size="lg" fullWidth loading={downloading} onClick={download} icon={<FiDownload className="w-5 h-5" aria-hidden />}>
          {downloading ? t('plan.downloading') : t('plan.download')}
        </Button>

        <p className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>{t('plan.tip')}:</strong> {t('plan.tipMessage')}
        </p>
      </div>
    </div>
  );
};

export default PlanCard;
