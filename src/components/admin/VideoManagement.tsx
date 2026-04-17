import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiPlus,
  FiTrash2,
  FiVideo,
  FiX,
  FiUpload,
  FiPlay,
  FiEdit,
  FiSearch
} from 'react-icons/fi';
import { apiCall, formatDate, formatDuration } from '../../utils/adminUtils';
import { Video, CreateVideoForm } from '../../types/admin';

const MUSCLE_GROUPS = ['Polpaccio','Quadricipite','Femorale','Gluteo','Lombare','Dorsale','Trapezio','Pettorale','Spalle','Bicipite','Tricipite','Addome','Avambraccio','Cardio'];

// Responsive page size: fewer cards on smaller screens
const getPageSize = () => {
  if (typeof window === 'undefined') return 20;
  if (window.innerWidth < 768) return 6;   // mobile: 1 col
  if (window.innerWidth < 1024) return 12; // tablet: 2 cols
  return 20;                               // desktop: 3 cols
};

const VideoManagement: React.FC = () => {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(getPageSize);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('');
  const [showCreateVideo, setShowCreateVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    thumbnailPath: '',
    muscleGroup: ''
  });

  const [createVideoForm, setCreateVideoForm] = useState<CreateVideoForm>({
    title: '',
    description: '',
    filePath: '',
    duration: 0,
    category: '',
    thumbnailPath: '',
    muscleGroup: ''
  });

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) params.append('search', search);
      if (muscleGroupFilter) params.append('muscleGroup', muscleGroupFilter);
      const response = await apiCall(`/admin/videos?${params}`);
      setVideos(response.data.videos);
      setTotalCount(response.data.totalCount);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, muscleGroupFilter, pageSize]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Debounce search input → trigger server-side search and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);

      // Try to extract duration from video file
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const durationInSeconds = Math.floor(video.duration);
        setCreateVideoForm(prev => ({ ...prev, duration: durationInSeconds }));
      };
      video.src = URL.createObjectURL(file);
    } else {
      alert(t('admin.videos.onlyVideoFiles'));
    }
  };

  const handleUploadVideo = async () => {
    if (!selectedFile) {
      alert(t('admin.videos.selectVideoFile'));
      return;
    }

    if (!createVideoForm.category) {
      alert(t('admin.videos.selectCategoryFirst'));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Step 1: Get presigned URL from backend
      const urlResponse = await apiCall('/admin/videos/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          category: createVideoForm.category
        })
      });

      const { uploadUrl, filePath } = urlResponse.data;

      // Step 2: Upload directly to R2 using presigned URL
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.send(selectedFile);
      });

      await uploadPromise;

      // Update form with uploaded file path
      setCreateVideoForm(prev => ({ ...prev, filePath }));
      alert(t('admin.videos.uploadSuccess'));

    } catch (error) {
      console.error('Upload error:', error);
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.videos.uploadFailed')}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/admin/videos', {
        method: 'POST',
        body: JSON.stringify(createVideoForm)
      });

      setCreateVideoForm({
        title: '',
        description: '',
        filePath: '',
        duration: 0,
        category: '',
        thumbnailPath: '',
        muscleGroup: ''
      });
      setSelectedFile(null);
      setShowCreateVideo(false);
      setPage(1);
      loadVideos();
      alert(t('admin.videos.videoCreatedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.videos.createVideoFailed')}`);
    }
  };

  const handleDeleteVideo = async (videoId: number, videoTitle: string) => {
    if (!window.confirm(t('admin.videos.deleteConfirm', { title: videoTitle }))) {
      return;
    }

    try {
      await apiCall(`/admin/videos/${videoId}`, {
        method: 'DELETE'
      });

      loadVideos();
      alert(t('admin.videos.videoDeletedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.videos.deleteVideoFailed')}`);
    }
  };

  const handlePreviewVideo = async (video: Video) => {
    try {
      // Get video with signed URL from admin endpoint (no permission check)
      const response = await apiCall(`/admin/videos/${video.id}/preview`);
      setPreviewVideo(response.data.video);
    } catch (error) {
      console.error('Failed to load video preview:', error);
      alert('Impossibile caricare l\'anteprima del video');
    }
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setEditForm({
      title: video.title,
      description: video.description || '',
      thumbnailPath: video.thumbnailPath || '',
      muscleGroup: video.muscleGroup || ''
    });
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    try {
      await apiCall(`/admin/videos/${editingVideo.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });

      // Update video in list
      setVideos(prev => prev.map(v =>
        v.id === editingVideo.id
          ? { ...v, title: editForm.title, description: editForm.description, thumbnailPath: editForm.thumbnailPath, muscleGroup: editForm.muscleGroup || null }
          : v
      ));

      setEditingVideo(null);
      setEditForm({ title: '', description: '', thumbnailPath: '', muscleGroup: '' });
      alert('Video aggiornato con successo!');
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : 'Aggiornamento fallito'}`);
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('admin.videos.title')}</h2>
        <button
          onClick={() => setShowCreateVideo(true)}
          className="bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>{t('admin.videos.newVideo')}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
          </div>
          <input
            type="text"
            placeholder="Cerca per titolo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
          />
        </div>

        <select
          value={muscleGroupFilter}
          onChange={(e) => { setPage(1); setMuscleGroupFilter(e.target.value); }}
          className="w-full sm:w-auto appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow text-sm"
        >
          <option value="">Tutti i gruppi muscolari</option>
          {MUSCLE_GROUPS.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <div className="text-sm text-gray-500 sm:ml-auto">
          {totalCount} video{(search || muscleGroupFilter) ? ' trovati' : ' totali'}
        </div>
      </div>

      {/* Create Video Modal */}
      {showCreateVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('admin.videos.newVideo')}</h3>
              <button
                onClick={() => setShowCreateVideo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" })}
              </button>
            </div>

            <form onSubmit={handleCreateVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.videos.videoTitle')}</label>
                <input
                  type="text"
                  required
                  value={createVideoForm.title}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                  placeholder={t('admin.videos.titlePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.videos.description')}</label>
                <textarea
                  value={createVideoForm.description}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                  rows={3}
                  placeholder={t('admin.videos.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.videos.category')}</label>
                <select
                  required
                  value={createVideoForm.category}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                >
                  <option value="">{t('admin.videos.selectCategory')}</option>
                  <option value="palestra">{t('admin.videos.categories.palestra')}</option>
                  <option value="corpoLibero">{t('admin.videos.categories.corpoLibero')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gruppo muscolare (opzionale)</label>
                <select
                  value={createVideoForm.muscleGroup}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, muscleGroup: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                >
                  <option value="">Nessuno</option>
                  {MUSCLE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Video File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5.5">{t('admin.videos.videoFile')}</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      disabled={isUploading || !createVideoForm.category}
                      className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {selectedFile && !isUploading && !createVideoForm.filePath && (
                      <button
                        type="button"
                        onClick={handleUploadVideo}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        {React.createElement(FiUpload as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                        <span>{t('admin.videos.upload')}</span>
                      </button>
                    )}
                  </div>

                  {selectedFile && (
                    <div className="text-sm text-gray-600">
                      <strong>{t('admin.videos.selectedFile')}:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('admin.videos.uploading')}</span>
                        <span className="font-semibold text-blue-600">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* File Path (auto-populated after upload) */}
                  {createVideoForm.filePath && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-xs font-semibold text-green-700 mb-1">{t('admin.videos.uploadedPath')}:</div>
                      <div className="text-xs text-green-600 break-all">{createVideoForm.filePath}</div>
                    </div>
                  )}

                  {!createVideoForm.category && (
                    <div className="text-xs text-orange-600">
                      {t('admin.videos.selectCategoryFirst')}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.videos.duration')}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={createVideoForm.duration}
                    onChange={(e) => setCreateVideoForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {t('admin.videos.autoDetected')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.videos.thumbnailPath')}</label>
                  <input
                    type="text"
                    value={createVideoForm.thumbnailPath}
                    onChange={(e) => setCreateVideoForm(prev => ({ ...prev, thumbnailPath: e.target.value }))}
                    className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                    placeholder={t('admin.videos.thumbnailPlaceholder')}
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateVideo(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-2.5 px-4 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  {t('admin.videos.newVideo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            {(search || muscleGroupFilter)
              ? 'Nessun video trovato con i filtri selezionati'
              : 'Nessun video disponibile'
            }
          </div>
        ) : (
          videos.map((video) => (
          <div key={video.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
              {video.thumbnailPath ? (
                <img
                  src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001'}/thumbnails/${video.thumbnailPath}`}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                React.createElement(FiVideo as React.ComponentType<{ className?: string }>, { className: "w-12 h-12 text-gray-400" })
              )}
            </div>

            <div className="p-3 sm:p-4">
              <div className="mb-2">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 line-clamp-2">{video.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">{video.description}</p>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span className="capitalize">{video.category}</span>
                <span>{formatDuration(video.duration)}</span>
              </div>

              {video.muscleGroup && (
                <div className="mb-2">
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {video.muscleGroup}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <span>{video.userCount} {t('admin.users.tabTitle')}</span>
                <span>{t('admin.videos.createdAt')}: {formatDate(video.createdAt)}</span>
              </div>

              <div className="hidden sm:block text-xs text-gray-500 bg-gray-100 rounded p-2 mb-3">
                <strong>File:</strong> {video.filePath}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handlePreviewVideo(video)}
                  className="bg-blue-600 text-white text-xs py-2.5 px-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="Anteprima"
                >
                  {React.createElement(FiPlay as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                </button>
                <button
                  onClick={() => handleEditVideo(video)}
                  className="bg-green-600 text-white text-xs py-2.5 px-2 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center"
                  title="Modifica"
                >
                  {React.createElement(FiEdit as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                </button>
                <button
                  onClick={() => handleDeleteVideo(video.id, video.title)}
                  className="bg-red-600 text-white text-xs py-2.5 px-2 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center"
                  title="Elimina"
                >
                  {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                </button>
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Precedente
          </button>
          <span className="text-sm text-gray-600">
            Pagina {page} di {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Successiva →
          </button>
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Modifica Video</h3>
              <button
                onClick={() => setEditingVideo(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" })}
              </button>
            </div>

            <form onSubmit={handleUpdateVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titolo *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                  placeholder="Nome del video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrizione</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                  rows={3}
                  placeholder="Descrizione del video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Thumbnail Path</label>
                <input
                  type="text"
                  value={editForm.thumbnailPath}
                  onChange={(e) => setEditForm(prev => ({ ...prev, thumbnailPath: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                  placeholder="categoria/thumb.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gruppo muscolare (opzionale)</label>
                <select
                  value={editForm.muscleGroup}
                  onChange={(e) => setEditForm(prev => ({ ...prev, muscleGroup: e.target.value }))}
                  className="w-full appearance-none bg-white px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors select-arrow"
                >
                  <option value="">Nessuno</option>
                  {MUSCLE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-100 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">
                  <strong>File:</strong> {editingVideo.filePath}
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Categoria:</strong> {editingVideo.category}
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Durata:</strong> {formatDuration(editingVideo.duration)}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-2.5 px-4 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setPreviewVideo(null)}
        >
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute -top-12 right-0 text-white text-xl hover:text-gray-300 z-10"
              aria-label="Chiudi video"
            >
              ✕
            </button>

            <div className="bg-white rounded-lg overflow-hidden">
              <video
                controls
                autoPlay
                className="w-full h-auto max-h-[70vh]"
                src={previewVideo.signedUrl || `/videos/${previewVideo.filePath}`}
                onError={() => console.error('Video loading failed:', previewVideo.filePath)}
              >
                <source src={previewVideo.signedUrl || `/videos/${previewVideo.filePath}`} type="video/mp4" />
                Il tuo browser non supporta la riproduzione video.
              </video>

              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{previewVideo.title}</h3>
                {previewVideo.description && (
                  <p className="text-gray-700 mb-2 whitespace-pre-wrap">{previewVideo.description}</p>
                )}
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span>{formatDuration(previewVideo.duration)}</span>
                  <span className="capitalize">{previewVideo.category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoManagement;