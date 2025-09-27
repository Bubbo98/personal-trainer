import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import {
  FiUsers,
  FiVideo,
  FiPlus,
  FiTrash2,
  FiLink,
  FiEye,
  FiLogOut,
  FiCheck,
  FiX,
  FiStar,
  FiMessageSquare
} from 'react-icons/fi';

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const STORAGE_KEY = 'admin_auth_token';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  videoCount: number;
}

interface Video {
  id: number;
  title: string;
  description: string;
  filePath: string;
  duration: number;
  thumbnailPath?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface CreateVideoForm {
  title: string;
  description: string;
  filePath: string;
  duration: number;
  category: string;
  thumbnailPath: string;
}

interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  user: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
}

interface AdminState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Utility functions
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem(STORAGE_KEY);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Components
const LoginForm: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      localStorage.setItem(STORAGE_KEY, response.data.token);
      onLogin();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login fallito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Admin CMS
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="joshua_admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Login...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [userVideos, setUserVideos] = useState<Record<number, Video[]>>({});
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      const response = await apiCall('/admin/videos');
      setVideos(response.data.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  }, []);

  const loadUserVideos = useCallback(async (userId: number) => {
    try {
      const response = await apiCall(`/admin/users/${userId}/videos`);
      setUserVideos(prev => ({
        ...prev,
        [userId]: response.data.videos
      }));
    } catch (error) {
      console.error('Failed to load user videos:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadVideos();
  }, [loadUsers, loadVideos]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/users', {
        method: 'POST',
        body: JSON.stringify(createUserForm)
      });

      setUsers(prev => [response.data.user, ...prev]);
      setCreateUserForm({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: ''
      });
      setShowCreateUser(false);

      // Show success message with login URL
      alert(`Utente creato! Link di accesso:\n${response.data.loginUrl}`);
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Creazione fallita'}`);
    }
  };

  const handleGenerateLink = async (userId: number) => {
    try {
      const response = await apiCall(`/admin/users/${userId}/generate-link`, {
        method: 'POST'
      });

      const loginUrl = response.data.loginUrl;
      await navigator.clipboard.writeText(loginUrl);
      setCopiedLink(loginUrl);
      setTimeout(() => setCopiedLink(null), 3000);
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Generazione link fallita'}`);
    }
  };

  const handleToggleUserDetails = (user: User) => {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
    } else {
      setSelectedUser(user);
      loadUserVideos(user.id);
    }
  };

  const handleAssignVideo = async (userId: number, videoId: number) => {
    try {
      await apiCall(`/admin/users/${userId}/videos/${videoId}`, {
        method: 'POST'
      });

      loadUsers(); // Refresh user data
      loadUserVideos(userId); // Refresh user's videos
      alert('Video assegnato con successo!');
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Assegnazione fallita'}`);
    }
  };

  const handleRevokeVideo = async (userId: number, videoId: number) => {
    try {
      await apiCall(`/admin/users/${userId}/videos/${videoId}`, {
        method: 'DELETE'
      });

      loadUsers(); // Refresh user data
      loadUserVideos(userId); // Refresh user's videos
      alert('Accesso video revocato!');
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Revoca fallita'}`);
    }
  };

  if (loading && users.length === 0) {
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
        <h2 className="text-2xl font-bold text-gray-900">Gestione Utenti</h2>
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
        >
          {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>Nuovo Utente</span>
        </button>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Nuovo Utente</h3>
              <button
                onClick={() => setShowCreateUser(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" })}
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={createUserForm.firstName}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                  <input
                    type="text"
                    required
                    value={createUserForm.lastName}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={createUserForm.username}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800"
                >
                  Crea Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message */}
      {copiedLink && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
          <span>Link copiato negli appunti!</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Video
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ultimo Accesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.username} • {user.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        Creato: {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.videoCount} video
                    </div>
                    <button
                      onClick={() => handleToggleUserDetails(user)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedUser?.id === user.id ? 'Nascondi' : 'Gestisci'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Mai'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGenerateLink(user.id)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Genera link di accesso"
                      >
                        {React.createElement(FiLink as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Video Assignment Panel */}
        {selectedUser && (
          <div className="border-t bg-gray-50 p-4">
            <h4 className="font-medium text-gray-900 mb-4">
              Gestisci video per {selectedUser.firstName} {selectedUser.lastName}
            </h4>

            {/* Currently Assigned Videos */}
            {userVideos[selectedUser.id] && userVideos[selectedUser.id].length > 0 && (
              <div className="mb-6">
                <h5 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                  {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-green-600 mr-2" })}
                  Video Assegnati ({userVideos[selectedUser.id].length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {userVideos[selectedUser.id].map((video) => (
                    <div key={video.id} className="bg-white p-3 rounded-lg border border-green-200 bg-green-50">
                      <div className="mb-2">
                        <div className="font-medium text-sm text-gray-900 flex items-center">
                          {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 text-green-600 mr-1" })}
                          {video.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {video.category} • {formatDuration(video.duration)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeVideo(selectedUser.id, video.id)}
                        className="w-full bg-red-600 text-white text-xs py-1 px-2 rounded hover:bg-red-700"
                      >
                        Revoca Accesso
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Videos to Assign */}
            <div>
              <h5 className="font-medium text-sm text-gray-700 mb-3">
                Video Disponibili
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {videos
                  .filter(video => {
                    const userHasVideo = userVideos[selectedUser.id]?.some(uv => uv.id === video.id);
                    return !userHasVideo;
                  })
                  .map((video) => (
                    <div key={video.id} className="bg-white p-3 rounded-lg border">
                      <div className="mb-2">
                        <div className="font-medium text-sm text-gray-900">{video.title}</div>
                        <div className="text-xs text-gray-500">
                          {video.category} • {formatDuration(video.duration)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignVideo(selectedUser.id, video.id)}
                        className="w-full bg-green-600 text-white text-xs py-1 px-2 rounded hover:bg-green-700"
                      >
                        Assegna Video
                      </button>
                    </div>
                  ))
                }
              </div>

              {videos.filter(video => {
                const userHasVideo = userVideos[selectedUser.id]?.some(uv => uv.id === video.id);
                return !userHasVideo;
              }).length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  Tutti i video sono già stati assegnati a questo utente
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VideoManagement: React.FC = () => {
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
      alert('Video creato con successo!');
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Creazione fallita'}`);
    }
  };

  const handleDeleteVideo = async (videoId: number, videoTitle: string) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il video "${videoTitle}"?\n\nQuesta azione rimuoverà anche tutti gli accessi degli utenti a questo video.`)) {
      return;
    }

    try {
      await apiCall(`/admin/videos/${videoId}`, {
        method: 'DELETE'
      });

      setVideos(prev => prev.filter(video => video.id !== videoId));
      alert('Video eliminato con successo!');
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Eliminazione fallita'}`);
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
        <h2 className="text-2xl font-bold text-gray-900">Gestione Video</h2>
        <button
          onClick={() => setShowCreateVideo(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
        >
          {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>Nuovo Video</span>
        </button>
      </div>

      {/* Create Video Modal */}
      {showCreateVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Nuovo Video</h3>
              <button
                onClick={() => setShowCreateVideo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" })}
              </button>
            </div>

            <form onSubmit={handleCreateVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                <input
                  type="text"
                  required
                  value={createVideoForm.title}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder="Nome del video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                  value={createVideoForm.description}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  rows={3}
                  placeholder="Descrizione del video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File</label>
                <input
                  type="text"
                  required
                  value={createVideoForm.filePath}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, filePath: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder="categoria/nome-file.mp4"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Percorso relativo a /public/videos/
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durata (secondi)</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    required
                    value={createVideoForm.category}
                    onChange={(e) => setCreateVideoForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  >
                    <option value="">Seleziona...</option>
                    <option value="calisthenics">Calisthenics</option>
                    <option value="bodyweight">Bodyweight</option>
                    <option value="recovery">Recovery</option>
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail (opzionale)</label>
                <input
                  type="text"
                  value={createVideoForm.thumbnailPath}
                  onChange={(e) => setCreateVideoForm(prev => ({ ...prev, thumbnailPath: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder="categoria/thumbnail.jpg"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateVideo(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800"
                >
                  Crea Video
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
                <span>{video.userCount} utenti</span>
                <span>Creato: {formatDate(video.createdAt)}</span>
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
                  <span>Elimina</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReviewManagement: React.FC = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/reviews');
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleApproveReview = async (reviewId: number, approved: boolean) => {
    try {
      await apiCall(`/admin/reviews/${reviewId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ approved })
      });
      loadReviews();
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Operazione fallita'}`);
    }
  };

  const handleFeatureReview = async (reviewId: number, featured: boolean) => {
    try {
      await apiCall(`/admin/reviews/${reviewId}/feature`, {
        method: 'PUT',
        body: JSON.stringify({ featured })
      });
      loadReviews();
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Operazione fallita'}`);
    }
  };

  const handleDeleteReview = async (reviewId: number, authorName: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare la recensione di ${authorName}?`)) {
      try {
        await apiCall(`/admin/reviews/${reviewId}`, {
          method: 'DELETE'
        });
        loadReviews();
      } catch (error) {
        alert(`Errore: ${error instanceof Error ? error.message : 'Eliminazione fallita'}`);
      }
    }
  };

  const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, i) => (
        React.createElement(FiStar as React.ComponentType<{ className?: string }>, {
          key: i.toString(),
          className: `w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`
        })
      ))}
    </div>
  );

  if (loading && reviews.length === 0) {
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
        <h2 className="text-2xl font-bold text-gray-900">Gestione Recensioni</h2>
        <div className="text-sm text-gray-600">
          {reviews.length} recensioni totali
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-600">{t('reviews.noReviews')}</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {review.user.firstName} {review.user.lastName}
                    </h3>
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-gray-600">({review.rating}/5)</span>
                  </div>

                  {review.title && (
                    <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                  )}

                  <p className="text-gray-700 mb-3 leading-relaxed">{review.comment}</p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Creata: {formatDate(review.createdAt)}</span>
                    {review.updatedAt !== review.createdAt && (
                      <span>Modificata: {formatDate(review.updatedAt)}</span>
                    )}
                    {review.approvedAt && (
                      <span>Approvata: {formatDate(review.approvedAt)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {/* Status badges */}
                  <div className="flex flex-col space-y-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {review.isApproved ? 'Approvata' : 'In attesa'}
                    </span>
                    {review.isFeatured && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        In evidenza
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex space-x-2">
                  {/* Approve/Reject buttons */}
                  {!review.isApproved ? (
                    <button
                      onClick={() => handleApproveReview(review.id, true)}
                      className="bg-green-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-green-700 flex items-center space-x-1"
                    >
                      {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      <span>Approva</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApproveReview(review.id, false)}
                      className="bg-yellow-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-yellow-700 flex items-center space-x-1"
                    >
                      {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      <span>Rimuovi approvazione</span>
                    </button>
                  )}

                  {/* Feature/Unfeature buttons */}
                  {review.isApproved && (
                    !review.isFeatured ? (
                      <button
                        onClick={() => handleFeatureReview(review.id, true)}
                        className="bg-blue-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                      >
                        {React.createElement(FiStar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                        <span>Metti in evidenza</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFeatureReview(review.id, false)}
                        className="bg-gray-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-gray-700 flex items-center space-x-1"
                      >
                        {React.createElement(FiStar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                        <span>Rimuovi evidenza</span>
                      </button>
                    )
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteReview(review.id, `${review.user.firstName} ${review.user.lastName}`)}
                  className="bg-red-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-red-700 flex items-center space-x-1"
                >
                  {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  <span>Elimina</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiche</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
              <div className="text-sm text-gray-600">Totali</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reviews.filter(r => r.isApproved).length}
              </div>
              <div className="text-sm text-gray-600">Approvate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reviews.filter(r => r.isFeatured).length}
              </div>
              <div className="text-sm text-gray-600">In evidenza</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0'}
              </div>
              <div className="text-sm text-gray-600">Media voti</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminCMS: React.FC = () => {
  const navigate = useNavigate();
  // const { t } = useTranslation(); // Unused for now
  const [adminState, setAdminState] = useState<AdminState>({
    isAuthenticated: false,
    loading: true,
    error: null
  });
  const [activeTab, setActiveTab] = useState<'users' | 'videos' | 'reviews'>('users');

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEY);

      if (!token) {
        setAdminState({
          isAuthenticated: false,
          loading: false,
          error: null
        });
        return;
      }

      try {
        await apiCall('/auth/verify');
        setAdminState({
          isAuthenticated: true,
          loading: false,
          error: null
        });
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        setAdminState({
          isAuthenticated: false,
          loading: false,
          error: 'Sessione scaduta'
        });
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setAdminState({
      isAuthenticated: true,
      loading: false,
      error: null
    });
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminState({
      isAuthenticated: false,
      loading: false,
      error: null
    });
  };

  // Loading state
  if (adminState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Login required
  if (!adminState.isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Main CMS interface
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto">

          {/* CMS Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin CMS</h1>
              <p className="text-gray-600">Gestisci utenti e video del sistema</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors"
              >
                {React.createElement(FiEye as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                <span>Visualizza Sito</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
              >
                {React.createElement(FiLogOut as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mb-8 bg-gray-200 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {React.createElement(FiUsers as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span>Utenti</span>
            </button>

            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'videos'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {React.createElement(FiVideo as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span>Video</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span>Recensioni</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' ? (
            <UserManagement />
          ) : activeTab === 'videos' ? (
            <VideoManagement />
          ) : (
            <ReviewManagement />
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminCMS;