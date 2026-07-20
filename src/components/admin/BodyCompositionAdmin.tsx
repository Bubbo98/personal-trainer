import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiUpload, FiTrash2, FiDownload, FiCalendar, FiLoader, FiImage } from 'react-icons/fi';
import { apiCall, STORAGE_KEY } from '../../utils/adminUtils';
import Tesseract from 'tesseract.js';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Report {
  id: number;
  measurementDate: string | null;
  uploadedAt: string;
  uploadedBy: string;
  originalName: string;
  fileSize: number;
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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [measurementDate, setMeasurementDate] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
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

  // Load image previews as authenticated blob URLs
  useEffect(() => {
    if (reports.length === 0) return;

    const newUrls: Record<number, string> = {};

    reports.forEach(report => {
      const token = localStorage.getItem(STORAGE_KEY);
      fetch(`${API_BASE}/body-composition/download/${report.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          newUrls[report.id] = url;
          setPreviewUrls(prev => ({ ...prev, [report.id]: url }));
        })
        .catch(() => {});
    });

    return () => {
      Object.values(newUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [reports]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);

    try {
      let ocrText: string | null = null;

      // Run OCR in the browser for image files
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        setUploadStatus('Analisi testo in corso…');
        try {
          const { data: { text } } = await Tesseract.recognize(file, 'ita', { logger: () => {} });
          ocrText = text;
        } catch (ocrErr) {
          console.warn('Browser OCR failed, uploading without parsed data', ocrErr);
        }
      }

      setUploadStatus('Caricamento…');
      const form = new FormData();
      form.append('pdf', file);
      if (measurementDate) form.append('measurementDate', measurementDate);
      if (ocrText) form.append('ocrText', ocrText);
      const token = localStorage.getItem(STORAGE_KEY);
      const response = await fetch(`${API_BASE}/body-composition/admin/upload/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setMeasurementDate('');
      await loadReports();
    } catch (err: any) {
      alert('Errore upload: ' + (err.message || 'Sconosciuto'));
    } finally {
      setUploading(false);
      setUploadStatus(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (reportId: number) => {
    if (!window.confirm('Eliminare questo report?')) return;
    try {
      await apiCall(`/body-composition/admin/report/${reportId}`, { method: 'DELETE' });
      setPreviewUrls(prev => {
        const next = { ...prev };
        if (next[reportId]) URL.revokeObjectURL(next[reportId]);
        delete next[reportId];
        return next;
      });
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (e) {
      alert('Errore eliminazione');
    }
  };

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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  };

  return (
    <div className="space-y-6">
      {/* Header + upload */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h4 className="text-base font-semibold text-gray-900">Report Composizione Corporea</h4>
          <p className="text-sm text-gray-500 mt-0.5">{reports.length} report caricati per {userName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
              {React.createElement(FiCalendar as React.ComponentType<{ className?: string }>, { className: "w-3.5 h-3.5 text-gray-400" })}
            </div>
            <input
              type="date"
              value={measurementDate}
              onChange={e => setMeasurementDate(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Data misurazione (opzionale)"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap"
          >
            {uploading
              ? React.createElement(FiLoader as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 animate-spin" })
              : React.createElement(FiUpload as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })
            }
            {uploadStatus ?? 'Carica file'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="bg-gray-100 rounded-2xl overflow-hidden">
              <div className="h-56 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <p>Nessun report caricato</p>
          <p className="text-xs mt-1">Seleziona una data opzionale e carica il PDF o l'immagine Starfit</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              {/* Preview */}
              <div className="relative bg-gray-50 flex items-center justify-center" style={{ minHeight: 220 }}>
                {previewUrls[report.id] ? (
                  report.originalName.toLowerCase().endsWith('.pdf') ? (
                    <embed
                      src={previewUrls[report.id]}
                      type="application/pdf"
                      className="w-full"
                      style={{ height: 280 }}
                    />
                  ) : (
                    <img
                      src={previewUrls[report.id]}
                      alt="Report"
                      className="w-full object-contain"
                      style={{ maxHeight: 280 }}
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-300 py-10">
                    {React.createElement(FiImage as React.ComponentType<{ className?: string }>, { className: "w-10 h-10" })}
                    <span className="text-xs">Caricamento anteprima...</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="px-4 py-3 flex-1">
                {report.measurementDate && (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-0.5">
                    {React.createElement(FiCalendar as React.ComponentType<{ className?: string }>, { className: "w-3.5 h-3.5 text-indigo-500" })}
                    {report.measurementDate}
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Caricato {formatDate(report.uploadedAt)} da {report.uploadedBy}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {report.originalName} · {formatBytes(report.fileSize)}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => handleDownload(report.id, report.originalName)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {React.createElement(FiDownload as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  Scarica
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-100 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BodyCompositionAdmin;
