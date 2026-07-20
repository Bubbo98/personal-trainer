import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiCalendar, FiLoader } from 'react-icons/fi';
import { apiCall, STORAGE_KEY } from '../../utils/dashboardUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface BodyCompositionRow {
  value: number;
  percent: number;
  valutazione: string;
}

interface ParsedData {
  header?: {
    id?: string | null;
    genere?: string | null;
    eta?: number | null;
    altezzaCm?: number | null;
    dataRilevazione?: string | null;
  };
  bodyScore?: number | null;
  bodyComposition?: Record<string, BodyCompositionRow | null>;
  weightControl?: {
    pesoObiettivo?: number | null;
    controlloPeso?: number | null;
    controlloGrasso?: number | null;
    controlloMuscoli?: number | null;
  };
  obesityEvaluation?: {
    imc?: number | null;
    percGrasso?: number | null;
    livelloObesita?: number | null;
  };
  otherIndicators?: {
    livelloGrassoViscerale?: number | null;
    tassoMetabolicoBasale?: number | null;
    massaCorporeaMagra?: number | null;
    grassoSottocutaneo?: number | null;
    smi?: number | null;
    etaCorporea?: number | null;
    rapportoVitaFianchi?: number | null;
  };
  bioelectricalImpedance?: {
    '20kHz'?: Record<string, number> | null;
    '100kHz'?: Record<string, number> | null;
  };
  exerciseCalories?: { nome: string; kcal: number }[];
}

interface Report {
  id: number;
  measurementDate: string | null;
  uploadedAt: string;
  originalName: string;
  fileSize: number;
  parsedData: ParsedData | null;
}

const VALUTAZIONE_COLORS: Record<string, string> = {
  'Eccellente':           'bg-emerald-100 text-emerald-800',
  'Standard':             'bg-gray-100 text-gray-700',
  'Sopra la Media':       'bg-blue-100 text-blue-800',
  'Sotto la Media':       'bg-orange-100 text-orange-800',
  'Alta':                 'bg-red-100 text-red-800',
  'Bassa':                'bg-blue-100 text-blue-800',
  'Normale':              'bg-gray-100 text-gray-700',
  'Sovrappeso':           'bg-orange-100 text-orange-800',
  'Sottopeso':            'bg-yellow-100 text-yellow-800',
  'Gravemente sovrappeso':'bg-red-100 text-red-800',
};

function valBadge(v: string | undefined) {
  if (!v) return null;
  const cls = VALUTAZIONE_COLORS[v] || 'bg-gray-100 text-gray-700';
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{v}</span>;
}

function fmt(n: number | null | undefined, unit = '') {
  if (n == null) return '—';
  return `${n}${unit}`;
}

function fmtSign(n: number | null | undefined, unit = '') {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n}${unit}`;
}

const COMPOSITION_ROWS = [
  'Peso',
  'Grasso corporeo',
  'Muscolo scheletrico',
  'Muscoloso',
  'Proteine',
  'Minerali',
  'Acqua corporea',
];

const SEGMENT_LABELS: Record<string, string> = {
  braccioDx: 'Braccio Dx',
  braccioSx: 'Braccio Sx',
  tronco: 'Tronco',
  gambaDx: 'Gamba Dx',
  gambaSx: 'Gamba Sx',
};

const BodyCompositionTab: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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

  const report = reports.find(r => r.id === selectedId) || reports[0];
  const p = report.parsedData;

  return (
    <div className="space-y-6">
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

      {/* Score + header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center gap-6">
        {p?.bodyScore != null && (
          <div className="flex-shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center shadow-lg">
            <span className="text-3xl font-black text-white leading-none">{p.bodyScore}</span>
            <span className="text-xs text-indigo-200 font-medium">/100</span>
          </div>
        )}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm text-gray-400 mb-1">
            {report.measurementDate ? `Misurazione: ${report.measurementDate}` : `Caricato il ${new Date(report.uploadedAt).toLocaleDateString('it-IT')}`}
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-gray-700">
            {p?.header?.genere && <span>Genere: <strong>{p.header.genere}</strong></span>}
            {p?.header?.eta != null && <span>Età: <strong>{p.header.eta} anni</strong></span>}
            {p?.header?.altezzaCm != null && <span>Altezza: <strong>{p.header.altezzaCm} cm</strong></span>}
          </div>
        </div>
        <button
          onClick={() => handleDownload(report.id, report.originalName)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {React.createElement(FiDownload as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          Scarica PDF
        </button>
      </div>

      {/* Body Composition Table */}
      {p?.bodyComposition && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Composizione Corporea</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Componente</th>
                  <th className="px-6 py-3 text-right">Valore</th>
                  <th className="px-6 py-3 text-right">%</th>
                  <th className="px-6 py-3 text-right">Valutazione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {COMPOSITION_ROWS.map(rowName => {
                  const row = p.bodyComposition![rowName];
                  if (!row) return null;
                  const unit = rowName === 'Peso' ? ' kg' : rowName === 'Acqua corporea' ? ' L' : ' kg';
                  return (
                    <tr key={rowName} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-800">{rowName}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{fmt(row.value, unit)}</td>
                      <td className="px-6 py-3 text-right text-gray-500">{fmt(row.percent, '%')}</td>
                      <td className="px-6 py-3 text-right">{valBadge(row.valutazione)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weight Control + Obesity Eval */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {p?.weightControl && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Controllo Peso</h3>
            <dl className="space-y-2 text-sm">
              {p.weightControl.pesoObiettivo != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Peso obiettivo</dt>
                  <dd className="font-medium text-gray-800">{fmt(p.weightControl.pesoObiettivo, ' kg')}</dd>
                </div>
              )}
              {p.weightControl.controlloPeso != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Controllo Peso</dt>
                  <dd className="font-medium text-gray-800">{fmtSign(p.weightControl.controlloPeso, ' kg')}</dd>
                </div>
              )}
              {p.weightControl.controlloGrasso != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Controllo Grasso</dt>
                  <dd className="font-medium text-gray-800">{fmtSign(p.weightControl.controlloGrasso, ' kg')}</dd>
                </div>
              )}
              {p.weightControl.controlloMuscoli != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Controllo Muscoli</dt>
                  <dd className="font-medium text-gray-800">{fmtSign(p.weightControl.controlloMuscoli, ' kg')}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {p?.obesityEvaluation && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Valutazione Obesità</h3>
            <dl className="space-y-2 text-sm">
              {p.obesityEvaluation.imc != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">IMC (kg/m²)</dt>
                  <dd className="font-medium text-gray-800">{p.obesityEvaluation.imc}</dd>
                </div>
              )}
              {p.obesityEvaluation.percGrasso != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">% Grasso corporeo</dt>
                  <dd className="font-medium text-gray-800">{fmt(p.obesityEvaluation.percGrasso, '%')}</dd>
                </div>
              )}
              {p.obesityEvaluation.livelloObesita != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Livello Obesità</dt>
                  <dd className="font-medium text-gray-800">{fmt(p.obesityEvaluation.livelloObesita, '%')}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Other Indicators */}
      {p?.otherIndicators && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Altri Indicatori</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {p.otherIndicators.livelloGrassoViscerale != null && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-800">{p.otherIndicators.livelloGrassoViscerale}</div>
                <div className="text-xs text-gray-500 mt-1">Grasso Viscerale</div>
              </div>
            )}
            {p.otherIndicators.tassoMetabolicoBasale != null && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-800">{p.otherIndicators.tassoMetabolicoBasale}</div>
                <div className="text-xs text-gray-500 mt-1">BMR (kcal)</div>
              </div>
            )}
            {p.otherIndicators.massaCorporeaMagra != null && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-800">{p.otherIndicators.massaCorporeaMagra}</div>
                <div className="text-xs text-gray-500 mt-1">Massa Magra (kg)</div>
              </div>
            )}
            {p.otherIndicators.grassoSottocutaneo != null && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-800">{p.otherIndicators.grassoSottocutaneo}</div>
                <div className="text-xs text-gray-500 mt-1">Grasso Sottoc. (kg)</div>
              </div>
            )}
            {p.otherIndicators.smi != null && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-800">{p.otherIndicators.smi}</div>
                <div className="text-xs text-gray-500 mt-1">SMI</div>
              </div>
            )}
            {p.otherIndicators.etaCorporea != null && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-800">{p.otherIndicators.etaCorporea}</div>
                <div className="text-xs text-gray-500 mt-1">Età Corporea</div>
              </div>
            )}
            {p.otherIndicators.rapportoVitaFianchi != null && (
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-800">{p.otherIndicators.rapportoVitaFianchi}</div>
                <div className="text-xs text-gray-500 mt-1">Vita/Fianchi</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bioelectrical Impedance */}
      {p?.bioelectricalImpedance && (p.bioelectricalImpedance['20kHz'] || p.bioelectricalImpedance['100kHz']) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Impedenza Bioelettrica (Ω)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Frequenza</th>
                  {Object.keys(SEGMENT_LABELS).map(k => (
                    <th key={k} className="px-4 py-3 text-right">{SEGMENT_LABELS[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(['20kHz', '100kHz'] as const).map(freq => {
                  const row = p.bioelectricalImpedance![freq];
                  if (!row) return null;
                  return (
                    <tr key={freq} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-800">{freq}</td>
                      {Object.keys(SEGMENT_LABELS).map(k => (
                        <td key={k} className="px-4 py-3 text-right text-gray-700">{row[k] ?? '—'}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exercise Calories */}
      {p?.exerciseCalories && p.exerciseCalories.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Calorie per Esercizio</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {p.exerciseCalories.map((ex, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-700 truncate mr-2">{ex.nome}</span>
                <span className="font-semibold text-gray-900 flex-shrink-0">{ex.kcal} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyCompositionTab;
