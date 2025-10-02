import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiPlus,
  FiLink,
  FiCheck,
  FiX,
  FiTrash2,
  FiSearch
} from 'react-icons/fi';
import { apiCall, formatDate, formatDuration } from '../../utils/adminUtils';
import { User, Video, CreateUserForm } from '../../types/admin';
import PdfManagement from './PdfManagement';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [userVideos, setUserVideos] = useState<Record<number, Video[]>>({});
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    username: '',
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
        firstName: '',
        lastName: ''
      });
      setShowCreateUser(false);

      // Show success message with login URL
      alert(`${t('admin.users.userCreatedSuccess')} ${t('admin.users.generateAccessLink')}:\n${response.data.loginUrl}`);
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.createUserFailed')}`);
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
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.generateLinkFailed')}`);
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
      alert(t('admin.users.videoAssignedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.assignVideoFailed')}`);
    }
  };

  const handleRevokeVideo = async (userId: number, videoId: number) => {
    try {
      await apiCall(`/admin/users/${userId}/videos/${videoId}`, {
        method: 'DELETE'
      });

      loadUsers(); // Refresh user data
      loadUserVideos(userId); // Refresh user's videos
      alert(t('admin.users.videoRevokedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.revokeVideoFailed')}`);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`${t('admin.users.confirmDelete')} ${userName}?`)) {
      return;
    }

    try {
      await apiCall(`/admin/users/${userId}`, {
        method: 'DELETE'
      });

      loadUsers(); // Refresh user data
      setSelectedUser(null); // Clear selected user if it was deleted
      alert(t('admin.users.userDeletedSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.deleteUserFailed')}`);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
      user.username.toLowerCase().includes(searchLower) ||
      (user.email && user.email.toLowerCase().includes(searchLower))
    );
  });

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
        <h2 className="text-2xl font-bold text-gray-900">{t('admin.users.title')}</h2>
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
        >
          {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>{t('admin.users.newUser')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
          </div>
          <input
            type="text"
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
        </div>
        {searchTerm && (
          <div className="text-sm text-gray-500">
            {filteredUsers.length} di {users.length} utenti
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{t('admin.users.newUser')}</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.users.firstName')}</label>
                  <input
                    type="text"
                    required
                    value={createUserForm.firstName}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.users.lastName')}</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.users.username')}</label>
                <input
                  type="text"
                  required
                  value={createUserForm.username}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800"
                >
                  {t('admin.users.newUser')}
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
          <span>{t('admin.users.accessLinkGenerated')}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.users.tabTitle')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.users.videoCount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.users.lastLogin')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.users.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
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
                        {t('admin.videos.createdAt')}: {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.videoCount} {t('admin.videos.tabTitle').toLowerCase()}
                    </div>
                    <button
                      onClick={() => handleToggleUserDetails(user)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedUser?.id === user.id ? t('admin.users.hide') : t('admin.users.manage')}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLogin ? formatDate(user.lastLogin) : t('admin.users.never')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGenerateLink(user.id)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title={t('admin.users.generateAccessLink')}
                      >
                        {React.createElement(FiLink as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title={t('admin.users.deleteUser')}
                      >
                        {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm
                      ? `Nessun utente trovato per "${searchTerm}"`
                      : 'Nessun utente disponibile'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Video Assignment Panel */}
        {selectedUser && (
          <div className="border-t bg-gray-50 p-4">
            <h4 className="font-medium text-gray-900 mb-4">
              {t('admin.users.manageVideosFor')} {selectedUser.firstName} {selectedUser.lastName}
            </h4>

            {/* Currently Assigned Videos */}
            {userVideos[selectedUser.id] && userVideos[selectedUser.id].length > 0 && (
              <div className="mb-6">
                <h5 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                  {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-green-600 mr-2" })}
                  {t('admin.users.assignVideo')} ({userVideos[selectedUser.id].length})
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
                        {t('admin.users.revokeVideo')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Videos to Assign */}
            <div>
              <h5 className="font-medium text-sm text-gray-700 mb-3">
                {t('admin.users.availableVideos')}
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
                        {t('admin.users.assignVideo')}
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
                  {t('admin.users.allVideosAssigned')}
                </div>
              )}
            </div>

            {/* PDF Management Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h5 className="font-medium text-sm text-gray-700 mb-3">
                {t('admin.pdf.trainingPlan') || 'Scheda di Allenamento'}
              </h5>
              <PdfManagement
                userId={selectedUser.id}
                userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;