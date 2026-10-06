import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FiChevronDown, FiDownload, FiFileText, FiTrash2, FiUpload } from 'react-icons/fi';
import Button from '../../../../components/ui/Button';
import { useConfirm } from '../../../../components/ui/ConfirmDialog';
import { TextField } from '../../../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/ui/States';
import { useToast } from '../../../../components/ui/Toast';
import { adminApi, saveFile } from '../../../../lib/api';
import { useErrorMessage } from '../../../../lib/errors';
import { formatDate, formatDateTime, formatFileSize, parseDate } from '../../../../lib/format';
import { ExpiryBadge } from '../../components/badges';
import { adminKeys, usePlanPdf } from '../../queries';
import { localMidnightIso, toInputDate } from './dateInputs';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** The client's plan PDF: details, duration, unlock date, upload/replace. */
const PlanPdfPanel = ({ userId, userName }: { userId: number; userName: string }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const pdf = usePlanPdf(userId);
  const [busy, setBusy] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extend, setExtend] = useState({ months: 0, days: 0 });
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [now] = useState(Date.now);
  const [upload, setUpload] = useState({ file: null as File | null, months: 2, days: 0, visibleFrom: '' });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.pdf(userId) });
    queryClient.invalidateQueries({ queryKey: adminKeys.users });
  };

  const run = async (marker: string, request: () => Promise<unknown>, success?: string) => {
    setBusy(marker);
    try {
      await request();
      refresh();
      if (success) toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (pdf.isPending) return <LoadingState />;
  if (pdf.isError) return <ErrorState message={errorMessage(pdf.error)} onRetry={() => pdf.refetch()} />;

  const info = pdf.data;
  const locked = info?.visibleFrom && (parseDate(info.visibleFrom)?.getTime() ?? 0) > now;

  const download = () =>
    run('download', async () => {
      const file = await adminApi.download(`/pdf/download?userId=${userId}`);
      saveFile(file.blob, file.fileName || info?.originalName || 'scheda.pdf');
    });

  const remove = async () => {
    if (!(await confirm({ title: t('pdf.deleteTitle', { name: userName }), message: t('pdf.deleteMessage'), danger: true, confirmLabel: t('actions.delete') }))) return;
    run('delete', () => adminApi.delete(`/pdf/admin/delete/${userId}`), t('pdf.deleted'));
  };

  const applyExtend = async () => {
    const shorter = extend.months < 0 || extend.days < 0;
    const ok = await run(
      'extend',
      () => adminApi.put(`/pdf/admin/extend/${userId}`, { additionalMonths: extend.months, additionalDays: extend.days }),
      shorter ? t('pdf.durationReduced') : t('pdf.durationExtended'),
    );
    if (ok) {
      setExtend({ months: 0, days: 0 });
      setExtendOpen(false);
    }
  };

  const setVisibleFrom = (value: string | null) =>
    run('visible', () => adminApi.put(`/pdf/admin/visible-from/${userId}`, { visibleFrom: value }), t('pdf.visibleFromSaved')).then(() => setUnlockDate(null));

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') return toast.error(t('pdf.onlyPdf'));
    if (file.size > MAX_PDF_BYTES) return toast.error(t('pdf.tooLarge'));
    setUpload((u) => ({ ...u, file }));
  };

  const submitUpload = async () => {
    if (!upload.file) return;
    const form = new FormData();
    form.append('pdf', upload.file);
    form.append('durationMonths', String(upload.months));
    form.append('durationDays', String(upload.days));
    const visibleFrom = localMidnightIso(upload.visibleFrom);
    if (visibleFrom) form.append('visibleFrom', visibleFrom);
    const replacing = Boolean(info);
    if (await run('upload', () => adminApi.post(`/pdf/admin/upload/${userId}`, form), replacing ? t('pdf.replaced') : t('pdf.uploaded'))) {
      setUpload({ file: null, months: 2, days: 0, visibleFrom: '' });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{t('pdf.title')}</h3>

      {info ? (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <FiFileText className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" aria-hidden />
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 break-words">{info.originalName}</h4>
                <dl className="text-sm text-gray-500 mt-1 space-y-0.5">
                  <div>
                    <dt className="inline">{t('pdf.fileSize')}: </dt>
                    <dd className="inline">{formatFileSize(info.fileSize)}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t('pdf.uploadedBy')}: </dt>
                    <dd className="inline">{info.uploadedBy}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t('pdf.uploadedAt')}: </dt>
                    <dd className="inline">{formatDateTime(info.uploadedAt)}</dd>
                  </div>
                  {info.updatedAt !== info.uploadedAt && (
                    <div>
                      <dt className="inline">{t('pdf.updatedAt')}: </dt>
                      <dd className="inline">{formatDateTime(info.updatedAt)}</dd>
                    </div>
                  )}
                </dl>
                {info.expirationDate && (
                  <div className="mt-2">
                    <ExpiryBadge date={info.expirationDate} />
                    <p className="text-xs text-gray-400 mt-1">{t('expiry.date', { date: formatDate(info.expirationDate, 'long') })}</p>
                  </div>
                )}
                {info.visibleFrom && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${locked ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                      {locked ? t('pdf.lockedUntil', { date: formatDate(info.visibleFrom) }) : t('pdf.unlockedSince', { date: formatDate(info.visibleFrom) })}
                    </span>
                    {locked && (
                      <button type="button" onClick={() => setVisibleFrom(null)} disabled={busy === 'visible'} className="text-xs text-gray-500 hover:text-red-600 underline">
                        {t('pdf.unlockNow')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={download} disabled={busy === 'download'} className="text-blue-600 hover:text-blue-700 p-2" aria-label={t('pdf.download')} title={t('pdf.download')}>
                <FiDownload className="w-5 h-5" aria-hidden />
              </button>
              <button type="button" onClick={remove} disabled={busy === 'delete'} className="text-red-600 hover:text-red-700 p-2" aria-label={t('pdf.delete')} title={t('pdf.delete')}>
                <FiTrash2 className="w-5 h-5" aria-hidden />
              </button>
            </div>
          </div>

          <section className="bg-white border border-gray-200 rounded-xl p-4">
            <button type="button" aria-expanded={extendOpen} onClick={() => setExtendOpen(!extendOpen)} className="w-full flex items-center gap-2 text-left font-semibold text-gray-900">
              <FiChevronDown className={`w-4 h-4 transition-transform ${extendOpen ? 'rotate-180' : '-rotate-90'}`} aria-hidden />
              {t('pdf.durationTitle')}
            </button>
            {extendOpen && (
              <div className="space-y-3 mt-3">
                <p className="text-sm text-gray-600">{t('pdf.durationHint')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label={t('pdf.months')} type="number" value={extend.months} onChange={(e) => setExtend((x) => ({ ...x, months: parseInt(e.target.value, 10) || 0 }))} />
                  <TextField label={t('pdf.days')} type="number" value={extend.days} onChange={(e) => setExtend((x) => ({ ...x, days: parseInt(e.target.value, 10) || 0 }))} />
                </div>
                <Button fullWidth onClick={applyExtend} loading={busy === 'extend'} disabled={extend.months === 0 && extend.days === 0}>
                  {t('pdf.applyDuration')}
                </Button>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <h4 className="font-semibold text-gray-900">{t('pdf.visibleFromTitle')}</h4>
            <input
              type="date"
              value={unlockDate ?? toInputDate(info.visibleFrom)}
              onChange={(e) => setUnlockDate(e.target.value)}
              aria-label={t('pdf.visibleFromTitle')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setVisibleFrom(localMidnightIso(unlockDate ?? toInputDate(info.visibleFrom)))} loading={busy === 'visible'}>
                {t('pdf.saveVisibleFrom')}
              </Button>
              <Button variant="secondary" onClick={() => setVisibleFrom(null)} disabled={busy === 'visible'}>
                {t('pdf.unlock')}
              </Button>
            </div>
            <p className="text-xs text-gray-400">{t('pdf.visibleFromHint')}</p>
          </section>
        </>
      ) : (
        <EmptyState icon={<FiFileText className="w-12 h-12" aria-hidden />} title={t('pdf.empty')} />
      )}

      <section className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
        <h4 className="font-semibold text-gray-900">{info ? t('pdf.replaceTitle') : t('pdf.uploadTitle')}</h4>
        <div>
          <label htmlFor={`pdf-file-${userId}`} className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('pdf.file')}
          </label>
          <input
            id={`pdf-file-${userId}`}
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              chooseFile(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label={t('pdf.durationMonths')} type="number" min={0} value={upload.months} onChange={(e) => setUpload((u) => ({ ...u, months: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
          <TextField label={t('pdf.durationDays')} type="number" min={0} value={upload.days} onChange={(e) => setUpload((u) => ({ ...u, days: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
        </div>
        <TextField
          label={t('pdf.visibleFrom')}
          type="date"
          value={upload.visibleFrom}
          onChange={(e) => setUpload((u) => ({ ...u, visibleFrom: e.target.value }))}
          hint={upload.visibleFrom ? t('pdf.visibleFromPreview', { date: formatDate(upload.visibleFrom, 'long') }) : undefined}
        />
        {upload.file && (
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <FiFileText className="text-red-600 flex-shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{upload.file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(upload.file.size)}</p>
              </div>
            </div>
            <button type="button" onClick={() => setUpload((u) => ({ ...u, file: null }))} className="text-red-600 hover:text-red-700 p-1" aria-label={t('actions.remove')}>
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
        )}
        <Button fullWidth onClick={submitUpload} disabled={!upload.file} loading={busy === 'upload'} icon={<FiUpload className="w-5 h-5" aria-hidden />}>
          {busy === 'upload' ? t('pdf.uploading') : info ? t('pdf.replace') : t('pdf.upload')}
        </Button>
      </section>
    </div>
  );
};

export default PlanPdfPanel;
