import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FiAlertCircle, FiLock, FiLogOut, FiShoppingBag, FiStar, FiUser, FiUsers, FiVideo } from 'react-icons/fi';
import Header from '../../components/Header';
import Button from '../../components/ui/Button';
import { inputClass } from '../../components/ui/Field';
import { LoadingState } from '../../components/ui/States';
import { ApiError, adminApi } from '../../lib/api';
import { useErrorMessage } from '../../lib/errors';
import { usePageMeta } from '../../lib/usePageMeta';
import UsersPage from './users/UsersPage';
import UserDetailPage from './users/detail/UserDetailPage';
import VideosPage from './videos/VideosPage';
import ReviewsPage from './reviews/ReviewsPage';
import SupplementsPage from './supplements/SupplementsPage';

type Session = 'checking' | 'in' | 'out';

/** An admin call answered 401/403: the session is gone (expired token or not an admin). */
const isAuthError = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 403);

/**
 * Admin session: a stored token is checked against an admin-only endpoint;
 * any later 401/403 from the admin API signs out.
 */
function useAdminSession() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session>(() => (adminApi.hasToken() ? 'checking' : 'out'));
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (session !== 'checking') return;
    let cancelled = false;
    adminApi
      .get('/admin/trainers')
      .then(() => !cancelled && setSession('in'))
      .catch((error) => {
        if (cancelled) return;
        if (isAuthError(error)) {
          adminApi.clearToken();
          setExpired(true);
        }
        // Network trouble: let the admin try to sign in again
        setSession('out');
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const signOutOn = (error: unknown) => {
      if (!isAuthError(error) || !adminApi.hasToken()) return;
      adminApi.clearToken();
      queryClient.removeQueries({ queryKey: ['admin'] });
      setExpired(true);
      setSession('out');
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error' && event.query.queryKey[0] === 'admin') signOutOn(event.action.error);
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') signOutOn(event.action.error);
    });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient]);

  return {
    session,
    expired,
    signedIn: () => {
      setExpired(false);
      setSession('in');
    },
    logout: () => {
      adminApi.clearToken();
      queryClient.removeQueries({ queryKey: ['admin'] });
      setSession('out');
    },
  };
}

const LoginForm = ({ expired, onSignedIn }: { expired: boolean; onSignedIn: () => void }) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(expired ? t('sessionExpired') : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await adminApi.post<{ token: string }>('/auth/login', credentials);
      adminApi.setToken(token);
      try {
        await adminApi.get('/admin/trainers');
      } catch (err) {
        adminApi.clearToken();
        throw isAuthError(err) ? new Error(t('login.notAdmin')) : err;
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('login.failed') : err instanceof ApiError ? errorMessage(err) : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const iconInput = `${inputClass} pl-10 bg-gray-50 focus:bg-white`;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900 rounded-t-2xl px-8 py-8 text-center">
          <div className="flex justify-center gap-2 mb-4">
            <img src="/Logo/logo1-small.webp" alt="" width={40} height={40} className="w-10 h-10 object-contain rounded-lg" />
            <img src="/Logo/logo2-small.webp" alt="" width={40} height={40} className="w-10 h-10 object-contain rounded-lg" />
          </div>
          <h1 className="text-white text-xl font-bold tracking-wide">JOSHUA MAURIZIO E DENISE BERGAMO</h1>
          <p className="text-gray-400 text-sm font-light tracking-widest mt-0.5">PERSONAL TRAINER</p>
          <p className="mt-4 inline-flex items-center gap-1.5 bg-white/10 text-gray-300 text-xs px-3 py-1.5 rounded-full">
            <FiLock className="w-3 h-3" aria-hidden />
            {t('login.badge')}
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-b-2xl shadow-xl px-8 py-8 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
              <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="admin-username" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('login.username')}
            </label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                id="admin-username"
                required
                autoComplete="username"
                value={credentials.username}
                onChange={(e) => setCredentials((c) => ({ ...c, username: e.target.value }))}
                className={iconInput}
              />
            </div>
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('login.password')}
            </label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={credentials.password}
                onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))}
                className={iconInput}
              />
            </div>
          </div>
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {submitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
};

const NAV = [
  { to: '/admin/users', icon: FiUsers, label: 'nav.users' },
  { to: '/admin/videos', icon: FiVideo, label: 'nav.videos' },
  { to: '/admin/reviews', icon: FiStar, label: 'nav.reviews' },
  { to: '/admin/supplements', icon: FiShoppingBag, label: 'nav.supplements' },
] as const;

/** /admin/* — the admin area. */
const AdminPage = () => {
  const { t } = useTranslation('admin');
  const { session, expired, signedIn, logout } = useAdminSession();

  usePageMeta({ title: t('title'), noindex: true });

  if (session === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }
  if (session === 'out') return <LoginForm expired={expired} onSignedIn={signedIn} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 sm:pt-40 px-4 sm:px-6 lg:px-16 pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{t('title')}</h1>
              <p className="text-gray-600">{t('subtitle')}</p>
            </div>
            <Button variant="danger" onClick={logout} icon={<FiLogOut className="w-5 h-5" aria-hidden />}>
              <span className="hidden sm:inline">{t('logout')}</span>
            </Button>
          </div>

          <nav aria-label={t('nav.label')} className="flex gap-1 mb-8 bg-gray-200 rounded-xl p-1">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors flex-1 sm:flex-initial ${
                    isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
                aria-label={t(label)}
              >
                <Icon className="w-5 h-5" aria-hidden />
                <span className="hidden sm:inline">{t(label)}</span>
              </NavLink>
            ))}
          </nav>

          <Routes>
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:userId" element={<UserDetailPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="supplements" element={<SupplementsPage />} />
            <Route path="*" element={<Navigate to="/admin/users" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
