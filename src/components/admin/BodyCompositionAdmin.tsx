import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiUpload, FiTrash2, FiDownload, FiCalendar, FiLoader } from 'react-icons/fi';
import { apiCall } from '../../utils/adminUtils';

interface Report {
  id: number;
  measurementDate: string | null;
  uploadedAt: string;
  uploadedBy: string;
  originalName: string;
  fileSize: number;
  parsedData: any | null;
}

interface Props {
  userId: number;
  userName: string;
}

function formatBytes(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const BodyCompositionAdmin: React.FC<Props> = ({ userId, userName }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/body-composition/admin/${userId}`);
      setReports(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('pdf', file);
      const token = localStorage.getItem('adminToken');
      const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${base}/body-composition/admin/upload/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      await loadReports();
    } catch (err: any) {
      alert('Errore upload: ' + (err.message || 'Sconosciuto'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (reportId: number) => {
    if (!window.confirm('Eliminare questo report?')) return;
    try {
      await apiCall(`/body-composition/admin/report/${reportId}`, { method: 'DELETE' });
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (e) {
      alert('Errore eliminazione');
    }
  };

  const handleDownload = (reportId: number, originalName: string) => {
    const token = localStorage.getItem('adminToken');
    const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const url = `${base}/body-composition/download/${reportId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = originalName;
        a.click();
      });
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-gray-900">Report Composizione Corporea</h4>
          <p className="text-sm text-gray-500 mt-0.5">{reports.length} report caricati per {userName}</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {uploading
              ? React.createElement(FiLoader as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 animate-spin" })
              : React.createElement(FiUpload as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })
            }
            {uploading ? 'Caricamento...' : 'Carica report Starfit'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <p>Nessun report caricato</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const parsed = report.parsedData;
            const score = parsed?.bodyScore;
            const peso = parsed?.bodyComposition?.Peso?.value;
            return (
              <div key={report.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                {/* Score badge */}
                {score != null && (
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-indigo-600 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-white leading-none">{score}</span>
                    <span className="text-xs text-indigo-200 leading-none">/100</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {report.measurementDate && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {React.createElement(FiCalendar as React.ComponentType<{ className?: string }>, { className: "w-3 h-3" })}
                        Misurazione: {report.measurementDate}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">caricato {formatDate(report.uploadedAt)} da {report.uploadedBy}</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-sm">
                    {peso != null && <span className="text-gray-700">Peso: <strong>{peso} kg</strong></span>}
                    {parsed?.bodyComposition?.['Grasso corporeo']?.value != null && (
                      <span className="text-gray-700">Grasso: <strong>{parsed.bodyComposition['Grasso corporeo'].value} kg</strong></span>
                    )}
                    {parsed?.bodyComposition?.['Muscolo scheletrico']?.value != null && (
                      <span className="text-gray-700">Muscolo scheletrico: <strong>{parsed.bodyComposition['Muscolo scheletrico'].value} kg</strong></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{report.originalName} · {formatBytes(report.fileSize)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(report.id, report.originalName)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Scarica PDF"
                  >
                    {React.createElement(FiDownload as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Elimina"
                  >
                    {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BodyCompositionAdmin;
