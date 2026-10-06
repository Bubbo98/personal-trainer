import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCalendar, FiDownload, FiImage, FiTrash2, FiUpload } from 'react-icons/fi';
import Button from '../../../../components/ui/Button';
import { useConfirm } from '../../../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/ui/States';
import { useToast } from '../../../../components/ui/Toast';
import { adminApi, saveFile } from '../../../../lib/api';
import { useErrorMessage } from '../../../../lib/errors';
import { formatDate, formatFileSize } from '../../../../lib/format';
import { adminKeys, useBodyReports } from '../../queries';
import type { BodyReportSummary } from '../../types';

/** Text of a report photo, read in the browser; null when OCR fails (the file is still uploaded). */
async function readImageText(file: File): Promise<string | null> {
  try {
    // Tesseract is big: it loads only when a photo is uploaded
    const { default: Tesseract } = await import('tesseract.js');
    const { data } = await Tesseract.recognize(file, 'ita');
    return data.text;
  } catch {
    return null;
  }
}

const Preview = ({ report }: { report: BodyReportSummary }) => {
  const { t } = useTranslation('admin');
  const file = useQuery({
    queryKey: ['admin', 'body-report-file', report.id],
    queryFn: ({ signal }) => adminApi.download(`/body-composition/download/${report.id}`, signal),
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.data) return;
    const objectUrl = URL.createObjectURL(file.data.blob);
    setUrl(objectUrl); // eslint-disable-line react-hooks/set-state-in-effect -- derived from an external resource
    return () => URL.revokeObjectURL(objectUrl);
  }, [file.data]);

  if (!url) {
    return (
      <span className="flex flex-col items-center gap-2 text-gray-300 py-10">
        <FiImage className="w-10 h-10" aria-hidden />
        <span className="text-xs">{t('body.loadingPreview')}</span>
      </span>
    );
  }
  return report.originalName.toLowerCase().endsWith('.pdf') ? (
    <object data={url} type="application/pdf" className="w-full h-[280px]" aria-label={report.originalName} />
  ) : (
    <img src={url} alt={t('body.previewAlt')} className="w-full object-contain max-h-[280px]" />
  );
};

/** Body-composition reports of a client (PDF or photo of the printout). */
const BodyReportsPanel = ({ userId, userName }: { userId: number; userName: string }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const reports = useBodyReports(userId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'reading' | 'uploading' | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      let ocrText: string | null = null;
      if (file.type.startsWith('image/')) {
        setStatus('reading');
        ocrText = await readImageText(file);
      }
      setStatus('uploading');
      const form = new FormData();
      form.append('pdf', file);
      if (date) form.append('measurementDate', date);
      if (ocrText) form.append('ocrText', ocrText);
      await adminApi.post(`/body-composition/admin/upload/${userId}`, form);
      setDate('');
      toast.success(t('body.uploaded'));
      queryClient.invalidateQueries({ queryKey: adminKeys.bodyReports(userId) });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStatus(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (report: BodyReportSummary) => {
    if (!(await confirm({ title: t('body.deleteTitle'), danger: true, confirmLabel: t('actions.delete') }))) return;
    try {
      await adminApi.delete(`/body-composition/admin/report/${report.id}`);
      toast.success(t('body.deleted'));
      queryClient.invalidateQueries({ queryKey: adminKeys.bodyReports(userId) });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const download = async (report: BodyReportSummary) => {
    try {
      const file = await adminApi.download(`/body-composition/download/${report.id}`);
      saveFile(file.blob, file.fileName || report.originalName);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{t('body.title')}</h3>
          {reports.data && <p className="text-sm text-gray-500 mt-0.5">{t('body.count', { count: reports.data.length, name: userName })}</p>}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">{t('body.measurementDate')}</span>
            <FiCalendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              title={t('body.measurementDate')}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" tabIndex={-1} onChange={(e) => upload(e.target.files?.[0])} />
          <Button onClick={() => fileRef.current?.click()} loading={status !== null} icon={<FiUpload className="w-4 h-4" aria-hidden />} className="!bg-indigo-600 !border-indigo-600 hover:!bg-indigo-700 whitespace-nowrap">
            {status === 'reading' ? t('body.reading') : status === 'uploading' ? t('body.uploading') : t('body.upload')}
          </Button>
        </div>
      </div>

      {reports.isPending ? (
        <LoadingState />
      ) : reports.isError ? (
        <ErrorState message={errorMessage(reports.error)} onRetry={() => reports.refetch()} />
      ) : reports.data.length === 0 ? (
        <EmptyState title={t('body.emptyTitle')} message={t('body.emptyMessage')} />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.data.map((report) => (
            <li key={report.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-gray-50 flex items-center justify-center min-h-[220px]">
                <Preview report={report} />
              </div>
              <div className="px-4 py-3 flex-1">
                {report.measurementDate && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-0.5">
                    <FiCalendar className="w-3.5 h-3.5 text-indigo-500" aria-hidden />
                    {formatDate(report.measurementDate, 'long')}
                  </p>
                )}
                <p className="text-xs text-gray-400">{t('body.uploadedBy', { date: formatDate(report.uploadedAt), user: report.uploadedBy })}</p>
                <p className="text-xs text-gray-400 mt-0.5 break-all">
                  {report.originalName} · {formatFileSize(report.fileSize)}
                </p>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => download(report)} icon={<FiDownload className="w-4 h-4" aria-hidden />}>
                  {t('actions.download')}
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 !text-red-600 !border-red-100 hover:!bg-red-50" onClick={() => remove(report)} icon={<FiTrash2 className="w-4 h-4" aria-hidden />}>
                  {t('actions.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BodyReportsPanel;
