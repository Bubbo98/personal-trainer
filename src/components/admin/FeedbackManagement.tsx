import React, { useState, useEffect, useCallback } from 'react';
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
  motivation_level: string;
  weekly_highlights: string | null;
  current_weight: number | null;
  created_at: string;
  pdf_change_date: string | null;
}

interface UserFeedbackGroup {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  feedbacks: Feedback[];
  totalFeedbacks: number;
  lastFeedback: Feedback;
}

type ViewMode = 'timeline' | 'user';

const FeedbackManagement: React.FC = () => {
  const { t } = useTranslation();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [filterDiscomfort, setFilterDiscomfort] = useState<'all' | 'none' | 'has_issues'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const itemsPerPage = 15;

  const loadFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall('/feedback/admin/all');
      setFeedbacks(response.data.feedbacks);
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!window.confirm(t('admin.feedback.confirmDelete'))) {
      return;
    }

    try {
      await apiCall(`/feedback/${feedbackId}`, {
        method: 'DELETE'
      });

      loadFeedbacks();
      setSelectedFeedback(null);
      alert(t('admin.feedback.deleteSuccess'));
    } catch (error) {
      alert(`${t('admin.errors.error')}: ${error instanceof Error ? error.message : t('admin.feedback.deleteFailed')}`);
    }
  };

  // Label getters for the new fields
  const getEnergyLabel = (level: string): string => {
    const labels: Record<string, string> = {
      high: 'Alta',
      medium: 'Media',
      low: 'Bassa'
    };
    return labels[level] || level;
  };

  const getWorkoutsLabel = (status: string): string => {
    const labels: Record<string, string> = {
      all: 'Tutti',
      almost_all: 'Quasi tutti',
      few_or_none: 'Pochi/nessuno'
    };
    return labels[status] || status;
  };

  const getMealPlanLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completely: 'Completamente',
      mostly: 'In gran parte',
      sometimes: 'A volte',
      no: 'No'
    };
    return labels[status] || status;
  };

  const getSleepLabel = (quality: string): string => {
    const labels: Record<string, string> = {
      excellent: 'Ottima',
      good: 'Buona',
      fair: 'Così così',
      poor: 'Scarsa'
    };
    return labels[quality] || quality;
  };

  const getDiscomfortLabel = (status: string): string => {
    const labels: Record<string, string> = {
      none: 'Nessuno',
      minor: 'Lieve',
      significant: 'Rilevante'
    };
    return labels[status] || status;
  };

  const getMotivationLabel = (level: string): string => {
    const labels: Record<string, string> = {
      very_high: 'Molto alta',
      good: 'Buona',
      medium: 'Media',
      low: 'Bassa'
    };
    return labels[level] || level;
  };

  // Color helpers
  const getStatusColor = (value: string, type: 'energy' | 'workouts' | 'meal' | 'sleep' | 'discomfort' | 'motivation'): string => {
    const colorMap: Record<string, Record<string, string>> = {
      energy: {
        high: 'bg-green-100 text-green-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-red-100 text-red-800'
      },
      workouts: {
        all: 'bg-green-100 text-green-800',
        almost_all: 'bg-yellow-100 text-yellow-800',
        few_or_none: 'bg-red-100 text-red-800'
      },
      meal: {
        completely: 'bg-green-100 text-green-800',
        mostly: 'bg-blue-100 text-blue-800',
        sometimes: 'bg-yellow-100 text-yellow-800',
        no: 'bg-red-100 text-red-800'
      },
      sleep: {
        excellent: 'bg-green-100 text-green-800',
        good: 'bg-blue-100 text-blue-800',
        fair: 'bg-yellow-100 text-yellow-800',
        poor: 'bg-red-100 text-red-800'
      },
      discomfort: {
        none: 'bg-green-100 text-green-800',
        minor: 'bg-yellow-100 text-yellow-800',
        significant: 'bg-red-100 text-red-800'
      },
      motivation: {
        very_high: 'bg-green-100 text-green-800',
        good: 'bg-blue-100 text-blue-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-red-100 text-red-800'
      }
    };
    return colorMap[type]?.[value] || 'bg-gray-100 text-gray-800';
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(feedback => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        feedback.user_first_name?.toLowerCase().includes(searchLower) ||
        feedback.user_last_name?.toLowerCase().includes(searchLower) ||
        feedback.username?.toLowerCase().includes(searchLower) ||
        feedback.email?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Discomfort filter
    if (filterDiscomfort === 'none' && feedback.physical_discomfort !== 'none') return false;
    if (filterDiscomfort === 'has_issues' && feedback.physical_discomfort === 'none') return false;

    return true;
  });

  // Group feedbacks by user
  const groupedByUser = (): UserFeedbackGroup[] => {
    const userMap = new Map<number, UserFeedbackGroup>();

    filteredFeedbacks.forEach(feedback => {
      if (!userMap.has(feedback.user_id)) {
        userMap.set(feedback.user_id, {
          userId: feedback.user_id,
          username: feedback.username,
          firstName: feedback.user_first_name,
          lastName: feedback.user_last_name,
          email: feedback.email,
          feedbacks: [],
          totalFeedbacks: 0,
          lastFeedback: feedback
        });
      }

      const group = userMap.get(feedback.user_id)!;
      group.feedbacks.push(feedback);
    });

    // Calculate totals and sort feedbacks
    const groups = Array.from(userMap.values()).map(group => {
      group.feedbacks.sort((a, b) => new Date(b.feedback_date).getTime() - new Date(a.feedback_date).getTime());
      group.totalFeedbacks = group.feedbacks.length;
      group.lastFeedback = group.feedbacks[0];
      return group;
    });

    // Sort groups by last feedback date
    groups.sort((a, b) => new Date(b.lastFeedback.feedback_date).getTime() - new Date(a.lastFeedback.feedback_date).getTime());

    return groups;
  };

  // Pagination for timeline view
  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const paginatedFeedbacks = filteredFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = {
    total: feedbacks.length,
    withDiscomfort: feedbacks.filter(f => f.physical_discomfort !== 'none').length,
    lowMotivation: feedbacks.filter(f => f.motivation_level === 'low').length,
    missedWorkouts: feedbacks.filter(f => f.workouts_completed === 'few_or_none').length
  };

  const toggleUserExpand = (userId: number) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  if (loading && feedbacks.length === 0) {
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
        <h2 className="text-2xl font-bold text-gray-900">{t('admin.feedback.title')}</h2>
        <div className="flex items-center space-x-2">
          {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-6 h-6 text-gray-600" })}
          <span className="text-gray-600 font-medium">{filteredFeedbacks.length} check</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Totale Check</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Con Dolori/Fastidi</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{stats.withDiscomfort}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Motivazione Bassa</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.lowMotivation}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Allenamenti Saltati</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.missedWorkouts}</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-center space-x-2 bg-white rounded-lg shadow p-1">
        <button
          onClick={() => {
            setViewMode('timeline');
            setCurrentPage(1);
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            viewMode === 'timeline'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {React.createElement(FiCalendar as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
          <span>Vista Timeline</span>
        </button>
        <button
          onClick={() => {
            setViewMode('user');
            setCurrentPage(1);
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            viewMode === 'user'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          {React.createElement(FiFilter as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-500" })}
          <select
            value={filterDiscomfort}
            onChange={(e) => setFilterDiscomfort(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
          >
            <option value="all">Tutti</option>
            <option value="none">Senza dolori</option>
            <option value="has_issues">Con dolori/fastidi</option>
          </select>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>{t('admin.feedback.noFeedbackAvailable')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utente
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Energia
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Allenamenti
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motivazione
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dolori
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedFeedbacks.map((feedback) => (
                      <tr
                        key={feedback.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${feedback.physical_discomfort === 'significant' ? 'bg-red-50' : ''}`}
                        onClick={() => setSelectedFeedback(feedback)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(feedback.feedback_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {feedback.user_first_name} {feedback.user_last_name}
                          </div>
                          <div className="text-xs text-gray-500">{feedback.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.energy_level, 'energy')}`}>
                            {getEnergyLabel(feedback.energy_level)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.workouts_completed, 'workouts')}`}>
                            {getWorkoutsLabel(feedback.workouts_completed)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.motivation_level, 'motivation')}`}>
                            {getMotivationLabel(feedback.motivation_level)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.physical_discomfort, 'discomfort')}`}>
                            {getDiscomfortLabel(feedback.physical_discomfort)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                          {feedback.current_weight ? `${feedback.current_weight} kg` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFeedback(feedback.id);
                            }}
                            className="text-red-600 hover:text-red-800 p-2"
                            title={t('admin.feedback.deleteFeedback')}
                          >
                            {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Precedente
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Successivo
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredFeedbacks.length)}</span> di{' '}
                        <span className="font-medium">{filteredFeedbacks.length}</span> risultati
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Precedente
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-gray-900 border-gray-900 text-white'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Successivo
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* User View */}
      {viewMode === 'user' && (
        <div className="space-y-4">
          {groupedByUser().length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg text-center py-12 text-gray-500">
              <p>{t('admin.feedback.noFeedbackAvailable')}</p>
            </div>
          ) : (
            groupedByUser().map((userGroup) => (
              <div key={userGroup.userId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* User Header */}
                <div
                  className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${userGroup.lastFeedback.physical_discomfort === 'significant' ? 'bg-red-50' : ''}`}
                  onClick={() => toggleUserExpand(userGroup.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {userGroup.firstName} {userGroup.lastName}
                        </h3>
                        {userGroup.lastFeedback.physical_discomfort !== 'none' && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(userGroup.lastFeedback.physical_discomfort, 'discomfort')}`}>
                            {getDiscomfortLabel(userGroup.lastFeedback.physical_discomfort)}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {userGroup.totalFeedbacks} check
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {userGroup.username} • {userGroup.email}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className={`px-4 py-2 rounded-lg ${getStatusColor(userGroup.lastFeedback.energy_level, 'energy').replace('text-', 'bg-').split(' ')[0]}`}>
                          <div className="text-xs text-gray-600">Ultima Energia</div>
                          <div className="text-sm font-bold">
                            {getEnergyLabel(userGroup.lastFeedback.energy_level)}
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-lg ${getStatusColor(userGroup.lastFeedback.motivation_level, 'motivation').replace('text-', 'bg-').split(' ')[0]}`}>
                          <div className="text-xs text-gray-600">Ultima Motivazione</div>
                          <div className="text-sm font-bold">
                            {getMotivationLabel(userGroup.lastFeedback.motivation_level)}
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-gray-50">
                          <div className="text-xs text-gray-600">Ultimo Check</div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(userGroup.lastFeedback.feedback_date)}
                          </div>
                        </div>
                        {userGroup.lastFeedback.current_weight && (
                          <div className="px-4 py-2 rounded-lg bg-blue-50">
                            <div className="text-xs text-gray-600">Ultimo Peso</div>
                            <div className="text-sm font-bold text-blue-800">
                              {userGroup.lastFeedback.current_weight} kg
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {expandedUsers.has(userGroup.userId) ? (
                        React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: "w-6 h-6 text-gray-400" })
                      ) : (
                        React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: "w-6 h-6 text-gray-400" })
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Feedbacks */}
                {expandedUsers.has(userGroup.userId) && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="divide-y divide-gray-200">
                      {userGroup.feedbacks.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="p-4 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFeedback(feedback);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatDate(feedback.feedback_date)}
                                </span>
                                {feedback.physical_discomfort !== 'none' && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.physical_discomfort, 'discomfort')}`}>
                                    {getDiscomfortLabel(feedback.physical_discomfort)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Energia: </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feedback.energy_level, 'energy')}`}>
                                    {getEnergyLabel(feedback.energy_level)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Allenamenti: </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feedback.workouts_completed, 'workouts')}`}>
                                    {getWorkoutsLabel(feedback.workouts_completed)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Sonno: </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(feedback.sleep_quality, 'sleep')}`}>
                                    {getSleepLabel(feedback.sleep_quality)}
                                  </span>
                                </div>
                                {feedback.current_weight && (
                                  <div>
                                    <span className="text-gray-600">Peso: </span>
                                    <span className="font-medium">{feedback.current_weight} kg</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFeedback(feedback.id);
                              }}
                              className="text-red-600 hover:text-red-800 p-2 ml-4"
                              title={t('admin.feedback.deleteFeedback')}
                            >
                              {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Check di {selectedFeedback.user_first_name} {selectedFeedback.user_last_name}
              </h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-6 h-6" })}
              </button>
            </div>

            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">{t('admin.feedback.userInfo')}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">{t('admin.feedback.name')}: </span>
                    <span className="font-medium">{selectedFeedback.first_name} {selectedFeedback.last_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('admin.feedback.email')}: </span>
                    <span className="font-medium">{selectedFeedback.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('admin.feedback.username')}: </span>
                    <span className="font-medium">{selectedFeedback.username}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('admin.feedback.feedbackDate')}: </span>
                    <span className="font-medium">{formatDate(selectedFeedback.feedback_date)}</span>
                  </div>
                </div>
              </div>

              {/* Check Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Energia</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.energy_level, 'energy')}`}>
                    {getEnergyLabel(selectedFeedback.energy_level)}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Allenamenti</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.workouts_completed, 'workouts')}`}>
                    {getWorkoutsLabel(selectedFeedback.workouts_completed)}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Piano Alimentare</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.meal_plan_followed, 'meal')}`}>
                    {getMealPlanLabel(selectedFeedback.meal_plan_followed)}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Qualità Sonno</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.sleep_quality, 'sleep')}`}>
                    {getSleepLabel(selectedFeedback.sleep_quality)}
                  </span>
                </div>
                <div className={`p-4 rounded-lg ${selectedFeedback.physical_discomfort === 'none' ? 'bg-green-50' : selectedFeedback.physical_discomfort === 'minor' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                  <div className="text-sm text-gray-600 mb-1">Dolori/Fastidi</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.physical_discomfort, 'discomfort')}`}>
                    {getDiscomfortLabel(selectedFeedback.physical_discomfort)}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Motivazione</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.motivation_level, 'motivation')}`}>
                    {getMotivationLabel(selectedFeedback.motivation_level)}
                  </span>
                </div>
              </div>

              {/* Weight */}
              {selectedFeedback.current_weight && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Peso Attuale</div>
                  <div className="text-2xl font-bold text-blue-800">{selectedFeedback.current_weight} kg</div>
                </div>
              )}

              {/* Weekly Highlights */}
              {selectedFeedback.weekly_highlights && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Cosa è andato bene questa settimana</h4>
                  <p className="text-gray-800">{selectedFeedback.weekly_highlights}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-gray-500 border-t pt-4">
                <div>{t('admin.feedback.submittedOn')}: {formatDate(selectedFeedback.created_at)}</div>
                {selectedFeedback.pdf_change_date && (
                  <div>{t('admin.feedback.planChangedOn')}: {formatDate(selectedFeedback.pdf_change_date)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
