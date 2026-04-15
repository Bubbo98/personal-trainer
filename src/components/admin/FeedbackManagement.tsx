import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiTrash2, FiSearch, FiFilter, FiX, FiCalendar, FiUsers, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { apiCall, formatDate } from '../../utils/adminUtils';

interface Feedback {
  id: number;
  user_id: number;
  username: string;
  user_first_name: string;
  user_last_name: string;
  first_name: string;
  last_name: string;
  email: string;
  feedback_date: string;
  energy_level: string;
  workouts_completed: string;
  meal_plan_followed: string;
  sleep_quality: string;
  physical_discomfort: string;
  discomfort_details: string | null;
  muscular_zones: string | null;
  muscular_notes: string | null;
  articular_zones: string | null;
  articular_notes: string | null;
  motivation_level: string;
  weekly_highlights: string | null;
  current_weight: number | null;
  created_at: string;
  pdf_change_date: string | null;
  trainer_seen_at: string | null;
}

interface UserSummary {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  total_feedbacks: number;
  last_feedback_date: string;
  last_energy_level: string;
  last_motivation_level: string;
  last_physical_discomfort: string;
  last_current_weight: number | null;
}

interface ServerStats {
  total: number;
  withDiscomfort: number;
  lowMotivation: number;
  missedWorkouts: number;
}

type ViewMode = 'timeline' | 'user';

interface FeedbackManagementProps {
  trainerId?: number;
  onFeedbacksSeen?: () => void;
}

const ITEMS_PER_PAGE = 20;
const USERS_PER_PAGE = 15;

const FeedbackManagement: React.FC<FeedbackManagementProps> = ({ trainerId, onFeedbacksSeen }) => {
  const { t } = useTranslation();

  // Timeline state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [serverStats, setServerStats] = useState<ServerStats>({ total: 0, withDiscomfort: 0, lowMotivation: 0, missedWorkouts: 0 });

  // User view state
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userLoading, setUserLoading] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>({});
  const [expandedUserFeedbacks, setExpandedUserFeedbacks] = useState<Record<number, Feedback[]>>({});
  const [loadingUserFeedbacks, setLoadingUserFeedbacks] = useState<Record<number, boolean>>({});

  // Shared state
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [filterDiscomfort, setFilterDiscomfort] = useState<'all' | 'none' | 'has_issues'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Timeline loader ───────────────────────────────────────────────────────
  const loadFeedbacks = useCallback(async (page: number, search: string, discomfort: string) => {
    try {
      setLoading(true);
      const params: string[] = [`page=${page}`, `limit=${ITEMS_PER_PAGE}`];
      if (trainerId) params.push(`trainerId=${trainerId}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (discomfort !== 'all') params.push(`discomfort=${discomfort}`);

      const response = await apiCall(`/feedback/admin/all?${params.join('&')}`);
      setFeedbacks(response.data.feedbacks || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
      setCurrentPage(page);
      if (response.data.stats) setServerStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  // ─── User view loader ──────────────────────────────────────────────────────
  const loadUserSummaries = useCallback(async (page: number, search: string, discomfort: string) => {
    try {
      setUserLoading(true);
      const params: string[] = [`page=${page}`, `limit=${USERS_PER_PAGE}`];
      if (trainerId) params.push(`trainerId=${trainerId}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (discomfort !== 'all') params.push(`discomfort=${discomfort}`);

      const response = await apiCall(`/feedback/admin/users-summary?${params.join('&')}`);
      setUserSummaries(response.data.users || []);
      setUserTotal(response.data.total || 0);
      setUserTotalPages(response.data.totalPages || 1);
      setUserCurrentPage(page);
      // Clear expanded state on reload
      setExpandedUsers({});
      setExpandedUserFeedbacks({});
    } catch (error) {
      console.error('Failed to load user summaries:', error);
    } finally {
      setUserLoading(false);
    }
  }, [trainerId]);

  // Initial load
  useEffect(() => {
    loadFeedbacks(1, '', 'all');
  }, [loadFeedbacks]);

  // ─── Expand/collapse user with lazy feedback loading ───────────────────────
  const toggleUserExpand = async (userId: number) => {
    if (expandedUsers[userId]) {
      setExpandedUsers(prev => { const n = { ...prev }; delete n[userId]; return n; });
      return;
    }
    setExpandedUsers(prev => ({ ...prev, [userId]: true }));

    // Lazy-load feedbacks for this user if not already cached
    if (!expandedUserFeedbacks[userId]) {
      setLoadingUserFeedbacks(prev => ({ ...prev, [userId]: true }));
      try {
        const response = await apiCall(`/feedback/admin/user/${userId}`);
        setExpandedUserFeedbacks(prev => ({ ...prev, [userId]: response.data.feedbacks || [] }));
      } catch (error) {
        console.error('Failed to load user feedbacks:', error);
      } finally {
        setLoadingUserFeedbacks(prev => { const n = { ...prev }; delete n[userId]; return n; });
      }
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (viewMode === 'timeline') loadFeedbacks(1, value, filterDiscomfort);
      else loadUserSummaries(1, value, filterDiscomfort);
    }, 400);
  };

  const handleDiscomfortChange = (value: 'all' | 'none' | 'has_issues') => {
    setFilterDiscomfort(value);
    if (viewMode === 'timeline') loadFeedbacks(1, searchTerm, value);
    else loadUserSummaries(1, searchTerm, value);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'timeline') loadFeedbacks(1, searchTerm, filterDiscomfort);
    else loadUserSummaries(1, searchTerm, filterDiscomfort);
  };

  const handlePageChange = (page: number) => {
    loadFeedbacks(page, searchTerm, filterDiscomfort);
  };

  const handleUserPageChange = (page: number) => {
    loadUserSummaries(page, searchTerm, filterDiscomfort);
  };

  const handleDeleteFeedback = async (feedbackId: number, userId?: number) => {
    if (!window.confirm(t('admin.feedback.confirmDelete'))) return;
    try {
      await apiCall(`/feedback/${feedbackId}`, { method: 'DELETE' });
      setSelectedFeedback(null);
      alert(t('admin.feedback.deleteSuccess'));
      if (viewMode === 'timeline') {
        loadFeedbacks(currentPage, searchTerm, filterDiscomfort);
      } else {
        // Invalidate this user's cached feedbacks and reload summaries
        if (userId) setExpandedUserFeedbacks(prev => { const n = { ...prev }; delete n[userId]; return n; });
        loadUserSummaries(userCurrentPage, searchTerm, filterDiscomfort);
      }
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.feedback.deleteFailed')}`);
    }
  };

  // ─── Label helpers ─────────────────────────────────────────────────────────
  const getEnergyLabel = (level: string) => ({ high: 'Alta', medium: 'Media', low: 'Bassa' }[level] || level);
  const getWorkoutsLabel = (s: string) => ({ all: 'Tutti', almost_all: 'Quasi tutti', few_or_none: 'Pochi/nessuno' }[s] || s);
  const getMealPlanLabel = (s: string) => ({ completely: 'Completamente', mostly: 'In gran parte', sometimes: 'A volte', no: 'No' }[s] || s);
  const getSleepLabel = (q: string) => ({ excellent: 'Ottima', good: 'Buona', fair: 'Così così', poor: 'Scarsa' }[q] || q);
  const getDiscomfortLabel = (s: string) => ({ none: 'Nessuno', minor: 'Lieve', significant: 'Rilevante' }[s] || s);
  const getMotivationLabel = (l: string) => ({ very_high: 'Molto alta', good: 'Buona', medium: 'Media', low: 'Bassa' }[l] || l);

  const getStatusColor = (value: string, type: 'energy' | 'workouts' | 'meal' | 'sleep' | 'discomfort' | 'motivation'): string => {
    const colorMap: Record<string, Record<string, string>> = {
      energy: { high: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-red-100 text-red-800' },
      workouts: { all: 'bg-green-100 text-green-800', almost_all: 'bg-yellow-100 text-yellow-800', few_or_none: 'bg-red-100 text-red-800' },
      meal: { completely: 'bg-green-100 text-green-800', mostly: 'bg-blue-100 text-blue-800', sometimes: 'bg-yellow-100 text-yellow-800', no: 'bg-red-100 text-red-800' },
      sleep: { excellent: 'bg-green-100 text-green-800', good: 'bg-blue-100 text-blue-800', fair: 'bg-yellow-100 text-yellow-800', poor: 'bg-red-100 text-red-800' },
      discomfort: { none: 'bg-green-100 text-green-800', minor: 'bg-yellow-100 text-yellow-800', significant: 'bg-red-100 text-red-800' },
      motivation: { very_high: 'bg-green-100 text-green-800', good: 'bg-blue-100 text-blue-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-red-100 text-red-800' }
    };
    return colorMap[type]?.[value] || 'bg-gray-100 text-gray-800';
  };

  // ─── Pagination UI (shared) ────────────────────────────────────────────────
  const renderPagination = (page: number, pages: number, tot: number, onChange: (p: number) => void) => {
    if (pages <= 1) return null;
    const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 2)
      .reduce<(number | '...')[]>((acc, p, i, arr) => {
        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
        acc.push(p);
        return acc;
      }, []);

    return (
      <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Pagina <span className="font-medium">{page}</span> di <span className="font-medium">{pages}</span>
          {' '}— <span className="font-medium">{tot}</span> totali
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={() => onChange(1)} disabled={page === 1} className="px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
          <button onClick={() => onChange(page - 1)} disabled={page === 1} className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">‹ Prec</button>
          {pageNumbers.map((item, i) =>
            item === '...' ? (
              <span key={`e-${i}`} className="px-2 py-1 text-sm text-gray-400">…</span>
            ) : (
              <button key={item} onClick={() => onChange(item as number)}
                className={`px-3 py-1 text-sm border rounded ${page === item ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                {item}
              </button>
            )
          )}
          <button onClick={() => onChange(page + 1)} disabled={page === pages} className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Succ ›</button>
          <button onClick={() => onChange(pages)} disabled={page === pages} className="px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
        </div>
      </div>
    );
  };

  if (loading && feedbacks.length === 0 && viewMode === 'timeline') {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('admin.feedback.title')}</h2>
        <div className="flex items-center space-x-2">
          {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-6 h-6 text-gray-600" })}
          <span className="text-gray-600 font-medium">{serverStats.total} check totali</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Totale Check</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{serverStats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Con Dolori/Fastidi</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{serverStats.withDiscomfort}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Motivazione Bassa</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{serverStats.lowMotivation}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Allenamenti Saltati</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{serverStats.missedWorkouts}</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-center space-x-2 bg-white rounded-lg shadow p-1">
        <button
          onClick={() => handleViewModeChange('timeline')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          {React.createElement(FiCalendar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>Vista Timeline</span>
        </button>
        <button
          onClick={() => handleViewModeChange('user')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'user' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          {React.createElement(FiUsers as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>Vista per Utente</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
          </div>
          <input
            type="text"
            placeholder={t('admin.feedback.searchUser')}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          {React.createElement(FiFilter as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-500" })}
          <select
            value={filterDiscomfort}
            onChange={(e) => handleDiscomfortChange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
          >
            <option value="all">Tutti</option>
            <option value="none">Senza dolori</option>
            <option value="has_issues">Con dolori/fastidi</option>
          </select>
        </div>
      </div>

      {/* ── Timeline View ─────────────────────────────────────────────────── */}
      {viewMode === 'timeline' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {feedbacks.length === 0 && !loading ? (
            <div className="text-center py-12 text-gray-500"><p>{t('admin.feedback.noFeedbackAvailable')}</p></div>
          ) : (
            <>
              {loading && <div className="flex justify-center py-3"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div></div>}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Energia</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Allenamenti</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Motivazione</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dolori</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Peso</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {feedbacks.map((feedback) => {
                      const isNew = !feedback.trainer_seen_at;
                      return (
                      <tr
                        key={feedback.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isNew ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''} ${feedback.physical_discomfort === 'significant' && !isNew ? 'bg-red-50' : ''}`}
                        onClick={() => {
                          setSelectedFeedback(feedback);
                          if (isNew) {
                            apiCall(`/feedback/admin/${feedback.id}/mark-seen`, { method: 'POST' })
                              .then(() => {
                                feedback.trainer_seen_at = new Date().toISOString();
                                setFeedbacks([...feedbacks]);
                                if (onFeedbacksSeen) onFeedbacksSeen();
                              })
                              .catch(err => console.error('Error marking feedback as seen:', err));
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {isNew && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase">Nuovo</span>}
                            {formatDate(feedback.feedback_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${isNew ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>{feedback.user_first_name} {feedback.user_last_name}</div>
                          <div className="text-xs text-gray-500">{feedback.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.energy_level, 'energy')}`}>{getEnergyLabel(feedback.energy_level)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.workouts_completed, 'workouts')}`}>{getWorkoutsLabel(feedback.workouts_completed)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.motivation_level, 'motivation')}`}>{getMotivationLabel(feedback.motivation_level)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.physical_discomfort, 'discomfort')}`}>{getDiscomfortLabel(feedback.physical_discomfort)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                          {feedback.current_weight ? `${feedback.current_weight} kg` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {feedback.trainer_seen_at && <span title="Già visto" className="text-green-500 text-xs font-medium">✓</span>}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteFeedback(feedback.id); }} className="text-red-600 hover:text-red-800 p-2" title={t('admin.feedback.deleteFeedback')}>
                              {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {renderPagination(currentPage, totalPages, total, handlePageChange)}
            </>
          )}
        </div>
      )}

      {/* ── User View ─────────────────────────────────────────────────────── */}
      {viewMode === 'user' && (
        <div className="space-y-4">
          {userLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
          ) : userSummaries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg text-center py-12 text-gray-500"><p>{t('admin.feedback.noFeedbackAvailable')}</p></div>
          ) : (
            <>
              {userSummaries.map((userSum) => (
                <div key={userSum.user_id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* User Header */}
                  <div
                    className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${userSum.last_physical_discomfort === 'significant' ? 'bg-red-50' : ''}`}
                    onClick={() => toggleUserExpand(userSum.user_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{userSum.first_name} {userSum.last_name}</h3>
                          {userSum.last_physical_discomfort !== 'none' && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(userSum.last_physical_discomfort, 'discomfort')}`}>
                              {getDiscomfortLabel(userSum.last_physical_discomfort)}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">{userSum.total_feedbacks} check</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">{userSum.username} • {userSum.email}</div>
                        <div className="flex flex-wrap gap-4">
                          <div className="px-4 py-2 rounded-lg bg-gray-50">
                            <div className="text-xs text-gray-600">Ultima Energia</div>
                            <div className={`text-sm font-bold inline-block px-2 py-0.5 rounded mt-1 ${getStatusColor(userSum.last_energy_level, 'energy')}`}>{getEnergyLabel(userSum.last_energy_level)}</div>
                          </div>
                          <div className="px-4 py-2 rounded-lg bg-gray-50">
                            <div className="text-xs text-gray-600">Ultima Motivazione</div>
                            <div className={`text-sm font-bold inline-block px-2 py-0.5 rounded mt-1 ${getStatusColor(userSum.last_motivation_level, 'motivation')}`}>{getMotivationLabel(userSum.last_motivation_level)}</div>
                          </div>
                          <div className="px-4 py-2 rounded-lg bg-gray-50">
                            <div className="text-xs text-gray-600">Ultimo Check</div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(userSum.last_feedback_date)}</div>
                          </div>
                          {userSum.last_current_weight && (
                            <div className="px-4 py-2 rounded-lg bg-blue-50">
                              <div className="text-xs text-gray-600">Ultimo Peso</div>
                              <div className="text-sm font-bold text-blue-800">{userSum.last_current_weight} kg</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {expandedUsers[userSum.user_id]
                          ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: "w-6 h-6 text-gray-400" })
                          : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: "w-6 h-6 text-gray-400" })
                        }
                      </div>
                    </div>
                  </div>

                  {/* Expanded: lazy-loaded feedbacks */}
                  {expandedUsers[userSum.user_id] && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      {loadingUserFeedbacks[userSum.user_id] ? (
                        <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div></div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {(expandedUserFeedbacks[userSum.user_id] || []).map((feedback) => {
                            const isNew = !feedback.trainer_seen_at;
                            return (
                            <div
                              key={feedback.id}
                              className={`p-4 hover:bg-gray-100 cursor-pointer transition-colors ${isNew ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFeedback(feedback);
                                if (isNew) {
                                  apiCall(`/feedback/admin/${feedback.id}/mark-seen`, { method: 'POST' })
                                    .then(() => {
                                      feedback.trainer_seen_at = new Date().toISOString();
                                      setExpandedUserFeedbacks(prev => ({ ...prev }));
                                      if (onFeedbacksSeen) onFeedbacksSeen();
                                    })
                                    .catch(err => console.error('Error marking feedback as seen:', err));
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    {isNew && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase">Nuovo</span>}
                                    <span className={`text-sm ${isNew ? 'font-bold' : 'font-medium'} text-gray-900`}>{formatDate(feedback.feedback_date)}</span>
                                    {feedback.physical_discomfort !== 'none' && (
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.physical_discomfort, 'discomfort')}`}>{getDiscomfortLabel(feedback.physical_discomfort)}</span>
                                    )}
                                    {feedback.trainer_seen_at && <span className="text-green-500 text-xs font-medium">✓ Visto</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div><span className="text-gray-600">Energia: </span><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feedback.energy_level, 'energy')}`}>{getEnergyLabel(feedback.energy_level)}</span></div>
                                    <div><span className="text-gray-600">Allenamenti: </span><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feedback.workouts_completed, 'workouts')}`}>{getWorkoutsLabel(feedback.workouts_completed)}</span></div>
                                    <div><span className="text-gray-600">Sonno: </span><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feedback.sleep_quality, 'sleep')}`}>{getSleepLabel(feedback.sleep_quality)}</span></div>
                                    {feedback.current_weight && <div><span className="text-gray-600">Peso: </span><span className="font-medium">{feedback.current_weight} kg</span></div>}
                                  </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFeedback(feedback.id, feedback.user_id); }} className="text-red-600 hover:text-red-800 p-2 ml-4" title={t('admin.feedback.deleteFeedback')}>
                                  {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                                </button>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* User view pagination */}
              {userTotalPages > 1 && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {renderPagination(userCurrentPage, userTotalPages, userTotal, handleUserPageChange)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Feedback Detail Modal ──────────────────────────────────────────── */}
      {selectedFeedback && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedFeedback(null); }}
        >
          <div className="bg-white rounded-xl max-w-3xl w-full flex flex-col max-h-[90vh] cursor-default">
            {/* Sticky header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">
                Check di {selectedFeedback.user_first_name} {selectedFeedback.user_last_name}
              </h3>
              <button onClick={() => setSelectedFeedback(null)} className="text-gray-500 hover:text-gray-700 ml-4">
                {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" })}
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">{t('admin.feedback.userInfo')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-600">{t('admin.feedback.name')}: </span><span className="font-medium">{selectedFeedback.first_name} {selectedFeedback.last_name}</span></div>
                    <div><span className="text-gray-600">{t('admin.feedback.email')}: </span><span className="font-medium">{selectedFeedback.email}</span></div>
                    <div><span className="text-gray-600">{t('admin.feedback.username')}: </span><span className="font-medium">{selectedFeedback.username}</span></div>
                    <div><span className="text-gray-600">{t('admin.feedback.feedbackDate')}: </span><span className="font-medium">{formatDate(selectedFeedback.feedback_date)}</span></div>
                  </div>
                </div>

                {/* Check Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Energia</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.energy_level, 'energy')}`}>{getEnergyLabel(selectedFeedback.energy_level)}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Allenamenti</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.workouts_completed, 'workouts')}`}>{getWorkoutsLabel(selectedFeedback.workouts_completed)}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Piano Alimentare</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.meal_plan_followed, 'meal')}`}>{getMealPlanLabel(selectedFeedback.meal_plan_followed)}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Qualità Sonno</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.sleep_quality, 'sleep')}`}>{getSleepLabel(selectedFeedback.sleep_quality)}</span>
                  </div>
                  <div className={`p-4 rounded-lg ${selectedFeedback.physical_discomfort === 'none' ? 'bg-green-50' : selectedFeedback.physical_discomfort === 'minor' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                    <div className="text-sm text-gray-600 mb-1">Dolori/Fastidi</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.physical_discomfort, 'discomfort')}`}>{getDiscomfortLabel(selectedFeedback.physical_discomfort)}</span>
                    {selectedFeedback.discomfort_details && <p className="mt-2 text-sm text-gray-800 bg-white bg-opacity-50 p-2 rounded">{selectedFeedback.discomfort_details}</p>}
                    {selectedFeedback.physical_discomfort !== 'none' && (() => {
                      const muscZones: string[] = selectedFeedback.muscular_zones ? (() => { try { return JSON.parse(selectedFeedback.muscular_zones!); } catch { return []; } })() : [];
                      const artZones: string[] = selectedFeedback.articular_zones ? (() => { try { return JSON.parse(selectedFeedback.articular_zones!); } catch { return []; } })() : [];
                      if (muscZones.length === 0 && artZones.length === 0) return null;
                      return (
                        <div className="mt-3 space-y-2">
                          {muscZones.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-gray-700">💪 Muscolari: </span>
                              <div className="flex flex-wrap gap-1 mt-1">{muscZones.map((z) => <span key={z} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">{z}</span>)}</div>
                              {selectedFeedback.muscular_notes && <p className="text-xs text-gray-600 mt-1 italic">📝 {selectedFeedback.muscular_notes}</p>}
                            </div>
                          )}
                          {artZones.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-gray-700">🦴 Articolari: </span>
                              <div className="flex flex-wrap gap-1 mt-1">{artZones.map((z) => <span key={z} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">{z}</span>)}</div>
                              {selectedFeedback.articular_notes && <p className="text-xs text-gray-600 mt-1 italic">📝 {selectedFeedback.articular_notes}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Motivazione</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.motivation_level, 'motivation')}`}>{getMotivationLabel(selectedFeedback.motivation_level)}</span>
                  </div>
                </div>

                {selectedFeedback.current_weight && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Peso Attuale</div>
                    <div className="text-2xl font-bold text-blue-800">{selectedFeedback.current_weight} kg</div>
                  </div>
                )}

                {selectedFeedback.weekly_highlights && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Cosa è andato bene questa settimana</h4>
                    <p className="text-gray-800">{selectedFeedback.weekly_highlights}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 border-t pt-4">
                  <div>{t('admin.feedback.submittedOn')}: {formatDate(selectedFeedback.created_at)}</div>
                  {selectedFeedback.pdf_change_date && <div>{t('admin.feedback.planChangedOn')}: {formatDate(selectedFeedback.pdf_change_date)}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
