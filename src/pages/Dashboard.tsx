import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import VideoPlayer from '../components/dashboard/VideoPlayer';
import VideoCard from '../components/dashboard/VideoCard';
import CategoryFilter from '../components/dashboard/CategoryFilter';
import SearchBar from '../components/dashboard/SearchBar';
import TrainingPlan from '../components/dashboard/TrainingPlan';
import FeedbackTab from '../components/dashboard/FeedbackTab';
import ReviewTab from '../components/dashboard/ReviewTab';
import IntegrazioneTab from '../components/dashboard/IntegrazioneTab';
import WorkoutTab, { getCurrentWeekStart } from '../components/dashboard/WorkoutTab';
import BodyCompositionTab from '../components/dashboard/BodyCompositionTab';
import { FiGrid, FiLogOut, FiGift, FiMessageSquare, FiCheckCircle, FiActivity, FiTrendingUp, FiCheckSquare, FiMoreHorizontal } from 'react-icons/fi';
import { SiInstagram, SiTiktok } from 'react-icons/si';

import { type Video, type AuthState, type VideoState } from '../types/dashboard';
import { STORAGE_KEY, apiCall, formatDate } from '../utils/dashboardUtils';

interface TrainingDay {
  id: number;
  userId: number;
  dayNumber: number;
  dayName: string | null;
  createdAt: string;
  updatedAt: string;
  videos: Video[];
}

interface DashboardProps {}

// Top-level sections shown in the bottom bar (mobile) / top bar (desktop).
// 'reviews' has no nav entry: it's only reachable via the ?tab=reviews link.
type Section = 'allenamento' | 'progressi' | 'check' | 'altro' | 'reviews';
type TrainingView = 'giorni' | 'video' | 'scheda';
type ProgressView = 'pesi' | 'analisi';

type IconType = React.ComponentType<{ className?: string }>;

const NAV_ITEMS: { id: Exclude<Section, 'reviews'>; label: string; icon: IconType }[] = [
  { id: 'allenamento', label: 'Allenamento', icon: FiActivity as IconType },
  { id: 'progressi', label: 'Progressi', icon: FiTrendingUp as IconType },
  { id: 'check', label: 'Check', icon: FiCheckSquare as IconType },
  { id: 'altro', label: 'Altro', icon: FiMoreHorizontal as IconType },
];

// 'warn' = something to do soon, 'alert' = needs attention now
type Badge = 'warn' | 'alert' | null;

const BADGE_COLORS: Record<Exclude<Badge, null>, { dot: string; ping: string }> = {
  warn: { dot: 'bg-orange-500', ping: 'bg-orange-400' },
  alert: { dot: 'bg-red-500', ping: 'bg-red-400' },
};

/** Pulsing dot that draws the eye to a section/sub-section needing action. */
const BadgeDot: React.FC<{ badge: Badge; className?: string }> = ({ badge, className = '' }) => {
  if (!badge) return null;
  const colors = BADGE_COLORS[badge];
  return (
    <span className={`absolute flex w-3 h-3 ${className}`}>
      <span className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${colors.ping}`} />
      <span className={`relative inline-flex w-3 h-3 rounded-full border-2 border-white ${colors.dot}`} />
    </span>
  );
};

/**
 * Sub-sections inside a section, rendered as separate tiles (icon + label)
 * rather than a flat segmented control, so it's obvious there are several
 * pages to explore. A badge dot flags the ones that need the user's attention.
 */
function SubTabs<T extends string>({ items, active, onChange }: {
  items: { id: T; label: string; badge?: Badge }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className={`grid gap-2 sm:gap-3 mb-6 ${items.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative flex items-center justify-center px-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              isActive
                ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 shadow-sm'
            }`}
          >
            <span>{item.label}</span>
            <BadgeDot badge={item.badge ?? null} className="-top-1 -right-1" />
          </button>
        );
      })}
    </div>
  );
}


const Dashboard: React.FC<DashboardProps> = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null
  });

  const [videoState, setVideoState] = useState<VideoState>({
    videos: [],
    categories: [],
    selectedCategory: null,
    searchQuery: '',
    loading: false,
    error: null
  });

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [section, setSection] = useState<Section>('allenamento');
  const [trainingView, setTrainingView] = useState<TrainingView>('giorni');
  const [progressView, setProgressView] = useState<ProgressView>('pesi');
  const [hasTrainingPlan, setHasTrainingPlan] = useState(false);
  const [planExpirationDate, setPlanExpirationDate] = useState<string | null>(null);
  const [weightsPending, setWeightsPending] = useState(false);
  // null while loading; decides between the merged Giorni view and the plain day videos
  const [hasExercises, setHasExercises] = useState<boolean | null>(null);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [trainingDaysLoading, setTrainingDaysLoading] = useState(true);
  const [checkInRequired, setCheckInRequired] = useState(false);
  const [trainerSeenNotifications, setTrainerSeenNotifications] = useState<any[]>([]);

  // Authentication logic
  const authenticateWithToken = useCallback(async (authToken: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      // First try login-link endpoint
      const response = await apiCall('/auth/login-link', {
        method: 'POST',
        body: JSON.stringify({ token: authToken })
      });

      const { token: sessionToken, user } = response.data;

      // Store session token
      localStorage.setItem(STORAGE_KEY, sessionToken);

      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null
      });

      return sessionToken;
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
      throw error;
    }
  }, []);

  const verifyStoredToken = useCallback(async () => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (!storedToken) {
      throw new Error('No stored token');
    }

    const response = await apiCall('/auth/verify', {
      headers: {
        Authorization: `Bearer ${storedToken}`
      }
    });

    setAuthState({
      isAuthenticated: true,
      user: response.data.user,
      loading: false,
      error: null
    });

    return storedToken;
  }, []);


  // Check if user has a training plan
  const checkTrainingPlan = useCallback(async (authToken: string) => {
    try {
      const response = await apiCall('/pdf/my-pdf', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setHasTrainingPlan(response.success && response.data);
      setPlanExpirationDate(response.data?.expirationDate || null);
    } catch (error) {
      console.error('Failed to check training plan:', error);
      setHasTrainingPlan(false);
    }
  }, []);

  // Weights are "pending" when the plan has exercises but nothing was logged
  // yet this week — drives the reminder dot on Allenamento › Pesi.
  const checkWeightsPending = useCallback(async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [planRes, logsRes] = await Promise.all([
        apiCall('/workout/plan', { headers }),
        apiCall(`/workout/logs?weekStart=${getCurrentWeekStart()}`, { headers }),
      ]);
      const hasExercises = (planRes.data?.exercises || []).length > 0;
      const loggedThisWeek = (logsRes.data?.logs || []).length > 0;
      setWeightsPending(hasExercises && !loggedThisWeek);
      setHasExercises(hasExercises);
    } catch (error) {
      console.error('Failed to check weekly weights:', error);
      setHasExercises(false);
    }
  }, []);

  // Check if check is required
  const checkIfCheckInRequired = useCallback(async (authToken: string) => {
    try {
      const response = await apiCall('/feedback/should-show', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const shouldShow = response.data?.shouldShow || false;
      setCheckInRequired(shouldShow);
      if (shouldShow) {
        setSection('check');
      }
    } catch (error) {
      console.error('Failed to check check status:', error);
      setCheckInRequired(false);
    }
  }, []);


  // Check if PT has seen any of the user's check-ins — show banner once then auto-dismiss
  const checkTrainerSeenNotifications = useCallback(async (authToken: string) => {
    try {
      const response = await apiCall('/feedback/trainer-seen-notification', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const notifications = response.data.notifications || [];
      setTrainerSeenNotifications(notifications);
      if (notifications.length > 0) {
        // Auto-dismiss so it won't show again on next visit
        apiCall('/feedback/dismiss-trainer-seen', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(err => console.error('Failed to auto-dismiss trainer seen notifications:', err));
      }
    } catch (error) {
      console.error('Failed to check trainer seen notifications:', error);
    }
  }, []);

  // Load videos
  const loadVideos = useCallback(async (authToken: string) => {
    try {
      setVideoState(prev => ({ ...prev, loading: true, error: null }));

      const [videosResponse, categoriesResponse] = await Promise.all([
        apiCall('/videos', {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        apiCall('/videos/categories', {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);

      setVideoState({
        videos: videosResponse.data.videos,
        categories: categoriesResponse.data.categories,
        selectedCategory: null,
        searchQuery: '',
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load videos:', error);
      setVideoState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load videos'
      }));
    }
  }, []);

  // Load training days
  const loadTrainingDays = useCallback(async (authToken: string) => {
    setTrainingDaysLoading(true);
    try {
      const response = await apiCall('/videos/training-days', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setTrainingDays(response.data.trainingDays);
    } catch (error) {
      console.error('Failed to load training days:', error);
      setTrainingDays([]);
    } finally {
      setTrainingDaysLoading(false);
    }
  }, []);

  // Initialize authentication and data loading
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        let authToken: string;

        // If we have a token in the URL, use it for authentication
        if (token) {
          authToken = await authenticateWithToken(token);

          // Check if there's a tab parameter in the URL
          const urlParams = new URLSearchParams(window.location.search);
          const tabParam = urlParams.get('tab');

          // Clean up URL
          navigate('/dashboard', { replace: true });

          // Set the active tab if specified in URL
          if (tabParam === 'reviews') {
            setSection('reviews');
          }
        } else {
          // Try to use stored token
          authToken = await verifyStoredToken();
        }

        // Load videos, training days, check training plan and check status with the authenticated token
        await Promise.all([
          loadVideos(authToken),
          loadTrainingDays(authToken),
          checkTrainingPlan(authToken),
          checkWeightsPending(authToken),
          checkIfCheckInRequired(authToken),
          checkTrainerSeenNotifications(authToken)
        ]);
      } catch (error) {
        console.error('Dashboard initialization failed:', error);
        setAuthState(prev => ({
          ...prev,
          loading: false,
          // Expired plan: show the server's explanation instead of the generic message
          error: error instanceof Error && /scadut/i.test(error.message)
            ? error.message
            : 'Access denied. Please check your link or contact support.'
        }));
      }
    };

    initializeDashboard();
  }, [token, navigate, authenticateWithToken, verifyStoredToken, loadVideos, loadTrainingDays, checkTrainingPlan, checkWeightsPending, checkIfCheckInRequired, checkTrainerSeenNotifications]);

  // Filtered videos based on selected category and search query
  const filteredVideos = useMemo(() => {
    let videos = videoState.videos;

    // Filter by category (skip if 'all' or null)
    if (videoState.selectedCategory && videoState.selectedCategory !== 'all') {
      videos = videos.filter(video => video.category === videoState.selectedCategory);
    }

    // Filter by search query
    if (videoState.searchQuery.trim()) {
      const searchTerm = videoState.searchQuery.toLowerCase().trim();
      videos = videos.filter(video =>
        video.title.toLowerCase().includes(searchTerm) ||
        video.description.toLowerCase().includes(searchTerm)
      );

      // Searching a bare number ("5") should surface titles in numeric
      // order (5, 15, 25…) instead of whatever order the API returned.
      if (/^\d+$/.test(searchTerm)) {
        // Titles often list several numbers ("(1°) - 30/34 ; (2°) - 38/41").
        // Rank by the smallest number that actually contains the searched
        // digits, so searching "5" orders 5, 15, 25… ahead of unrelated numbers.
        // Numbers followed by "°" (angles like 45°, set markers like (2°)) are ignored.
        const matchScore = (title: string) => {
          const numbers = title.match(/\d+(?![\d°])/g) || [];
          const matching = numbers.filter((n) => n.includes(searchTerm)).map(Number);
          return matching.length ? Math.min(...matching) : Infinity;
        };
        videos = [...videos].sort((a, b) => matchScore(a.title) - matchScore(b.title));
      }
    }

    return videos;
  }, [videoState.videos, videoState.selectedCategory, videoState.searchQuery]);

  // Event handlers
  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    navigate('/');
  }, [navigate]);

  const handleSearch = useCallback((query: string) => {
    setVideoState(prev => ({
      ...prev,
      searchQuery: query
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setVideoState(prev => ({
      ...prev,
      searchQuery: ''
    }));
  }, []);

  const handleVideoPlay = useCallback((video: Video) => {
    setSelectedVideo(video);
  }, []);

  const handleVideoClose = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  // While a check-in is pending, every section except Check is locked.
  // Reminder dots: expired plan = alert, expiring within a week = warn.
  const planDaysLeft = planExpirationDate
    ? Math.ceil((new Date(planExpirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const planBadge: Badge = planDaysLeft === null ? null : planDaysLeft < 0 ? 'alert' : planDaysLeft < 7 ? 'warn' : null;
  const weightsBadge: Badge = weightsPending ? 'warn' : null;
  // The bottom-bar "Allenamento" item shows the most urgent of its sub-badges
  const trainingBadge: Badge = planBadge === 'alert' ? 'alert' : planBadge || weightsBadge;
  const navBadge = (id: Section): Badge =>
    id === 'check' && checkInRequired ? 'alert' : id === 'allenamento' && !checkInRequired ? trainingBadge : null;

  const goToSection = useCallback((id: Section) => {
    if (checkInRequired && id !== 'check') return;
    setSection(id);
    window.scrollTo({ top: 0 });
  }, [checkInRequired]);

  useEffect(() => console.log(trainingDays), [trainingDays]);

  // Component styles
  const pageClassName = 'min-h-screen bg-gray-50';
  // Extra bottom padding on mobile so content clears the fixed bottom nav
  const mainClassName = 'pt-28 sm:pt-40 px-4 sm:px-6 lg:px-16 pb-28 sm:pb-16 lg:pb-20';
  const containerClassName = 'max-w-7xl mx-auto';

  // Loading state
  if (authState.loading) {
    return (
      <div className={pageClassName}>
        <Header />
        <main className={mainClassName}>
          <div className={containerClassName}>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('dashboard.loading')}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (authState.error) {
    return (
      <div className={pageClassName}>
        <Header />
        <main className={mainClassName}>
          <div className={containerClassName}>
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Accesso Negato</h1>
              <p className="text-gray-600 mb-8">{authState.error}</p>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Torna alla Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main dashboard content
  return (
    <div className={pageClassName}>
      <Helmet>
        <title>{t('pages.dashboard.title')}</title>
      </Helmet>
      <Header />

      <main className={mainClassName}>
        <div className={containerClassName}>
          {/* User Welcome Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
                {t('dashboard.welcome')}{authState.user?.firstName ? `, ${authState.user.firstName}` : ''}!
              </h1>
              <p className="text-gray-600">
                Ecco i tuoi video di allenamento personalizzati
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors"
              aria-label="Logout"
            >
              {React.createElement(FiLogOut as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span className="hidden sm:inline">{t('dashboard.logout')}</span>
            </button>
          </div>

          {/* Trainer Seen Notification Banner */}
          {trainerSeenNotifications.length > 0 && (
            <div className="mb-6 bg-green-50 border-2 border-green-400 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {React.createElement(FiCheckCircle as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 text-green-500" })}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-800">Il tuo PT ha visto il tuo check!</h3>
                  <p className="text-green-700 text-sm">
                    {trainerSeenNotifications.length === 1
                      ? `Check del ${formatDate(trainerSeenNotifications[0].feedback_date)} letto dal tuo PT.`
                      : `${trainerSeenNotifications.length} tuoi check letti dal tuo PT.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check Required Banner */}
          {checkInRequired && (
            <div className="mb-6 bg-orange-50 border-2 border-orange-400 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 text-orange-500" })}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-orange-800">Check settimanale richiesto</h3>
                  <p className="text-orange-700 text-sm">Compila il check per continuare ad accedere alla tua dashboard.</p>
                </div>
              </div>
            </div>
          )}

          {/* Section Nav — desktop (mobile uses the bottom bar below) */}
          <div className="hidden sm:flex space-x-1 bg-gray-200 p-1 rounded-xl mb-6">
            {NAV_ITEMS.map((item) => {
              const disabled = checkInRequired && item.id !== 'check';
              return (
                <button
                  key={item.id}
                  onClick={() => goToSection(item.id)}
                  disabled={disabled}
                  className={`relative flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    section === item.id
                      ? 'bg-white text-gray-900 shadow'
                      : disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900'
                  } ${item.id === 'check' && checkInRequired ? 'ring-2 ring-orange-400' : ''}`}
                >
                  {React.createElement(item.icon, { className: 'w-5 h-5' })}
                  <span>{item.label}</span>
                  <BadgeDot badge={navBadge(item.id)} className="top-1 right-1" />
                </button>
              );
            })}
          </div>

          {/* Sub-sections */}
          {section === 'allenamento' && (
            <SubTabs
              items={[
                { id: 'giorni', label: 'Giorni', badge: weightsBadge },
                { id: 'video', label: 'Video' },
                { id: 'scheda', label: 'Scheda', badge: planBadge },
              ]}
              active={trainingView}
              onChange={setTrainingView}
            />
          )}
          {section === 'progressi' && (
            <SubTabs
              items={[
                { id: 'pesi', label: 'Storico pesi' },
                { id: 'analisi', label: 'Analisi corporea' },
              ]}
              active={progressView}
              onChange={setProgressView}
            />
          )}

          {/* Section Content */}
          {section === 'reviews' ? (
            <ReviewTab />
          ) : section === 'check' ? (
            <FeedbackTab
              user={authState.user}
              onCheckInCompleted={() => {
                setCheckInRequired(false);
                setSection('allenamento');
              }}
            />
          ) : section === 'altro' ? (
            <div className="space-y-10">
              <div>
          {/* Referral Banner - Only shown when user has an active training plan */}
          {hasTrainingPlan && (
            <div className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {React.createElement(FiGift as React.ComponentType<{ className?: string }>, { className: "w-12 h-12 text-white" })}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {t('dashboard.referral.title')}
                  </h3>
                  <p className="text-blue-50 text-base">
                    {t('dashboard.referral.message')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Banner */}
          {authState.user?.trainerId === 2 ? (
            <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-5 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {React.createElement(SiInstagram as React.ComponentType<{ className?: string }>, { className: "w-10 h-10 text-white" })}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-lg">Seguimi su Instagram!</p>
                  <p className="text-purple-100 text-sm">Contenuti esclusivi, consigli e aggiornamenti sul tuo percorso.</p>
                </div>
                <a
                  href="https://www.instagram.com/lamendye?igsh=bzN6NDhscnVhMHVw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 bg-white text-purple-600 font-semibold px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                >
                  @lamendye
                </a>
              </div>
            </div>
          ) : (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <a
                href="https://www.instagram.com/mauriziojoshuapt?stkn=MWt2N2sxaG1uZTBqZg%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center sm:justify-start gap-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 shadow-lg hover:opacity-90 transition-opacity"
              >
                {React.createElement(SiInstagram as React.ComponentType<{ className?: string }>, { className: "w-7 h-7 sm:w-8 sm:h-8 text-white flex-shrink-0" })}
                <div className="hidden sm:block min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">Instagram</p>
                  <p className="text-purple-100 text-xs truncate">@mauriziojoshuapt</p>
                </div>
              </a>
              <a
                href="https://www.tiktok.com/@jd.push.pull?_r=1&_t=ZN-945Y5lf6Dbi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center sm:justify-start gap-3 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-4 shadow-lg hover:opacity-90 transition-opacity"
              >
                {React.createElement(SiTiktok as React.ComponentType<{ className?: string }>, { className: "w-7 h-7 sm:w-8 sm:h-8 text-white flex-shrink-0" })}
                <div className="hidden sm:block min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">TikTok</p>
                  <p className="text-gray-300 text-xs truncate">@jd.push.pull</p>
                </div>
              </a>
            </div>
          )}
              </div>
              <IntegrazioneTab />
            </div>
          ) : section === 'progressi' ? (
            progressView === 'pesi' ? <WorkoutTab mode="history" /> : <BodyCompositionTab />
          ) : trainingView === 'scheda' ? (
            <TrainingPlan />
          ) : trainingView === 'giorni' && (hasExercises === null || trainingDaysLoading) ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
            </div>
          ) : trainingView === 'giorni' && hasExercises ? (
            // Each exercise with its videos and weight inputs, plus the day's other videos
            <WorkoutTab
              mode="merged"
              trainingDays={trainingDays}
              onPlayVideo={handleVideoPlay}
              onSaved={() => setWeightsPending(false)}
            />
          ) : (
            <>
              {/* Video Categories Filter - Hidden when viewing training days */}
              {videoState.categories.length > 0 && (trainingView === 'video' || trainingDays.length === 0 || videoState.searchQuery.trim() || videoState.selectedCategory) && (
                <CategoryFilter
                  categories={videoState.categories}
                  selectedCategory={videoState.selectedCategory}
                  onSelectCategory={(category) =>
                    setVideoState(prev => ({ ...prev, selectedCategory: category }))
                  }
                />
              )}

              {/* Search Bar - Hidden when viewing training days */}
              {(trainingView === 'video' || trainingDays.length === 0 || videoState.searchQuery.trim() || videoState.selectedCategory) && (
                <SearchBar
                  searchQuery={videoState.searchQuery}
                  onSearch={handleSearch}
                  onClear={clearSearch}
                />
              )}

          {/* Videos Grid */}
          {videoState.loading || trainingDaysLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="h-16 bg-gray-200" />
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="h-48 bg-gray-100 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : videoState.error ? (
            <div className="text-center py-16">
              <p className="text-red-600 mb-4">{videoState.error}</p>
              <button
                onClick={() => loadVideos(localStorage.getItem(STORAGE_KEY) || '')}
                className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                {t('dashboard.retry')}
              </button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-16">
              {React.createElement(FiGrid as React.ComponentType<{ className?: string }>, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" })}
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {videoState.searchQuery.trim()
                  ? t('dashboard.noVideosFound')
                  : videoState.selectedCategory
                    ? `${t('dashboard.noVideosInCategory')} "${videoState.selectedCategory}"`
                    : t('dashboard.noVideosAvailable')
                }
              </h3>
              <p className="text-gray-500">
                {videoState.searchQuery.trim()
                  ? `Non ci sono video che corrispondono a "${videoState.searchQuery}"`
                  : videoState.selectedCategory
                    ? 'Prova a selezionare una categoria diversa'
                    : 'I tuoi video di allenamento appariranno qui quando saranno assegnati.'
                }
              </p>
              {videoState.searchQuery.trim() && (
                <button
                  onClick={clearSearch}
                  className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancella ricerca
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Show training days if available and no search/filter is active */}
              {trainingView === 'giorni' && trainingDays.length > 0 && !videoState.searchQuery.trim() && !videoState.selectedCategory ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{t('dashboard.trainingDays.title')}</h3>
                    {videoState.videos.length > 0 && (
                      <button
                        onClick={() => setTrainingView('video')}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        {t('dashboard.trainingDays.viewAllVideos')}
                      </button>
                    )}
                  </div>

                  {trainingDays.map((day) => (
                    <div key={day.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
                        <h4 className="text-xl font-bold text-white">
                          {day.dayName || t('dashboard.trainingDays.dayTitle', { number: day.dayNumber })}
                        </h4>
                        <p className="text-sm text-gray-300 mt-1">
                          {t('dashboard.trainingDays.videoCount', { count: day.videos.length })}
                        </p>
                      </div>

                      {day.videos.length > 0 ? (
                        <div className="p-4 sm:p-6 space-y-4">
                          {(() => {
                            type DayRenderItem =
                              | { type: 'single'; video: typeof day.videos[0] }
                              | { type: 'group'; groupId: number; groupLabel: string; videos: typeof day.videos };

                            const items: DayRenderItem[] = [];
                            for (const video of day.videos) {
                              if (video.groupId != null) {
                                const existing = items.find(
                                  (i): i is Extract<DayRenderItem, { type: 'group' }> =>
                                    i.type === 'group' && i.groupId === video.groupId
                                );
                                if (existing) {
                                  existing.videos.push(video);
                                } else {
                                  items.push({ type: 'group', groupId: video.groupId, groupLabel: video.groupLabel || 'Superset', videos: [video] });
                                }
                              } else {
                                items.push({ type: 'single', video });
                              }
                            }

                            // Render items in original order; batch consecutive singles into grids
                            type SingleItem = Extract<DayRenderItem, { type: 'single' }>;
                            const rendered: React.ReactNode[] = [];
                            let pendingSingles: SingleItem[] = [];

                            const flushSingles = () => {
                              if (pendingSingles.length === 0) return;
                              rendered.push(
                                <div key={`singles-${pendingSingles[0].video.id}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {pendingSingles.map(s => (
                                    <VideoCard key={s.video.id} video={s.video} onPlay={handleVideoPlay} />
                                  ))}
                                </div>
                              );
                              pendingSingles = [];
                            };

                            for (const item of items) {
                              if (item.type === 'single') {
                                pendingSingles.push(item);
                              } else {
                                flushSingles();
                                rendered.push(
                                  <div key={`group-${item.groupId}`} className="border-2 border-indigo-200 rounded-xl overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 flex items-center gap-2">
                                      <span className="text-xs font-bold text-white uppercase tracking-widest">{item.groupLabel}</span>
                                      <span className="text-xs text-indigo-100">— {item.videos.length} esercizi</span>
                                    </div>
                                    <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-indigo-50/40">
                                      {item.videos.map((video) => (
                                        <VideoCard key={video.id} video={video} onPlay={handleVideoPlay} />
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            }
                            flushSingles();

                            return <>{rendered}</>;
                          })()}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          {t('dashboard.trainingDays.noVideos')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Results count and back to training days button */}
                  {(videoState.searchQuery.trim() || videoState.selectedCategory) && (
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {filteredVideos.length} video
                        {videoState.searchQuery.trim() && ` trovati per "${videoState.searchQuery}"`}
                        {videoState.selectedCategory && videoState.selectedCategory !== 'all' && ` nella categoria "${videoState.selectedCategory}"`}
                      </div>
                      {trainingView === 'giorni' && trainingDays.length > 0 && (
                        <button
                          onClick={() => setVideoState(prev => ({ ...prev, searchQuery: '', selectedCategory: null }))}
                          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                          ← Torna alla vista per giorni
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        onPlay={handleVideoPlay}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Video Stats */}
          {trainingView === 'video' && videoState.videos.length > 0 && (
            <div className="mt-16 bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Le tue statistiche</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{videoState.videos.length}</div>
                  <div className="text-gray-600">{t('dashboard.totalVideos')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{videoState.categories.length}</div>
                  <div className="text-gray-600">Categorie</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {Math.floor(videoState.videos.reduce((sum, v) => sum + v.duration, 0) / 60)}
                  </div>
                  <div className="text-gray-600">Minuti totali</div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>

      {/* Bottom Nav — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const disabled = checkInRequired && item.id !== 'check';
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goToSection(item.id)}
                disabled={disabled}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-gray-900' : disabled ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                {React.createElement(item.icon, { className: 'w-6 h-6' })}
                <span>{item.label}</span>
                <BadgeDot badge={navBadge(item.id)} className="top-1.5 left-1/2 ml-2" />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={handleVideoClose}
        />
      )}
    </div>
  );
};

export default Dashboard;