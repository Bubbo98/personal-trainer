import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { FiPlay, FiClock, FiGrid, FiLogOut, FiSearch, FiX } from 'react-icons/fi';

// Constants
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const STORAGE_KEY = 'dashboard_auth_token';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
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
  grantedAt: string;
  expiresAt?: string;
}

interface Category {
  name: string;
  videoCount: number;
}

interface DashboardProps {}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface VideoState {
  videos: Video[];
  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
}

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

interface SearchBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onClear: () => void;
}

// Utility functions
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// API functions
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
};

// Components
const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const videoSrc = `${window.location.origin}/videos/${video.filePath}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full max-w-4xl mx-4">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white text-xl hover:text-gray-300 z-10"
          aria-label="Chiudi video"
        >
          ✕
        </button>

        <div className="bg-white rounded-lg overflow-hidden">
          <video
            controls
            autoPlay
            className="w-full h-auto max-h-[70vh]"
            src={videoSrc}
            onError={() => console.error('Video loading failed:', videoSrc)}
          >
            <source src={videoSrc} type="video/mp4" />
            Il tuo browser non supporta la riproduzione video.
          </video>

          <div className="p-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{video.title}</h3>
            {video.description && (
              <p className="text-gray-700 mb-2">{video.description}</p>
            )}
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span className="flex items-center space-x-1">
                {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                <span>{formatDuration(video.duration)}</span>
              </span>
              <span className="capitalize">{video.category}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative aspect-video bg-gray-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => onPlay(video)}
            className="bg-gray-900 text-white p-4 rounded-full hover:bg-gray-800 transition-colors shadow-lg"
            aria-label={`Riproduci ${video.title}`}
          >
            {React.createElement(FiPlay as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 ml-1" })}
          </button>
        </div>

        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
          {formatDuration(video.duration)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
            {video.description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="capitalize font-medium">{video.category}</span>
          <span>Aggiunto il {formatDate(video.grantedAt)}</span>
        </div>
      </div>
    </div>
  );
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-4 py-2 rounded-full font-medium transition-colors ${
          selectedCategory === null
            ? 'bg-gray-900 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Tutti ({categories.reduce((sum, cat) => sum + cat.videoCount, 0)})
      </button>

      {categories.map((category) => (
        <button
          key={category.name}
          onClick={() => onSelectCategory(category.name)}
          className={`px-4 py-2 rounded-full font-medium transition-colors capitalize ${
            selectedCategory === category.name
              ? 'bg-gray-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {category.name} ({category.videoCount})
        </button>
      ))}
    </div>
  );
};

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearch,
  onClear
}) => {
  return (
    <div className="relative mb-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400" })}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Cerca video per titolo o descrizione..."
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent text-gray-900 placeholder-gray-500"
        />
        {searchQuery && (
          <button
            onClick={onClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
          >
            {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400" })}
          </button>
        )}
      </div>
      {searchQuery && (
        <div className="mt-2 text-sm text-gray-600">
          Ricerca: "{searchQuery}"
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

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

        // Load videos with the authenticated token
        await loadVideos(authToken);
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
  }, [token, navigate, authenticateWithToken, verifyStoredToken, loadVideos]);

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
                <p className="text-gray-600">Caricamento dashboard...</p>
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
      <Header />

      <main className={mainClassName}>
        <div className={containerClassName}>
          {/* User Welcome Section */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Benvenuto{authState.user?.firstName ? `, ${authState.user.firstName}` : ''}!
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
              <span className="hidden sm:inline">Esci</span>
            </button>
          </div>

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
                <p className="text-gray-600">Caricamento video...</p>
              </div>
            </div>
          ) : videoState.error ? (
            <div className="text-center py-16">
              <p className="text-red-600 mb-4">{videoState.error}</p>
              <button
                onClick={() => loadVideos(localStorage.getItem(STORAGE_KEY) || '')}
                className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Riprova
              </button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-16">
              {React.createElement(FiGrid as React.ComponentType<{ className?: string }>, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" })}
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {videoState.searchQuery.trim()
                  ? 'Nessun video trovato'
                  : videoState.selectedCategory
                    ? `Nessun video nella categoria "${videoState.selectedCategory}"`
                    : 'Nessun video disponibile'
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
                  <div className="text-gray-600">Video totali</div>
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