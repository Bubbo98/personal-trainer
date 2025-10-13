import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiArrowLeft,
  FiVideo,
  FiFileText,
  FiCheck,
  FiSearch,
  FiTrash2
} from 'react-icons/fi';
import { apiCall, formatDuration } from '../../utils/adminUtils';
import { Video } from '../../types/admin';
import PdfManagement from './PdfManagement';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

type TabType = 'videos' | 'pdf';

const UserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoSearchTerm, setVideoSearchTerm] = useState('');

  const loadUser = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await apiCall('/admin/users');
      const foundUser = response.data.users.find((u: User) => u.id === parseInt(userId));
      if (foundUser) {
        setUser(foundUser);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadVideos = useCallback(async () => {
    try {
      const response = await apiCall('/admin/videos');
      setVideos(response.data.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  }, []);

  const loadUserVideos = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await apiCall(`/admin/users/${userId}/videos`);
      setUserVideos(response.data.videos);
    } catch (error) {
      console.error('Failed to load user videos:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
    loadVideos();
    loadUserVideos();
  }, [loadUser, loadVideos, loadUserVideos]);

  const handleAssignVideo = async (videoId: number) => {
    if (!userId) return;

    try {
      await apiCall(`/admin/users/${userId}/videos/${videoId}`, {
        method: 'POST'
      });

      loadUserVideos();
      alert(t('admin.users.videoAssignedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.assignVideoFailed')}`);
    }
  };

  const handleRevokeVideo = async (videoId: number) => {
    if (!userId) return;

    try {
      await apiCall(`/admin/users/${userId}/videos/${videoId}`, {
        method: 'DELETE'
      });

      loadUserVideos();
      alert(t('admin.users.videoRevokedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.revokeVideoFailed')}`);
    }
  };

  // Filter videos
  const getFilteredVideos = () => {
    const search = videoSearchTerm || '';
    if (!search) {
      return {
        assigned: userVideos,
        available: videos.filter(v => !userVideos.some(uv => uv.id === v.id))
      };
    }

    const searchLower = search.toLowerCase();
    const filterFn = (video: Video) => {
      return (
        video.title.toLowerCase().includes(searchLower) ||
        video.category.toLowerCase().includes(searchLower) ||
        (video.description && video.description.toLowerCase().includes(searchLower))
      );
    };

    return {
      assigned: userVideos.filter(filterFn),
      available: videos.filter(v => !userVideos.some(uv => uv.id === v.id)).filter(filterFn)
    };
  };

  const filteredVideos = getFilteredVideos();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Torna agli utenti"
        >
          {React.createElement(FiArrowLeft as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" })}
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-sm text-gray-600">
            {user.username} • {user.email}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('videos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'videos'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {React.createElement(FiVideo as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
              <span>Video</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'pdf'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {React.createElement(FiFileText as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
              <span>Scheda Allenamento</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
              </div>
              <input
                type="text"
                placeholder="Cerca video..."
                value={videoSearchTerm}
                onChange={(e) => setVideoSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
              />
            </div>
            {videoSearchTerm && (
              <div className="text-sm text-gray-500">
                {filteredVideos.assigned.length + filteredVideos.available.length} video trovati
              </div>
            )}
          </div>

          {/* Assigned Videos */}
          {filteredVideos.assigned.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-green-600 mr-2" })}
                Video Assegnati ({filteredVideos.assigned.length}{videoSearchTerm ? ` su ${userVideos.length}` : ''})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.assigned.map((video) => (
                  <div key={video.id} className="bg-white border-2 border-green-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center">
                          {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-green-600 mr-1" })}
                          {video.title}
                        </h4>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="capitalize">{video.category}</div>
                          <div>{formatDuration(video.duration)}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeVideo(video.id)}
                      className="w-full mt-3 bg-red-600 text-white text-sm py-2 px-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      <span>Revoca Accesso</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Videos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Video Disponibili ({filteredVideos.available.length}{videoSearchTerm ? ` su ${videos.filter(v => !userVideos.some(uv => uv.id === v.id)).length}` : ''})
            </h3>
            {filteredVideos.available.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                {videoSearchTerm
                  ? `Nessun video disponibile trovato per "${videoSearchTerm}"`
                  : 'Tutti i video sono già stati assegnati a questo utente'
                }
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.available.map((video) => (
                  <div key={video.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-900 mb-1">{video.title}</h4>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="capitalize">{video.category}</div>
                        <div>{formatDuration(video.duration)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignVideo(video.id)}
                      className="w-full bg-green-600 text-white text-sm py-2 px-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Assegna Video
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pdf' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Scheda di Allenamento
          </h3>
          <PdfManagement
            userId={user.id}
            userName={`${user.firstName} ${user.lastName}`}
            onPdfChange={() => {
              // Reload if needed
            }}
          />
        </div>
      )}
    </div>
  );
};

export default UserDetail;
