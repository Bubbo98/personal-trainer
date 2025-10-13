import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiPlus,
  FiLink,
  FiCheck,
  FiX,
  FiTrash2,
  FiSearch,
  FiClock
} from 'react-icons/fi';
import { apiCall, formatDate } from '../../utils/adminUtils';
import { User, CreateUserForm } from '../../types/admin';

interface PdfInfo {
  expirationDate?: string;
  durationMonths?: number;
  durationDays?: number;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [userPdfs, setUserPdfs] = useState<Record<number, PdfInfo | null>>({});
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
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

      // Load PDF data for all users
      const pdfData: Record<number, PdfInfo | null> = {};
      await Promise.all(
        response.data.users.map(async (user: User) => {
          try {
            const pdfResponse = await apiCall(`/pdf/admin/user/${user.id}`);
            if (pdfResponse.data) {
              pdfData[user.id] = {
                expirationDate: pdfResponse.data.expirationDate,
                durationMonths: pdfResponse.data.durationMonths,
                durationDays: pdfResponse.data.durationDays
              };
            } else {
              pdfData[user.id] = null;
            }
          } catch {
            pdfData[user.id] = null;
          }
        })
      );
      setUserPdfs(pdfData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, []);


  // Helper functions for PDF expiration
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

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

      // Try modern clipboard API first, fallback to legacy method for mobile
      try {
        await navigator.clipboard.writeText(loginUrl);
        setCopiedLink(loginUrl);
        setTimeout(() => setCopiedLink(null), 3000);
      } catch (clipboardError) {
        // Fallback for iOS Safari and other restrictive browsers
        const textarea = document.createElement('textarea');
        textarea.value = loginUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);

        // iOS requires specific handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          const range = document.createRange();
          range.selectNodeContents(textarea);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          textarea.setSelectionRange(0, loginUrl.length);
        } else {
          textarea.select();
        }

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          setCopiedLink(loginUrl);
          setTimeout(() => setCopiedLink(null), 3000);
        } else {
          // If copy still fails, show an alert with the link
          alert(`${t('admin.users.accessLinkGenerated')}:\n\n${loginUrl}`);
        }
      }
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.users.generateLinkFailed')}`);
    }
  };

  const handleUserClick = (userId: number) => {
    navigate(`/admin/users/${userId}`);
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

      {/* Users Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
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
                <React.Fragment key={user.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleUserClick(user.id)}
                  >
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {userPdfs[user.id] ? (
                          <>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 mr-1" })}
                              Scheda
                            </span>
                            {userPdfs[user.id]?.expirationDate && (() => {
                              const daysLeft = getDaysUntilExpiration(userPdfs[user.id]!.expirationDate!);
                              return (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getExpirationColorClass(daysLeft)}`}>
                                  {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 mr-1" })}
                                  {daysLeft < 0 ? `Scaduta` : daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? '1g' : `${daysLeft}g`}
                                </span>
                              );
                            })()}
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 mr-1" })}
                            No scheda
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLogin ? formatDate(user.lastLogin) : t('admin.users.never')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
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
                </React.Fragment>
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
      </div>

      {/* Users Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* User Card Header */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-base font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {user.email}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 ml-2">
                  <button
                    onClick={() => handleGenerateLink(user.id)}
                    className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg"
                    title={t('admin.users.generateAccessLink')}
                  >
                    {React.createElement(FiLink as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                    className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg"
                    title={t('admin.users.deleteUser')}
                  >
                    {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-medium text-gray-900">{user.videoCount}</span>
                  <span className="text-gray-500">{t('admin.videos.tabTitle').toLowerCase()}</span>
                </div>

                {userPdfs[user.id] ? (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 mr-1" })}
                      Scheda
                    </span>
                    {userPdfs[user.id]?.expirationDate && (() => {
                      const daysLeft = getDaysUntilExpiration(userPdfs[user.id]!.expirationDate!);
                      return (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getExpirationColorClass(daysLeft)}`}>
                          {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 mr-1" })}
                          {daysLeft < 0 ? `Scaduta` : daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? '1g' : `${daysLeft}g`}
                        </span>
                      );
                    })()}
                  </>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 mr-1" })}
                    No scheda
                  </span>
                )}
              </div>

              {/* Last Login & Created */}
              <div className="flex flex-col gap-1 text-xs text-gray-500 pt-1">
                <div>
                  <span className="font-medium">Ultimo accesso:</span> {user.lastLogin ? formatDate(user.lastLogin) : t('admin.users.never')}
                </div>
                <div>
                  <span className="font-medium">Creato il:</span> {formatDate(user.createdAt)}
                </div>
              </div>

              {/* Manage Button */}
              <button
                onClick={() => handleUserClick(user.id)}
                className="w-full mt-2 bg-gray-900 text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 text-sm font-medium"
              >
                {t('admin.users.manage')}
              </button>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
            {searchTerm
              ? `Nessun utente trovato per "${searchTerm}"`
              : 'Nessun utente disponibile'
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;