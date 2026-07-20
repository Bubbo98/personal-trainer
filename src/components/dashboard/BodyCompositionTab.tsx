import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiCalendar, FiLoader } from 'react-icons/fi';
import { apiCall, STORAGE_KEY } from '../../utils/dashboardUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface ParsedCompositionRow {
  value: number;
  percent: number;
  valutazione: string;
}

interface ParsedData {
  header: {
    id: string | null;
    genere: string | null;
    eta: number | null;
    altezzaCm: number | null;
    dataRilevazione: string | null;
  };
  bodyComposition: Record<string, ParsedCompositionRow | null>;
  bodyScore: number | null;
  weightControl: {
    pesoObiettivo: number | null;
    controlloPeso: number | null;
    controlloGrasso: number | null;
    controlloMuscoli: number | null;
  };
  obesityEvaluation: {
    imc: number | null;
    percGrasso: number | null;
    livelloObesita: number | null;
  };
  otherIndicators: {
    livelloGrassoViscerale: number | null;
    tassoMetabolicoBasale: number | null;
    massaCorporeaMagra: number | null;
    grassoSottocutaneo: number | null;
    smi: number | null;
    etaCorporea: number | null;
    rapportoVitaFianchi: number | null;
  };
}

interface Report {
  id: number;
  measurementDate: string | null;
  uploadedAt: string;
  originalName: string;
  fileSize: number;
  parsedData: ParsedData | null;
}

const VALUTAZIONE_COLOR: Record<string, string> = {
  'Eccellente': 'text-green-600 bg-green-50',
  'Sopra la Media': 'text-green-500 bg-green-50',
  'Standard': 'text-blue-600 bg-blue-50',
  'Normale': 'text-blue-600 bg-blue-50',
  'Sotto la Media': 'text-yellow-600 bg-yellow-50',
  'Bassa': 'text-yellow-600 bg-yellow-50',
  'Alta': 'text-orange-600 bg-orange-50',
  'Sovrappeso': 'text-orange-600 bg-orange-50',
  'Sottopeso': 'text-yellow-600 bg-yellow-50',
  'Gravemente sovrappeso': 'text-red-600 bg-red-50',
};

function ValBadge({ v }: { v: string }) {
  const cls = VALUTAZIONE_COLOR[v] || 'text-gray-600 bg-gray-100';
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{v}</span>;
}

function CompositionTable({ data }: { data: Record<string, ParsedCompositionRow | null> }) {
  const labels: Record<string, string> = {
    'Peso': 'Peso',
    'Grasso corporeo': 'Grasso corporeo',
    'Minerali': 'Minerali',
    'Proteine': 'Proteine',
    'Acqua corporea': 'Acqua corporea',
    'Muscoloso': 'Muscoloso',
    'Muscolo scheletrico': 'Muscolo scheletrico',
  };
  const rows = Object.entries(labels).filter(([k]) => data[k]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 text-xs">Parametro</th>
            <th className="text-right py-2 px-2 font-medium text-gray-500 text-xs">Valore</th>
            <th className="text-right py-2 px-2 font-medium text-gray-500 text-xs">%</th>
            <th className="text-right py-2 pl-2 font-medium text-gray-500 text-xs">Valutazione</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label]) => {
            const row = data[key]!;
            return (
              <tr key={key} className="border-b border-gray-50">
                <td className="py-2 pr-4 text-gray-700 font-medium">{label}</td>
                <td className="py-2 px-2 text-right text-gray-900 font-semibold">{row.value}</td>
                <td className="py-2 px-2 text-right text-gray-500">{row.percent}%</td>
                <td className="py-2 pl-2 text-right"><ValBadge v={row.valutazione} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string | number | null; unit?: string }[] }) {
  const visible = items.filter(i => i.value !== null && i.value !== undefined);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {visible.map(item => (
        <div key={item.label} className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
          <p className="text-base font-semibold text-gray-900">
            {item.value}{item.unit && <span className="text-xs font-normal text-gray-500 ml-0.5">{item.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

function ParsedReport({ parsed }: { parsed: ParsedData }) {
  const { header, bodyComposition, bodyScore, weightControl, obesityEvaluation, otherIndicators } = parsed;
  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="flex flex-wrap gap-4 items-center">
        {header.dataRilevazione && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            {React.createElement(FiCalendar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-indigo-500" })}
            <span className="font-medium">{header.dataRilevazione}</span>
          </div>
        )}
        {header.eta && <span className="text-sm text-gray-500">{header.eta} anni</span>}
        {header.altezzaCm && <span className="text-sm text-gray-500">{header.altezzaCm} cm</span>}
        {bodyScore !== null && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-gray-400">Body Score</span>
            <span className="text-2xl font-bold text-indigo-600">{bodyScore}</span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        )}
      </div>

      {/* Composition table */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Composizione Corporea</h4>
        <CompositionTable data={bodyComposition} />
      </div>

      {/* Obesity evaluation */}
      {(obesityEvaluation.imc || obesityEvaluation.percGrasso || obesityEvaluation.livelloObesita) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Valutazione Obesità</h4>
          <StatGrid items={[
            { label: 'IMC', value: obesityEvaluation.imc, unit: 'kg/m²' },
            { label: '% Grasso', value: obesityEvaluation.percGrasso, unit: '%' },
            { label: 'Livello Obesità', value: obesityEvaluation.livelloObesita, unit: '%' },
          ]} />
        </div>
      )}

      {/* Other indicators */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Altri Indicatori</h4>
        <StatGrid items={[
          { label: 'Grasso Viscerale', value: otherIndicators.livelloGrassoViscerale },
          { label: 'Metabolismo Basale', value: otherIndicators.tassoMetabolicoBasale, unit: 'kcal' },
          { label: 'Massa Magra', value: otherIndicators.massaCorporeaMagra, unit: 'kg' },
          { label: 'Grasso Sottocutaneo', value: otherIndicators.grassoSottocutaneo, unit: '%' },
          { label: 'SMI', value: otherIndicators.smi, unit: 'kg/m²' },
          { label: 'Età Corporea', value: otherIndicators.etaCorporea, unit: 'anni' },
          { label: 'Rapporto Vita/Fianchi', value: otherIndicators.rapportoVitaFianchi },
        ]} />
      </div>

      {/* Weight control */}
      {(weightControl.pesoObiettivo || weightControl.controlloPeso) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Controllo Peso</h4>
          <StatGrid items={[
            { label: 'Peso Obiettivo', value: weightControl.pesoObiettivo, unit: 'kg' },
            { label: 'Controllo Peso', value: weightControl.controlloPeso, unit: 'kg' },
            { label: 'Controllo Grasso', value: weightControl.controlloGrasso, unit: 'kg' },
            { label: 'Controllo Muscoli', value: weightControl.controlloMuscoli, unit: 'kg' },
          ]} />
        </div>
      )}
    </div>
  );
}

const BodyCompositionTab: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/body-composition/my-reports');
      const data: Report[] = res.data;
      setReports(data);
      if (data.length > 0) setSelectedId(data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const report = reports.find(r => r.id === selectedId) || reports[0] || null;
  const isPdf = report?.originalName?.toLowerCase().endsWith('.pdf');

  // Load file as blob URL when selected report changes (only for images/PDFs without parsed data displayed inline)
  useEffect(() => {
    if (!selectedId) { setFileUrl(null); return; }

    let objectUrl: string | null = null;
    setFileLoading(true);
    setFileUrl(null);

    const token = localStorage.getItem(STORAGE_KEY);
    fetch(`${API_BASE}/body-composition/download/${selectedId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setFileUrl(objectUrl);
      })
      .catch(err => console.error('Failed to load file', err))
      .finally(() => setFileLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selectedId]);

  const handleDownload = (reportId: number, originalName: string) => {
    const token = localStorage.getItem(STORAGE_KEY);
    fetch(`${API_BASE}/body-composition/download/${reportId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = originalName;
        a.click();
      });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        {React.createElement(FiLoader as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 animate-spin text-indigo-600" })}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">Nessuna analisi corporea disponibile</p>
        <p className="text-sm mt-1">Il tuo PT caricherà i report dopo le misurazioni.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* History selector */}
      {reports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {reports.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                r.id === selectedId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {React.createElement(FiCalendar as React.ComponentType<{ className?: string }>, { className: "w-3.5 h-3.5" })}
              {r.measurementDate || new Date(r.uploadedAt).toLocaleDateString('it-IT')}
            </button>
          ))}
        </div>
      )}

      {report && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">
                {report.measurementDate ? `Misurazione: ${report.measurementDate}` : 'Analisi corporea'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Caricato il {new Date(report.uploadedAt).toLocaleDateString('it-IT')}
              </p>
            </div>
            <button
              onClick={() => handleDownload(report.id, report.originalName)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              {React.createElement(FiDownload as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
              Scarica
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {report.parsedData ? (
              <ParsedReport parsed={report.parsedData} />
            ) : fileLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
              </div>
            ) : fileUrl ? (
              isPdf ? (
                <embed
                  src={fileUrl}
                  type="application/pdf"
                  className="w-full rounded-xl"
                  style={{ minHeight: '70vh' }}
                />
              ) : (
                <img
                  src={fileUrl}
                  alt="Report composizione corporea"
                  className="max-w-full rounded-xl shadow-sm mx-auto block"
                  style={{ maxHeight: '80vh' }}
                />
              )
            ) : (
              <p className="text-gray-400 text-sm text-center py-10">Impossibile caricare il file</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyCompositionTab;
