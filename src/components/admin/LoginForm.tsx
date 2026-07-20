import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiLock, FiUser, FiAlertCircle } from 'react-icons/fi';
import { apiCall, STORAGE_KEY } from '../../utils/adminUtils';

interface LoginFormProps {
  onLogin: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const { t } = useTranslation();
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
      setError(error instanceof Error ? error.message : t('admin.login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="bg-gray-900 rounded-t-2xl px-8 py-8 text-center">
          <div className="flex justify-center gap-2 mb-4">
            <img
              src="/Logo/logo1.jpg"
              alt="Logo"
              className="w-10 h-10 object-contain rounded-lg"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <img
              src="/Logo/logo2.jpg"
              alt="Logo"
              className="w-10 h-10 object-contain rounded-lg"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-white text-xl font-bold tracking-wide">JOSHUA MAURIZIO E DENISE BERGAMO</h1>
          <p className="text-gray-400 text-sm font-light tracking-widest mt-0.5">PERSONAL TRAINER</p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-white/10 text-gray-300 text-xs px-3 py-1.5 rounded-full">
            {React.createElement(FiLock as React.ComponentType<{ className?: string }>, { className: "w-3 h-3" })}
            Area amministratore
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-b-2xl shadow-xl px-8 py-8">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {React.createElement(FiAlertCircle as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 mt-0.5 flex-shrink-0" })}
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('admin.login.username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  {React.createElement(FiUser as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
                </div>
                <input
                  type="text"
                  required
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors placeholder:text-gray-400"
                  placeholder="joshua_admin"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('admin.login.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  {React.createElement(FiLock as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
                </div>
                <input
                  type="password"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors placeholder:text-gray-400"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {t('admin.login.loginProgress')}
                </>
              ) : (
                t('admin.login.loginButton')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
