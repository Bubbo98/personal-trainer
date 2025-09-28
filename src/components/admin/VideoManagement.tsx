import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiPlus,
  FiTrash2,
  FiVideo,
  FiX
} from 'react-icons/fi';
import { apiCall, formatDate, formatDuration, STORAGE_KEY } from '../../utils/adminUtils';
import { Video, CreateVideoForm } from '../../types/admin';

const VideoManagement: React.FC = () => {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateVideo, setShowCreateVideo] = useState(false);

  const [createVideoForm, setCreateVideoForm] = useState<CreateVideoForm>({
    title: '',
    description: '',
    filePath: '',
    duration: 0,
    category: '',
    thumbnailPath: ''
  });

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/videos');
      setVideos(response.data.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/videos', {
        method: 'POST',
        body: JSON.stringify(createVideoForm)
      });

      setVideos(prev => [{ ...response.data, userCount: 0, updatedAt: new Date().toISOString() }, ...prev]);
      setCreateVideoForm({
        title: '',
        description: '',
        filePath: '',
        duration: 0,
        category: '',
        thumbnailPath: ''
      });
      setShowCreateVideo(false);
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

      setVideos(prev => prev.filter(video => video.id !== videoId));
      alert(t('admin.videos.videoDeletedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.videos.deleteVideoFailed')}`);
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
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
        >
          {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>{t('admin.videos.newVideo')}</span>
        </button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.videos.videoTitle')}</label>
                <input
                  type="text"
                  required
                  value={createVideoForm.title}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder={t('admin.videos.titlePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.videos.description')}</label>
                <textarea
                  value={createVideoForm.description}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  rows={3}
                  placeholder={t('admin.videos.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.videos.filePath')}</label>
                <input
                  type="text"
                  required
                  value={createVideoForm.filePath}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, filePath: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder={t('admin.videos.filePathPlaceholder')}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {t('admin.videos.filePathHelp')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.videos.duration')}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={createVideoForm.duration}
                    onChange={(e) => setCreateVideoForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.videos.category')}</label>
                  <select
                    required
                    value={createVideoForm.category}
                    onChange={(e) => setCreateVideoForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  >
                    <option value="">{t('admin.videos.selectCategory')}</option>
                    <option value="calisthenics">{t('admin.videos.categories.calisthenics')}</option>
                    <option value="bodyweight">{t('admin.videos.categories.bodyweight')}</option>
                    <option value="recovery">{t('admin.videos.categories.recovery')}</option>
                    <option value="strength">{t('admin.videos.categories.strength')}</option>
                    <option value="cardio">{t('admin.videos.categories.cardio')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.videos.thumbnailPath')}</label>
                <input
                  type="text"
                  value={createVideoForm.thumbnailPath}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, thumbnailPath: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder={t('admin.videos.thumbnailPlaceholder')}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateVideo(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800"
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
        {videos.map((video) => (
          <div key={video.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="aspect-video bg-gray-200 flex items-center justify-center">
              {React.createElement(FiVideo as React.ComponentType<{ className?: string }>, { className: "w-12 h-12 text-gray-400" })}
            </div>

            <div className="p-4">
              <div className="mb-2">
                <h3 className="font-bold text-lg text-gray-900 mb-1">{video.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span className="capitalize">{video.category}</span>
                <span>{formatDuration(video.duration)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                <span>{video.userCount} {t('admin.users.tabTitle')}</span>
                <span>{t('admin.videos.createdAt')}: {formatDate(video.createdAt)}</span>
              </div>

              <div className="text-xs text-gray-500 bg-gray-100 rounded p-2 mb-3">
                <strong>File:</strong> {video.filePath}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleDeleteVideo(video.id, video.title)}
                  className="flex-1 bg-red-600 text-white text-sm py-2 px-3 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-1"
                >
                  {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoManagement;