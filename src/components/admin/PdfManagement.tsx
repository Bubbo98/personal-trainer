import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUpload, FiTrash2, FiFile } from 'react-icons/fi';

interface PdfInfo {
  id: number;
  userId: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  updatedAt: string;
  durationMonths?: number;
  durationDays?: number;
  expirationDate?: string;
}

interface Props {
  userId: number;
  userName: string;
  onPdfChange?: () => void;
}

const PdfManagement: React.FC<Props> = ({ userId, userName, onPdfChange }) => {
  const { t } = useTranslation();
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [durationMonths, setDurationMonths] = useState(2);
  const [durationDays, setDurationDays] = useState(0);
  const [extending, setExtending] = useState(false);
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [extendMonths, setExtendMonths] = useState(0);
  const [extendDays, setExtendDays] = useState(0);

  useEffect(() => {
    loadPdfInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadPdfInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_auth_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/pdf/admin/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPdfInfo(data.data);
        onPdfChange?.();
      }
    } catch (error) {
      console.error('Failed to load PDF info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert(t('admin.pdf.onlyPdfAllowed') || 'Solo file PDF sono consentiti');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(t('admin.pdf.fileTooLarge') || 'Il file è troppo grande (max 10MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const token = localStorage.getItem('admin_auth_token');
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('durationMonths', durationMonths.toString());
      formData.append('durationDays', durationDays.toString());

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/pdf/admin/upload/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        alert(pdfInfo
          ? (t('admin.pdf.updateSuccess') || 'Scheda aggiornata con successo')
          : (t('admin.pdf.uploadSuccess') || 'Scheda caricata con successo')
        );
        setSelectedFile(null);
        loadPdfInfo();
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      alert(`${t('admin.errors.error') || 'Errore'}: ${error instanceof Error ? error.message : 'Upload fallito'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('admin.pdf.confirmDelete') || `Sei sicuro di voler eliminare la scheda di ${userName}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_auth_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/pdf/admin/delete/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        alert(t('admin.pdf.deleteSuccess') || 'Scheda eliminata con successo');
        setPdfInfo(null);
        loadPdfInfo();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      alert(`${t('admin.errors.error') || 'Errore'}: ${error instanceof Error ? error.message : 'Eliminazione fallita'}`);
    }
  };

  const handleExtend = async () => {
    if (extendMonths === 0 && extendDays === 0) {
      alert('Devi specificare almeno mesi o giorni da aggiungere');
      return;
    }

    try {
      setExtending(true);
      const token = localStorage.getItem('admin_auth_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002/api'}/pdf/admin/extend/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          additionalMonths: extendMonths,
          additionalDays: extendDays
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Durata scheda estesa con successo');
        setShowExtendForm(false);
        setExtendMonths(0);
        setExtendDays(0);
        loadPdfInfo();
      } else {
        throw new Error(data.error || 'Extend failed');
      }
    } catch (error) {
      alert(`${t('admin.errors.error') || 'Errore'}: ${error instanceof Error ? error.message : 'Estensione fallita'}`);
    } finally {
      setExtending(false);
    }
  };

  const getDaysUntilExpiration = (expirationDate: string): number => {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationColor = (daysLeft: number): string => {
    if (daysLeft < 1) return 'text-red-600 bg-red-50';
    if (daysLeft < 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-600">{t('admin.loading') || 'Caricamento...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pdfInfo ? (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {React.createElement(FiFile as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 text-red-600 flex-shrink-0 mt-1" })}
                <div>
                  <h4 className="font-semibold text-gray-900">{pdfInfo.originalName}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('admin.pdf.fileSize') || 'Dimensione'}: {formatFileSize(pdfInfo.fileSize)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('admin.pdf.uploadedBy') || 'Caricato da'}: {pdfInfo.uploadedBy}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('admin.pdf.uploadedAt') || 'Data caricamento'}: {formatDate(pdfInfo.uploadedAt)}
                  </p>
                  {pdfInfo.updatedAt !== pdfInfo.uploadedAt && (
                    <p className="text-sm text-gray-500">
                      {t('admin.pdf.updatedAt') || 'Ultimo aggiornamento'}: {formatDate(pdfInfo.updatedAt)}
                    </p>
                  )}
                  {pdfInfo.expirationDate && (
                    <div className="mt-2">
                      {(() => {
                        const daysLeft = getDaysUntilExpiration(pdfInfo.expirationDate);
                        return (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getExpirationColor(daysLeft)}`}>
                            {daysLeft < 0 ? (
                              <span>Scaduta {Math.abs(daysLeft)} giorni fa</span>
                            ) : daysLeft === 0 ? (
                              <span>Scade oggi</span>
                            ) : daysLeft === 1 ? (
                              <span>Scade domani</span>
                            ) : (
                              <span>Scade tra {daysLeft} giorni</span>
                            )}
                          </div>
                        );
                      })()}
                      <p className="text-xs text-gray-400 mt-1">
                        Scadenza: {formatDate(pdfInfo.expirationDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 p-2"
                title={t('admin.pdf.delete') || 'Elimina scheda'}
              >
                {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              </button>
            </div>
          </div>

          {/* Extend Duration Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <button
              onClick={() => setShowExtendForm(!showExtendForm)}
              className="w-full text-left font-semibold text-gray-900 mb-2"
            >
              {showExtendForm ? '▼' : '▶'} Estendi Durata Scheda
            </button>

            {showExtendForm && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mesi da aggiungere</label>
                    <input
                      type="number"
                      min="0"
                      value={extendMonths}
                      onChange={(e) => setExtendMonths(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giorni da aggiungere</label>
                    <input
                      type="number"
                      min="0"
                      value={extendDays}
                      onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <button
                  onClick={handleExtend}
                  disabled={extending || (extendMonths === 0 && extendDays === 0)}
                  className={`w-full px-4 py-2 rounded-lg font-medium ${
                    extending || (extendMonths === 0 && extendDays === 0)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {extending ? 'Estensione in corso...' : 'Estendi Durata'}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          {React.createElement(FiFile as React.ComponentType<{ className?: string }>, { className: "w-12 h-12 text-gray-400 mx-auto mb-2" })}
          <p className="text-gray-600">{t('admin.pdf.noPdf') || 'Nessuna scheda caricata per questo utente'}</p>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <h4 className="font-semibold text-gray-900 mb-3">
          {pdfInfo
            ? (t('admin.pdf.replacePdf') || 'Sostituisci scheda')
            : (t('admin.pdf.uploadPdf') || 'Carica scheda')}
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin.pdf.selectFile') || 'Seleziona file PDF (max 10MB)'}
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durata (mesi)
              </label>
              <input
                type="number"
                min="0"
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durata (giorni)
              </label>
              <input
                type="number"
                min="0"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
              <div className="flex items-center space-x-2">
                {React.createElement(FiFile as React.ComponentType<{ className?: string }>, { className: "text-red-600" })}
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-red-600 hover:text-red-700"
              >
                {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
              </button>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium ${
              selectedFile && !uploading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {React.createElement(FiUpload as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
            <span>
              {uploading
                ? (t('admin.pdf.uploading') || 'Caricamento...')
                : pdfInfo
                  ? (t('admin.pdf.replace') || 'Sostituisci')
                  : (t('admin.pdf.upload') || 'Carica')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfManagement;
