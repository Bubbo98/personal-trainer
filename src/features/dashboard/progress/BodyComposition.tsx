import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FiActivity, FiCalendar, FiDownload } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import Pills from '../../../components/ui/Pills';
import Spinner from '../../../components/ui/Spinner';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { clientApi, saveFile } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate } from '../../../lib/format';
import { useBodyReports } from '../queries';
import type { BodyReport, ParsedBodyReport } from '../types';

const RATING_COLORS = {
  Eccellente: 'text-green-600 bg-green-50',
  'Sopra la Media': 'text-green-500 bg-green-50',
  Standard: 'text-blue-600 bg-blue-50',
  Normale: 'text-blue-600 bg-blue-50',
  'Sotto la Media': 'text-yellow-600 bg-yellow-50',
  Bassa: 'text-yellow-600 bg-yellow-50',
  Alta: 'text-orange-600 bg-orange-50',
  Sovrappeso: 'text-orange-600 bg-orange-50',
  Sottopeso: 'text-yellow-600 bg-yellow-50',
  'Gravemente sovrappeso': 'text-red-600 bg-red-50',
} as const;

type Rating = keyof typeof RATING_COLORS;
const isRating = (value: string): value is Rating => value in RATING_COLORS;

const COMPOSITION_ROWS = ['Peso', 'Grasso corporeo', 'Minerali', 'Proteine', 'Acqua corporea', 'Muscoloso', 'Muscolo scheletrico'] as const;

const StatGrid = ({ items }: { items: { label: string; value: number | null; unit?: string }[] }) => {
  const visible = items.filter((i) => i.value !== null && i.value !== undefined);
  if (visible.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {visible.map((item) => (
        <div key={item.label} className="bg-gray-50 rounded-xl p-3 flex flex-col-reverse">
          <dt className="text-xs text-gray-500 mt-0.5">{item.label}</dt>
          <dd className="text-base font-semibold text-gray-900">
            {item.value}
            {item.unit && <span className="text-xs font-normal text-gray-500 ml-0.5">{item.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const ParsedReport = ({ parsed }: { parsed: ParsedBodyReport }) => {
  const { t } = useTranslation('dashboard');
  const { header, bodyComposition, bodyScore, weightControl: wc, obesityEvaluation: ob, otherIndicators: oi } = parsed;
  const rows = COMPOSITION_ROWS.filter((key) => bodyComposition[key]);
  // Ratings come from the device printout: unknown ones are shown as they are
  const ratingLabel = (value: string) => (isRating(value) ? t(`body.ratings.${value}`) : value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        {header.dataRilevazione && (
          <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
            <FiCalendar className="w-4 h-4 text-indigo-500" aria-hidden />
            {header.dataRilevazione}
          </span>
        )}
        {header.eta && <span className="text-sm text-gray-500">{t('body.age', { value: header.eta })}</span>}
        {header.altezzaCm && <span className="text-sm text-gray-500">{header.altezzaCm} cm</span>}
        {bodyScore !== null && (
          <span className="ml-auto flex items-center gap-1">
            <span className="text-xs text-gray-400">{t('body.bodyScore')}</span>
            <span className="text-2xl font-bold text-indigo-600">{bodyScore}</span>
            <span className="text-xs text-gray-400">/100</span>
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('body.composition')}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th scope="col" className="text-left py-2 pr-4 font-medium">{t('body.parameter')}</th>
                  <th scope="col" className="text-right py-2 px-2 font-medium">{t('body.value')}</th>
                  <th scope="col" className="text-right py-2 px-2 font-medium">%</th>
                  <th scope="col" className="text-right py-2 pl-2 font-medium">{t('body.rating')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((key) => {
                  const row = bodyComposition[key]!;
                  return (
                    <tr key={key} className="border-b border-gray-50">
                      <th scope="row" className="py-2 pr-4 text-left text-gray-700 font-medium">{t(`body.rows.${key}`)}</th>
                      <td className="py-2 px-2 text-right text-gray-900 font-semibold">{row.value}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{row.percent}%</td>
                      <td className="py-2 pl-2 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isRating(row.valutazione) ? RATING_COLORS[row.valutazione] : 'text-gray-600 bg-gray-100'}`}>
                          {ratingLabel(row.valutazione)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(ob.imc || ob.percGrasso || ob.livelloObesita) && (
        <section>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('body.obesity')}</h4>
          <StatGrid
            items={[
              { label: t('body.stats.imc'), value: ob.imc, unit: 'kg/m²' },
              { label: t('body.stats.fatPercent'), value: ob.percGrasso, unit: '%' },
              { label: t('body.stats.obesityLevel'), value: ob.livelloObesita, unit: '%' },
            ]}
          />
        </section>
      )}

      <section>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('body.otherIndicators')}</h4>
        <StatGrid
          items={[
            { label: t('body.stats.visceralFat'), value: oi.livelloGrassoViscerale },
            { label: t('body.stats.basalMetabolism'), value: oi.tassoMetabolicoBasale, unit: 'kcal' },
            { label: t('body.stats.leanMass'), value: oi.massaCorporeaMagra, unit: 'kg' },
            { label: t('body.stats.subcutaneousFat'), value: oi.grassoSottocutaneo, unit: '%' },
            { label: t('body.stats.smi'), value: oi.smi, unit: 'kg/m²' },
            { label: t('body.stats.bodyAge'), value: oi.etaCorporea, unit: t('body.years') },
            { label: t('body.stats.waistHip'), value: oi.rapportoVitaFianchi },
          ]}
        />
      </section>

      {(wc.pesoObiettivo || wc.controlloPeso) && (
        <section>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('body.weightControl')}</h4>
          <StatGrid
            items={[
              { label: t('body.stats.targetWeight'), value: wc.pesoObiettivo, unit: 'kg' },
              { label: t('body.stats.weightControl'), value: wc.controlloPeso, unit: 'kg' },
              { label: t('body.stats.fatControl'), value: wc.controlloGrasso, unit: 'kg' },
              { label: t('body.stats.muscleControl'), value: wc.controlloMuscoli, unit: 'kg' },
            ]}
          />
        </section>
      )}
    </div>
  );
};

/** A report without parsed data: the original file (PDF or image) shown inline. */
const ReportFile = ({ report }: { report: BodyReport }) => {
  const { t } = useTranslation('dashboard');
  const file = useQuery({
    queryKey: ['client', 'body-report-file', report.id],
    queryFn: ({ signal }) => clientApi.download(`/body-composition/download/${report.id}`, signal),
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string | null>(null);

  // Object URLs must be revoked when the blob is no longer shown
  useEffect(() => {
    if (!file.data) return;
    const objectUrl = URL.createObjectURL(file.data.blob);
    setUrl(objectUrl); // eslint-disable-line react-hooks/set-state-in-effect -- derived from an external resource
    return () => URL.revokeObjectURL(objectUrl);
  }, [file.data]);

  if (file.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" className="border-indigo-600" />
      </div>
    );
  }
  if (file.isError || !url) return <p className="text-gray-400 text-sm text-center py-10">{t('body.fileError')}</p>;

  return report.originalName.toLowerCase().endsWith('.pdf') ? (
    <object data={url} type="application/pdf" className="w-full rounded-xl min-h-[70vh]" aria-label={report.originalName}>
      <a href={url} download={report.originalName} className="underline">
        {report.originalName}
      </a>
    </object>
  ) : (
    <img src={url} alt={t('body.imageAlt')} className="max-w-full max-h-[80vh] rounded-xl shadow-sm mx-auto block" />
  );
};

/** Body-composition reports uploaded by the trainer, newest first. */
const BodyComposition = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const reports = useBodyReports();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (reports.isPending) return <LoadingState />;
  if (reports.isError) return <ErrorState message={errorMessage(reports.error)} onRetry={() => reports.refetch()} />;
  if (reports.data.length === 0) {
    return <EmptyState icon={<FiActivity className="w-12 h-12" aria-hidden />} title={t('body.emptyTitle')} message={t('body.emptyMessage')} />;
  }

  const report = reports.data.find((r) => r.id === selectedId) ?? reports.data[0];
  const dateOf = (r: BodyReport) => formatDate(r.measurementDate || r.uploadedAt);

  const download = async () => {
    setDownloading(true);
    try {
      const file = await clientApi.download(`/body-composition/download/${report.id}`);
      saveFile(file.blob, file.fileName || report.originalName);
    } catch (error) {
      toast.error(errorMessage(error, t('common:errors.downloadFailed')));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {reports.data.length > 1 && (
        <Pills
          label={t('body.historyLabel')}
          className=""
          value={report.id}
          onChange={setSelectedId}
          options={reports.data.map((r) => ({ value: r.id, label: dateOf(r) }))}
        />
      )}

      <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              {report.measurementDate ? t('body.measurement', { date: formatDate(report.measurementDate, 'long') }) : t('body.report')}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{t('body.uploadedOn', { date: formatDate(report.uploadedAt) })}</p>
          </div>
          <Button variant="secondary" size="sm" loading={downloading} onClick={download} icon={<FiDownload className="w-4 h-4" aria-hidden />}>
            {t('common:common.download')}
          </Button>
        </div>
        <div className="p-5">{report.parsedData ? <ParsedReport parsed={report.parsedData} /> : <ReportFile key={report.id} report={report} />}</div>
      </article>
    </div>
  );
};

export default BodyComposition;
