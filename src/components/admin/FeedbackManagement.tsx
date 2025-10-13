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
  training_satisfaction: number;
  motivation_level: number;
  difficulties: string | null;
  nutrition_quality: string;
  sleep_hours: number;
  recovery_improved: boolean;
  feels_supported: boolean;
  support_improvement: string | null;
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
  avgSatisfaction: number;
  avgMotivation: number;
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
  const [filterSupport, setFilterSupport] = useState<'all' | 'supported' | 'needs_help'>('all');
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

  const getNutritionLabel = (quality: string): string => {
    return t(`admin.feedback.nutritionQuality.${quality}`, quality);
  };

  const getNutritionColor = (quality: string): string => {
    const colors: Record<string, string> = {
      'ottima': 'bg-green-100 text-green-800',
      'buona': 'bg-blue-100 text-blue-800',
      'da_migliorare': 'bg-yellow-100 text-yellow-800',
      'difficolta': 'bg-red-100 text-red-800'
    };
    return colors[quality] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 8) return 'bg-green-50';
    if (score >= 5) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(feedback => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        feedback.user_first_name.toLowerCase().includes(searchLower) ||
        feedback.user_last_name.toLowerCase().includes(searchLower) ||
        feedback.username.toLowerCase().includes(searchLower) ||
        feedback.email.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Support filter
    if (filterSupport === 'supported' && !feedback.feels_supported) return false;
    if (filterSupport === 'needs_help' && feedback.feels_supported) return false;

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
          avgSatisfaction: 0,
          avgMotivation: 0,
          totalFeedbacks: 0,
          lastFeedback: feedback
        });
      }

      const group = userMap.get(feedback.user_id)!;
      group.feedbacks.push(feedback);
    });

    // Calculate averages and sort feedbacks
    const groups = Array.from(userMap.values()).map(group => {
      group.feedbacks.sort((a, b) => new Date(b.feedback_date).getTime() - new Date(a.feedback_date).getTime());
      group.totalFeedbacks = group.feedbacks.length;
      group.avgSatisfaction = group.feedbacks.reduce((sum, f) => sum + f.training_satisfaction, 0) / group.totalFeedbacks;
      group.avgMotivation = group.feedbacks.reduce((sum, f) => sum + f.motivation_level, 0) / group.totalFeedbacks;
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
    avgSatisfaction: feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.training_satisfaction, 0) / feedbacks.length).toFixed(1)
      : '0',
    avgMotivation: feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.motivation_level, 0) / feedbacks.length).toFixed(1)
      : '0',
    needsHelp: feedbacks.filter(f => !f.feels_supported).length
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
          <span className="text-gray-600 font-medium">{filteredFeedbacks.length} {t('admin.feedback.tabTitle').toLowerCase()}</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('admin.feedback.totalFeedbacks')}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('admin.feedback.avgSatisfaction')}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.avgSatisfaction}/10</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('admin.feedback.avgMotivation')}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.avgMotivation}/10</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('admin.feedback.needsSupport')}</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.needsHelp}</div>
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
            value={filterSupport}
            onChange={(e) => setFilterSupport(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
          >
            <option value="all">{t('admin.feedback.filterAll')}</option>
            <option value="supported">{t('admin.feedback.filterSupported')}</option>
            <option value="needs_help">{t('admin.feedback.filterNeedsHelp')}</option>
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
                        Soddisfazione
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motivazione
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alimentazione
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supporto
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
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${!feedback.feels_supported ? 'bg-red-50' : ''}`}
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
                          <span className={`text-lg font-bold ${getScoreColor(feedback.training_satisfaction)}`}>
                            {feedback.training_satisfaction}
                          </span>
                          <span className="text-xs text-gray-500">/10</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-lg font-bold ${getScoreColor(feedback.motivation_level)}`}>
                            {feedback.motivation_level}
                          </span>
                          <span className="text-xs text-gray-500">/10</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getNutritionColor(feedback.nutrition_quality)}`}>
                            {getNutritionLabel(feedback.nutrition_quality)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {feedback.feels_supported ? (
                            <span className="text-green-600 text-xl">✓</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Aiuto
                            </span>
                          )}
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
                  className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${!userGroup.lastFeedback.feels_supported ? 'bg-red-50' : ''}`}
                  onClick={() => toggleUserExpand(userGroup.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {userGroup.firstName} {userGroup.lastName}
                        </h3>
                        {!userGroup.lastFeedback.feels_supported && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            {t('admin.feedback.needsSupportBadge')}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {userGroup.totalFeedbacks} feedback
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {userGroup.username} • {userGroup.email}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className={`px-4 py-2 rounded-lg ${getScoreBgColor(userGroup.avgSatisfaction)}`}>
                          <div className="text-xs text-gray-600">Media Soddisfazione</div>
                          <div className={`text-lg font-bold ${getScoreColor(userGroup.avgSatisfaction)}`}>
                            {userGroup.avgSatisfaction.toFixed(1)}/10
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-lg ${getScoreBgColor(userGroup.avgMotivation)}`}>
                          <div className="text-xs text-gray-600">Media Motivazione</div>
                          <div className={`text-lg font-bold ${getScoreColor(userGroup.avgMotivation)}`}>
                            {userGroup.avgMotivation.toFixed(1)}/10
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-gray-50">
                          <div className="text-xs text-gray-600">Ultimo Feedback</div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(userGroup.lastFeedback.feedback_date)}
                          </div>
                        </div>
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
                                {!feedback.feels_supported && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                    Needs Support
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Soddisfazione: </span>
                                  <span className={`font-bold ${getScoreColor(feedback.training_satisfaction)}`}>
                                    {feedback.training_satisfaction}/10
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Motivazione: </span>
                                  <span className={`font-bold ${getScoreColor(feedback.motivation_level)}`}>
                                    {feedback.motivation_level}/10
                                  </span>
                                </div>
                                <div>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNutritionColor(feedback.nutrition_quality)}`}>
                                    {getNutritionLabel(feedback.nutrition_quality)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Sonno: </span>
                                  <span className="font-medium">{feedback.sleep_hours}h</span>
                                </div>
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
                {t('admin.feedback.feedbackDetails')} {selectedFeedback.user_first_name} {selectedFeedback.user_last_name}
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

              {/* Training */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('admin.feedback.trainingProgress')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">{t('admin.feedback.satisfaction')}</div>
                    <div className={`text-3xl font-bold ${getScoreColor(selectedFeedback.training_satisfaction)}`}>
                      {selectedFeedback.training_satisfaction}/10
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">{t('admin.feedback.motivation')}</div>
                    <div className={`text-3xl font-bold ${getScoreColor(selectedFeedback.motivation_level)}`}>
                      {selectedFeedback.motivation_level}/10
                    </div>
                  </div>
                </div>
                {selectedFeedback.difficulties && (
                  <div className="mt-4 bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">{t('admin.feedback.difficulties')}:</div>
                    <p className="text-gray-800">{selectedFeedback.difficulties}</p>
                  </div>
                )}
              </div>

              {/* Nutrition & Recovery */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('admin.feedback.nutritionRecovery')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">{t('admin.feedback.nutrition')}</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getNutritionColor(selectedFeedback.nutrition_quality)}`}>
                      {getNutritionLabel(selectedFeedback.nutrition_quality)}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">{t('admin.feedback.sleepHours')}</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedFeedback.sleep_hours}h</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">{t('admin.feedback.recoveryImproved')}</div>
                    <div className={`text-xl font-bold ${selectedFeedback.recovery_improved ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedFeedback.recovery_improved ? t('admin.feedback.yes') : t('admin.feedback.no')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className={`p-4 rounded-lg ${selectedFeedback.feels_supported ? 'bg-green-50' : 'bg-red-50'}`}>
                <h4 className="font-semibold text-gray-900 mb-2">{t('admin.feedback.coachSupport')}</h4>
                <div className="mb-2">
                  <span className="text-gray-700">{t('admin.feedback.feelsSupported')}: </span>
                  <span className={`font-bold ${selectedFeedback.feels_supported ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedFeedback.feels_supported ? t('admin.feedback.yes') : t('admin.feedback.no')}
                  </span>
                </div>
                {selectedFeedback.support_improvement && (
                  <div className="mt-3 bg-white p-3 rounded">
                    <div className="text-sm font-medium text-gray-700 mb-1">{t('admin.feedback.improvements')}:</div>
                    <p className="text-gray-800">{selectedFeedback.support_improvement}</p>
                  </div>
                )}
              </div>

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
