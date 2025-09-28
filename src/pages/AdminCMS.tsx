import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import LoginForm from '../components/admin/LoginForm';
import UserManagement from '../components/admin/UserManagement';
import VideoManagement from '../components/admin/VideoManagement';
import ReviewManagement from '../components/admin/ReviewManagement';
import {
  FiUsers,
  FiVideo,
  FiEye,
  FiLogOut,
  FiMessageSquare
} from 'react-icons/fi';
import { apiCall, STORAGE_KEY } from '../utils/adminUtils';
import { AdminState } from '../types/admin';


const AdminCMS: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
          error: t('admin.sessionExpired')
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
      <Helmet>
        <title>{t('pages.admin.title')}</title>
      </Helmet>
      <Header />

      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto">

          {/* CMS Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin CMS</h1>
              <p className="text-gray-600">{t('admin.siteManagement')}</p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors"
              >
                {React.createElement(FiEye as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                <span>{t('admin.viewSite')}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
              >
                {React.createElement(FiLogOut as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                <span>{t('admin.logout')}</span>
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
              <span>{t('admin.users.tabTitle')}</span>
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
              <span>{t('admin.videos.tabTitle')}</span>
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
              <span>{t('admin.reviews.tabTitle')}</span>
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