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
import { FiGrid, FiLogOut, FiStar, FiVideo, FiFile, FiGift, FiMessageSquare } from 'react-icons/fi';

import { Video, AuthState, VideoState } from '../types/dashboard';
import { STORAGE_KEY, apiCall } from '../utils/dashboardUtils';

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
  const [activeTab, setActiveTab] = useState<'videos' | 'training-plan' | 'reviews' | 'feedback'>('training-plan');
  const [hasTrainingPlan, setHasTrainingPlan] = useState(false);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [checkInRequired, setCheckInRequired] = useState(false);

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
    } catch (error) {
      console.error('Failed to check training plan:', error);
      setHasTrainingPlan(false);
    }
  }, []);

  // Check if check-in is required
  const checkIfCheckInRequired = useCallback(async (authToken: string) => {
    try {
      const response = await apiCall('/feedback/should-show', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const shouldShow = response.data?.shouldShow || false;
      setCheckInRequired(shouldShow);
      if (shouldShow) {
        setActiveTab('feedback');
      }
    } catch (error) {
      console.error('Failed to check check-in status:', error);
      setCheckInRequired(false);
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
    try {
      const response = await apiCall('/videos/training-days', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setTrainingDays(response.data.trainingDays);
    } catch (error) {
      console.error('Failed to load training days:', error);
      // Don't show error, just fallback to regular videos
      setTrainingDays([]);
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
            setActiveTab('reviews');
          }
        } else {
          // Try to use stored token
          authToken = await verifyStoredToken();
        }

        // Load videos, training days, check training plan and check-in status with the authenticated token
        await Promise.all([
          loadVideos(authToken),
          loadTrainingDays(authToken),
          checkTrainingPlan(authToken),
          checkIfCheckInRequired(authToken)
        ]);
      } catch (error) {
        console.error('Dashboard initialization failed:', error);
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Access denied. Please check your link or contact support.'
        }));
      }
    };

    initializeDashboard();
  }, [token, navigate, authenticateWithToken, verifyStoredToken, loadVideos, loadTrainingDays, checkTrainingPlan, checkIfCheckInRequired]);

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

  useEffect(() => console.log(trainingDays), [trainingDays]);

  // Component styles
  const pageClassName = 'min-h-screen bg-gray-50';
  const mainClassName = 'pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20';
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
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

          {/* Check-in Required Banner */}
          {checkInRequired && (
            <div className="mb-6 bg-orange-50 border-2 border-orange-400 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 text-orange-500" })}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-orange-800">Check-in settimanale richiesto</h3>
                  <p className="text-orange-700 text-sm">Compila il check-in per continuare ad accedere alla tua dashboard.</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8">
            <button
              onClick={() => !checkInRequired && setActiveTab('training-plan')}
              disabled={checkInRequired}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'training-plan'
                  ? 'bg-white text-gray-900 shadow'
                  : checkInRequired
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
              title={t('dashboard.tabs.trainingPlan') || 'Scheda'}
            >
              {React.createElement(FiFile as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span className="max-[399px]:hidden text-xs sm:text-base">{t('dashboard.tabs.trainingPlan') || 'Scheda'}</span>
            </button>
            <button
              onClick={() => !checkInRequired && setActiveTab('videos')}
              disabled={checkInRequired}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-white text-gray-900 shadow'
                  : checkInRequired
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
              title={t('dashboard.tabs.videos') || 'Video'}
            >
              {React.createElement(FiVideo as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span className="max-[399px]:hidden text-xs sm:text-base">{t('dashboard.tabs.videos') || 'Video'}</span>
            </button>
            <button
              onClick={() => !checkInRequired && setActiveTab('reviews')}
              disabled={checkInRequired}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'reviews'
                  ? 'bg-white text-gray-900 shadow'
                  : checkInRequired
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Recensioni"
            >
              {React.createElement(FiStar as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span className="max-[399px]:hidden text-xs sm:text-base">Recensioni</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'feedback'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              } ${checkInRequired ? 'ring-2 ring-orange-400' : ''}`}
              title="Check-in"
            >
              {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span className="max-[399px]:hidden text-xs sm:text-base">{t('dashboard.tabs.feedback')}</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'training-plan' ? (
            <TrainingPlan />
          ) : activeTab === 'reviews' ? (
            <ReviewTab />
          ) : activeTab === 'feedback' ? (
            <FeedbackTab
              user={authState.user}
              onCheckInCompleted={() => {
                setCheckInRequired(false);
                setActiveTab('training-plan');
              }}
            />
          ) : (
            <>
              {/* Video Categories Filter - Hidden when viewing training days */}
              {videoState.categories.length > 0 && (trainingDays.length === 0 || videoState.searchQuery.trim() || videoState.selectedCategory) && (
                <CategoryFilter
                  categories={videoState.categories}
                  selectedCategory={videoState.selectedCategory}
                  onSelectCategory={(category) =>
                    setVideoState(prev => ({ ...prev, selectedCategory: category }))
                  }
                />
              )}

              {/* Search Bar - Hidden when viewing training days */}
              {(trainingDays.length === 0 || videoState.searchQuery.trim() || videoState.selectedCategory) && (
                <SearchBar
                  searchQuery={videoState.searchQuery}
                  onSearch={handleSearch}
                  onClear={clearSearch}
                />
              )}

          {/* Videos Grid */}
          {videoState.loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('dashboard.loadingVideos')}</p>
              </div>
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
              {trainingDays.length > 0 && !videoState.searchQuery.trim() && !videoState.selectedCategory ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{t('dashboard.trainingDays.title')}</h3>
                    {videoState.videos.length > 0 && (
                      <button
                        onClick={() => setVideoState(prev => ({ ...prev, selectedCategory: 'all' }))}
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
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {day.videos.map((video) => (
                              <VideoCard
                                key={video.id}
                                video={video}
                                onPlay={handleVideoPlay}
                              />
                            ))}
                          </div>
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
                      {trainingDays.length > 0 && (
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
          {videoState.videos.length > 0 && (
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