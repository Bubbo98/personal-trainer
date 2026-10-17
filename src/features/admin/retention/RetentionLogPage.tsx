import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/Field';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { saveFile } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { useRetentionLog } from '../queries';
import { buildRetentionLogPdf, deletedColumns, deletedRow, expiredColumns, expiredRow, hiddenNote, splitLog } from './retentionLogPdf';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const LogTable = ({ title, columns, rows, emptyText }: { title: string; columns: string[]; rows: string[][]; emptyText: string }) => (
  <section className="space-y-3">
    <h3 className="text-lg font-semibold text-gray-900">
      {title} <span className="text-gray-500 font-normal">({rows.length})</span>
    </h3>
    <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3 whitespace-nowrap ${j === 1 ? 'font-medium text-gray-900' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

/** The record of expired plans and deleted clients, by month, downloadable as a PDF. */
const RetentionLogPage = () => {
  const { t, i18n } = useTranslation('admin');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [month, setMonth] = useState(currentMonth);
  const [exporting, setExporting] = useState(false);
  const log = useRetentionLog(month);

  const download = async () => {
    if (!log.data) return;
    setExporting(true);
    try {
      const { blob, fileName } = await buildRetentionLogPdf(log.data, month, t, i18n.language);
      saveFile(blob, fileName);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const { expired, deleted } = splitLog(log.data?.entries ?? []);
  const note = log.data ? hiddenNote(log.data.hidden, t) : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('retention.title')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('retention.subtitle')}</p>
        </div>
        <div className="flex items-end gap-3">
          <TextField
            label={t('retention.month')}
            hint={month ? undefined : t('retention.allTime')}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Button onClick={download} loading={exporting} disabled={!log.data} icon={<FiDownload className="w-4 h-4" aria-hidden />}>
            {t('retention.download')}
          </Button>
        </div>
      </div>

      {log.isPending ? (
        <LoadingState />
      ) : log.isError ? (
        <ErrorState message={errorMessage(log.error)} onRetry={() => log.refetch()} />
      ) : (
        <>
          {note && <p className="text-sm text-gray-600 bg-gray-100 rounded-xl px-4 py-3">{note}</p>}
          <LogTable title={t('retention.expired.title')} columns={expiredColumns(t)} rows={expired.map(expiredRow)} emptyText={t('retention.expired.empty')} />
          <LogTable
            title={t('retention.deleted.title')}
            columns={deletedColumns(t)}
            rows={deleted.map((e) => deletedRow(e, t))}
            emptyText={t('retention.deleted.empty')}
          />
        </>
      )}
    </div>
  );
};

export default RetentionLogPage;
