import type { TFunction as I18nT } from 'i18next';
import { formatDate, formatDateTime } from '../../../lib/format';
import { displayName, type RetentionLog, type RetentionLogEntry } from '../types';

type TFunction = I18nT<'admin'>;

/** The log split in its two lists, both newest first (the API order). */
export const splitLog = (entries: RetentionLogEntry[]) => ({
  expired: entries.filter((e) => e.event === 'plan_expired'),
  deleted: entries.filter((e) => e.event === 'user_deleted'),
});

/** "ottobre 2026" for '2026-10'. */
export const monthLabel = (month: string, language: string) => {
  const [year, mm] = month.split('-').map(Number);
  return new Date(year, mm - 1, 1).toLocaleDateString(language.startsWith('en') ? 'en-GB' : 'it-IT', { month: 'long', year: 'numeric' });
};

/** Table rows: the same columns on the page and in the PDF. */
export const expiredRow = (e: RetentionLogEntry) => [formatDate(e.occurredAt), displayName(e), e.email ?? '', e.phone ?? '', e.trainerName ?? ''];
export const deletedRow = (e: RetentionLogEntry, t: TFunction) => [
  formatDate(e.occurredAt),
  displayName(e),
  e.email ?? '',
  e.phone ?? '',
  e.trainerName ?? '',
  e.reason ? t(`retention.reasons.${e.reason}`) : '',
  formatDate(e.expirationDate),
];

export const expiredColumns = (t: TFunction) => [
  t('retention.columns.expiredOn'), t('retention.columns.client'), t('retention.columns.email'), t('retention.columns.phone'), t('retention.columns.trainer'),
];
export const deletedColumns = (t: TFunction) => [
  t('retention.columns.deletedOn'), t('retention.columns.client'), t('retention.columns.email'), t('retention.columns.phone'),
  t('retention.columns.trainer'), t('retention.columns.reason'), t('retention.columns.planExpiry'),
];

/** "2 righe nascoste: …" — '' when nothing is hidden. */
export const hiddenNote = ({ returned, duplicates }: RetentionLog['hidden'], t: TFunction) => {
  const parts = [returned && t('retention.hidden.returned', { count: returned }), duplicates && t('retention.hidden.duplicates', { count: duplicates })].filter(Boolean);
  return parts.length ? t('retention.hidden.note', { parts: parts.join(', ') }) : '';
};

/** Builds the PDF of the log (jsPDF is loaded only now) and returns it with its file name. */
export async function buildRetentionLogPdf({ entries, hidden }: RetentionLog, month: string, t: TFunction, language: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape' });
  const { expired, deleted } = splitLog(entries);
  const styles = { headStyles: { fillColor: [17, 24, 39] as [number, number, number] }, styles: { fontSize: 9 } };

  doc.setFontSize(16);
  doc.text(t('retention.pdf.title'), 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${month ? monthLabel(month, language) : t('retention.allTime')} · ${t('retention.pdf.generated', { date: formatDateTime(new Date()) })}`, 14, 23);
  const note = hiddenNote(hidden, t);
  if (note) doc.text(note, 14, 28);
  doc.setTextColor(0);

  const table = (title: string, startY: number, columns: string[], rows: string[][], emptyText: string) => {
    doc.setFontSize(12);
    doc.text(`${title} (${rows.length})`, 14, startY);
    autoTable(doc, {
      startY: startY + 3,
      head: [columns],
      body: rows.length ? rows : [[{ content: emptyText, colSpan: columns.length }]],
      ...styles,
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  const end = table(t('retention.expired.title'), note ? 37 : 33, expiredColumns(t), expired.map(expiredRow), t('retention.expired.empty'));
  table(t('retention.deleted.title'), end + 12, deletedColumns(t), deleted.map((e) => deletedRow(e, t)), t('retention.deleted.empty'));

  return { blob: doc.output('blob'), fileName: `${t('retention.pdf.fileName')}-${month || t('retention.pdf.allTimeFile')}.pdf` };
}
