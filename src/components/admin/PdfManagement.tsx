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
}

interface Props {
  userId: number;
  userName: string;
  onPdfChange?: (hasPdf: boolean) => void;
}

const PdfManagement: React.FC<Props> = ({ userId, userName, onPdfChange }) => {
  const { t } = useTranslation();
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        onPdfChange?.(!!data.data);
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
        onPdfChange?.(false);
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error) {
      alert(`${t('admin.errors.error') || 'Errore'}: ${error instanceof Error ? error.message : 'Eliminazione fallita'}`);
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
