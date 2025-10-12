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
import { FiGrid, FiLogOut, FiStar, FiEdit3, FiTrash2, FiVideo, FiFile, FiGift, FiMessageSquare } from 'react-icons/fi';

import { Video, AuthState, VideoState, Review, ReviewFormData } from '../types/dashboard';
import { STORAGE_KEY, formatDate, apiCall } from '../utils/dashboardUtils';

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
  const [review, setReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFormData, setReviewFormData] = useState<ReviewFormData>({
    rating: 5,
    title: '',
    comment: ''
  });
  const [activeTab, setActiveTab] = useState<'videos' | 'training-plan' | 'feedback'>('training-plan');
  const [hasTrainingPlan, setHasTrainingPlan] = useState(false);

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

  // Load user's review
  const loadUserReview = useCallback(async (authToken: string) => {
    try {
      const response = await apiCall('/reviews/my', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setReview(response.data.review);
    } catch (error) {
      console.error('Failed to load review:', error);
    }
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

  // Submit review
  const submitReview = useCallback(async (authToken: string) => {
    try {
      setReviewLoading(true);

      await apiCall('/reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(reviewFormData)
      });

      // Reload user's review
      await loadUserReview(authToken);

      setShowReviewForm(false);
      setReviewFormData({ rating: 5, title: '', comment: '' });
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setReviewLoading(false);
    }
  }, [reviewFormData, loadUserReview]);

  // Delete review
  const deleteReview = useCallback(async (authToken: string) => {
    try {
      setReviewLoading(true);

      await apiCall('/reviews/my', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setReview(null);
    } catch (error) {
      console.error('Failed to delete review:', error);
    } finally {
      setReviewLoading(false);
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

  // Initialize authentication and data loading
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        let authToken: string;

        // If we have a token in the URL, use it for authentication
        if (token) {
          authToken = await authenticateWithToken(token);
          // Clean up URL
          navigate('/dashboard', { replace: true });
        } else {
          // Try to use stored token
          authToken = await verifyStoredToken();
        }

        // Load videos, review, and check training plan with the authenticated token
        await Promise.all([
          loadVideos(authToken),
          loadUserReview(authToken),
          checkTrainingPlan(authToken)
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
  }, [token, navigate, authenticateWithToken, verifyStoredToken, loadVideos, loadUserReview, checkTrainingPlan]);

  // Filtered videos based on selected category and search query
  const filteredVideos = useMemo(() => {
    let videos = videoState.videos;

    // Filter by category
    if (videoState.selectedCategory) {
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

  // Review handlers
  const handleReviewSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken = localStorage.getItem(STORAGE_KEY);
    if (authToken) {
      await submitReview(authToken);
    }
  }, [submitReview]);

  const handleReviewDelete = useCallback(async () => {
    if (window.confirm('Sei sicuro di voler eliminare la tua recensione?')) {
      const authToken = localStorage.getItem(STORAGE_KEY);
      if (authToken) {
        await deleteReview(authToken);
      }
    }
  }, [deleteReview]);

  const handleEditReview = useCallback(() => {
    if (review) {
      setReviewFormData({
        rating: review.rating,
        title: review.title,
        comment: review.comment
      });
      setShowReviewForm(true);
    }
  }, [review]);

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

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8">
            <button
              onClick={() => setActiveTab('training-plan')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'training-plan'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {React.createElement(FiFile as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span>{t('dashboard.tabs.trainingPlan') || 'Scheda'}</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {React.createElement(FiVideo as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span>{t('dashboard.tabs.videos') || 'Video'}</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'feedback'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span>Feedback</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'training-plan' ? (
            <TrainingPlan />
          ) : activeTab === 'feedback' ? (
            <FeedbackTab user={authState.user} />
          ) : (
            <>
              {/* Video Categories Filter */}
              {videoState.categories.length > 0 && (
                <CategoryFilter
                  categories={videoState.categories}
                  selectedCategory={videoState.selectedCategory}
                  onSelectCategory={(category) =>
                    setVideoState(prev => ({ ...prev, selectedCategory: category }))
                  }
                />
              )}

              {/* Search Bar */}
              <SearchBar
                searchQuery={videoState.searchQuery}
                onSearch={handleSearch}
                onClear={clearSearch}
              />

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
              {/* Results count */}
              {(videoState.searchQuery.trim() || videoState.selectedCategory) && (
                <div className="mb-4 text-sm text-gray-600">
                  {filteredVideos.length} video
                  {videoState.searchQuery.trim() && ` trovati per "${videoState.searchQuery}"`}
                  {videoState.selectedCategory && ` nella categoria "${videoState.selectedCategory}"`}
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

          {/* Review Section */}
          <div className="mt-16 bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">La tua recensione</h3>
              {!review && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  {React.createElement(FiStar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                  <span>Lascia una recensione</span>
                </button>
              )}
            </div>

            {review && !showReviewForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        React.createElement(FiStar as React.ComponentType<{ className?: string }>, {
                          key: i.toString(),
                          className: `w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`
                        })
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">({review.rating}/5)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleEditReview}
                      className="text-gray-600 hover:text-gray-800 transition-colors"
                      disabled={reviewLoading}
                    >
                      {React.createElement(FiEdit3 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                    </button>
                    <button
                      onClick={handleReviewDelete}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      disabled={reviewLoading}
                    >
                      {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                    </button>
                  </div>
                </div>
                {review.title && (
                  <h4 className="font-semibold text-gray-900">{review.title}</h4>
                )}
                <p className="text-gray-700">{review.comment}</p>
                <div className="text-sm text-gray-500">
                  {review.isApproved ? (
                    <span className="text-green-600">✓ Recensione approvata e visibile pubblicamente</span>
                  ) : (
                    <span className="text-yellow-600">⏳ In attesa di approvazione</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  Pubblicata il {formatDate(review.createdAt)}
                  {review.updatedAt !== review.createdAt && (
                    <span> • {t('dashboard.modifiedOn')} {formatDate(review.updatedAt)}</span>
                  )}
                </div>
              </div>
            ) : showReviewForm ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valutazione
                  </label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewFormData(prev => ({ ...prev, rating }))}
                        className={`w-8 h-8 ${rating <= reviewFormData.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                      >
                        {React.createElement(FiStar as React.ComponentType<{ className?: string }>, {
                          className: `w-6 h-6 ${rating <= reviewFormData.rating ? 'fill-current' : ''}`
                        })}
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">({reviewFormData.rating}/5)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titolo (opzionale)
                  </label>
                  <input
                    type="text"
                    value={reviewFormData.title}
                    onChange={(e) => setReviewFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                    placeholder="Titolo della recensione..."
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commento *
                  </label>
                  <textarea
                    value={reviewFormData.comment}
                    onChange={(e) => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                    rows={4}
                    placeholder="Condividi la tua esperienza con gli allenamenti di Joshua..."
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {reviewFormData.comment.length}/1000 caratteri (minimo 10)
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewFormData({ rating: 5, title: '', comment: '' });
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={reviewLoading}
                  >
                    {t('dashboard.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={reviewLoading || reviewFormData.comment.length < 10}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {reviewLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{review ? 'Aggiorna recensione' : 'Pubblica recensione'}</span>
                  </button>
                </div>

                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  ℹ️ La tua recensione sarà visibile pubblicamente solo dopo l'approvazione dell'amministratore.
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Non hai ancora lasciato una recensione.</p>
                <p className="text-sm">Condividi la tua esperienza con gli allenamenti di Joshua!</p>
              </div>
            )}
          </div>
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