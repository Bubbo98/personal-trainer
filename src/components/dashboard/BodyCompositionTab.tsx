import React, { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiCalendar, FiLoader } from 'react-icons/fi';
import { apiCall, STORAGE_KEY } from '../../utils/dashboardUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Report {
  id: number;
  measurementDate: string | null;
  uploadedAt: string;
  originalName: string;
  fileSize: number;
}

const BodyCompositionTab: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

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

  // Load image as blob URL whenever selected report changes
  useEffect(() => {
    if (!selectedId) { setImageUrl(null); return; }

    let objectUrl: string | null = null;
    setImageLoading(true);
    setImageUrl(null);

    const token = localStorage.getItem(STORAGE_KEY);
    fetch(`${API_BASE}/body-composition/download/${selectedId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(err => console.error('Failed to load image', err))
      .finally(() => setImageLoading(false));

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

  const report = reports.find(r => r.id === selectedId) || reports[0];

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

      {/* Card */}
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

        {/* Image */}
        <div className="p-4 flex justify-center bg-gray-50 min-h-[200px] items-center">
          {imageLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="Report composizione corporea"
              className="max-w-full rounded-xl shadow-sm"
              style={{ maxHeight: '80vh' }}
            />
          ) : (
            <p className="text-gray-400 text-sm">Impossibile caricare l'immagine</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BodyCompositionTab;
