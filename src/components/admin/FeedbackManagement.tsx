import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiTrash2, FiSearch, FiFilter, FiX } from 'react-icons/fi';
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

const FeedbackManagement: React.FC = () => {
  const { t } = useTranslation();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [filterSupport, setFilterSupport] = useState<'all' | 'supported' | 'needs_help'>('all');

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

      {/* Feedbacks List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t('admin.feedback.noFeedbackAvailable')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${!feedback.feels_supported ? 'bg-red-50' : ''}`}
                onClick={() => setSelectedFeedback(feedback)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {feedback.user_first_name} {feedback.user_last_name}
                      </h3>
                      {!feedback.feels_supported && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          {t('admin.feedback.needsSupportBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {feedback.username} • {feedback.email}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">{t('admin.feedback.date')}: </span>
                        <span className="font-medium">{formatDate(feedback.feedback_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('admin.feedback.satisfaction')}: </span>
                        <span className={`font-bold ${getScoreColor(feedback.training_satisfaction)}`}>
                          {feedback.training_satisfaction}/10
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('admin.feedback.motivation')}: </span>
                        <span className={`font-bold ${getScoreColor(feedback.motivation_level)}`}>
                          {feedback.motivation_level}/10
                        </span>
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNutritionColor(feedback.nutrition_quality)}`}>
                          {getNutritionLabel(feedback.nutrition_quality)}
                        </span>
                      </div>
                    </div>
                  </div>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
