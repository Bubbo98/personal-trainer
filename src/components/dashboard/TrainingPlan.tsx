import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiFile, FiAlertCircle, FiClock } from 'react-icons/fi';
import { STORAGE_KEY } from '../../utils/dashboardUtils';

interface PdfInfo {
  originalName: string;
  fileSize: number;
  uploadedAt: string;
  updatedAt: string;
  expirationDate?: string;
}

// Icon wrapper components
const DownloadIcon = () => React.createElement(FiDownload as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" });
const FileIcon = ({ className }: { className?: string }) => React.createElement(FiFile as React.ComponentType<{ className?: string }>, { className });
const AlertIcon = () => React.createElement(FiAlertCircle as React.ComponentType<{ className?: string }>, { className: "w-12 h-12 text-red-500 mx-auto mb-3" });

const TrainingPlan: React.FC = () => {
  const { t } = useTranslation();
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPdfInfo();
  }, []);

  const loadPdfInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem(STORAGE_KEY);

      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${backendUrl}/pdf/my-pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setPdfInfo(data.data);
      } else {
        setError(data.error || 'Failed to load PDF info');
      }
    } catch (error) {
      console.error('Failed to load PDF info:', error);
      setError('Failed to load PDF info');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem(STORAGE_KEY);

      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${backendUrl}/pdf/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'scheda-allenamento.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert(t('dashboard.pdf.downloadFailed') || 'Download fallito. Riprova più tardi.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiration = (expirationDate: string): number => {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationColorClass = (daysLeft: number): string => {
    if (daysLeft < 1) return 'bg-red-100 text-red-800 border-red-300';
    if (daysLeft < 7) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">{t('dashboard.loading') || 'Caricamento...'}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertIcon />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('dashboard.pdf.noPlanYet') || 'Nessuna scheda disponibile'}
          </h3>
          <p className="text-gray-600">
            {t('dashboard.pdf.noPlanMessage') || 'Il tuo personal trainer non ha ancora caricato una scheda di allenamento per te. Contattalo per maggiori informazioni.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <FileIcon className="w-7 h-7 mr-3" />
            {t('dashboard.pdf.myTrainingPlan') || 'La Mia Scheda di Allenamento'}
          </h2>
        </div>

        <div className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                <FileIcon className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {pdfInfo.originalName}
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <span className="font-medium">{t('dashboard.pdf.fileSize') || 'Dimensione'}:</span>{' '}
                  {formatFileSize(pdfInfo.fileSize)}
                </p>
                <p>
                  <span className="font-medium">{t('dashboard.pdf.uploadedAt') || 'Caricato il'}:</span>{' '}
                  {formatDate(pdfInfo.uploadedAt)}
                </p>
                {pdfInfo.updatedAt !== pdfInfo.uploadedAt && (
                  <p>
                    <span className="font-medium">{t('dashboard.pdf.updatedAt') || 'Aggiornato il'}:</span>{' '}
                    {formatDate(pdfInfo.updatedAt)}
                  </p>
                )}
              </div>

              {/* Expiration countdown */}
              {pdfInfo.expirationDate && (() => {
                const daysLeft = getDaysUntilExpiration(pdfInfo.expirationDate);
                return (
                  <div className="mt-3">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${getExpirationColorClass(daysLeft)}`}>
                      {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 mr-2" })}
                      {daysLeft < 0 ? (
                        <span>Scheda scaduta {Math.abs(daysLeft)} giorni fa</span>
                      ) : daysLeft === 0 ? (
                        <span>La scheda scade oggi</span>
                      ) : daysLeft === 1 ? (
                        <span>La scheda scade domani</span>
                      ) : daysLeft < 7 ? (
                        <span>La scheda scade tra {daysLeft} giorni</span>
                      ) : (
                        <span>Scade tra {daysLeft} giorni</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Data scadenza: {formatDate(pdfInfo.expirationDate)}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full flex items-center justify-center space-x-3 px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
              downloading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            <DownloadIcon />
            <span>
              {downloading
                ? (t('dashboard.pdf.downloading') || 'Download in corso...')
                : (t('dashboard.pdf.download') || 'Scarica Scheda')}
            </span>
          </button>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{t('dashboard.pdf.tip') || 'Consiglio'}:</strong>{' '}
              {t('dashboard.pdf.tipMessage') || 'Salva la scheda sul tuo dispositivo per consultarla anche offline durante gli allenamenti.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPlan;
