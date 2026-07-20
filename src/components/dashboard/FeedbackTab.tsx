import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import FeedbackForm from './FeedbackForm';
import { apiCall, formatDate, STORAGE_KEY } from '../../utils/dashboardUtils';

interface Feedback {
  id: number;
  user_id: number;
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

interface FeedbackStatus {
  shouldShow: boolean;
  reason?: string;
  pdfUpdatedAt?: string;
  lastFeedbackAt?: string;
}

interface FeedbackTabProps {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  onCheckInCompleted?: () => void;
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({ user, onCheckInCompleted }) => {
  const { t } = useTranslation();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeedbackStatus = useCallback(async () => {
    try {
      const authToken = localStorage.getItem(STORAGE_KEY);
      if (!authToken) return;

      const response = await apiCall('/feedback/should-show', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setFeedbackStatus(response.data);
    } catch (err) {
      console.error('Error loading feedback status:', err);
    }
  }, []);

  const loadFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem(STORAGE_KEY);
      if (!authToken) return;

      const response = await apiCall('/feedback/my-feedbacks', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setFeedbacks(response.data.feedbacks);
    } catch (err) {
      console.error('Error loading feedbacks:', err);
      setError(t('dashboard.feedback.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFeedbackStatus();
    loadFeedbacks();
  }, [loadFeedbackStatus, loadFeedbacks]);

  const handleSubmitFeedback = async (formData: any) => {
    try {
      setSubmitting(true);
      setError(null);

      const authToken = localStorage.getItem(STORAGE_KEY);
      if (!authToken) {
        throw new Error(t('dashboard.feedback.error'));
      }

      await apiCall('/feedback', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(formData)
      });

      // Reload feedback status and list
      await loadFeedbackStatus();
      await loadFeedbacks();

      // Notify parent that check is completed
      if (onCheckInCompleted) {
        onCheckInCompleted();
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(t('dashboard.feedback.error'));
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const getEnergyLabel = (level: string): string => {
    return t(`dashboard.feedback.checkin.energyOptions.${level}`, level);
  };

  const getWorkoutsLabel = (status: string): string => {
    return t(`dashboard.feedback.checkin.workoutsOptions.${status}`, status);
  };

  const getMealPlanLabel = (status: string): string => {
    return t(`dashboard.feedback.checkin.mealPlanOptions.${status}`, status);
  };

  const getSleepLabel = (quality: string): string => {
    return t(`dashboard.feedback.checkin.sleepOptions.${quality}`, quality);
  };

  const getDiscomfortLabel = (status: string): string => {
    return t(`dashboard.feedback.checkin.discomfortOptions.${status}`, status);
  };

  const getMotivationLabel = (level: string): string => {
    return t(`dashboard.feedback.checkin.motivationOptions.${level}`, level);
  };

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-4/5" />
          <div className="h-10 bg-gray-200 rounded-lg w-full mt-2" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-2/5" />
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-8 h-8 text-gray-900" })}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.feedback.title')}</h2>
          <p className="text-gray-600">{t('dashboard.feedback.subtitle')}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          {React.createElement(FiAlertCircle as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
          <span>{error}</span>
        </div>
      )}

      {/* Show Feedback Form if conditions are met */}
      {feedbackStatus?.shouldShow && (
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4 flex items-start space-x-2">
            {React.createElement(FiClock as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 mt-0.5" })}
            <div>
              <p className="font-medium">{t('dashboard.feedback.status.canSubmit')}</p>
              <p className="text-sm">
                {t('dashboard.feedback.status.canSubmitMessage')}
              </p>
            </div>
          </div>
          <FeedbackForm
            onSubmit={handleSubmitFeedback}
            initialData={{
              firstName: user?.firstName || '',
              lastName: user?.lastName || '',
              email: user?.email || ''
            }}
            isLoading={submitting}
          />
        </div>
      )}

      {/* Status message when form shouldn't be shown */}
      {!feedbackStatus?.shouldShow && feedbackStatus?.reason && (() => {
        let daysRemaining = 0;
        let progressPercentage = 0;
        let targetDate = null;

        if (feedbackStatus.reason === 'too_soon' && feedbackStatus.pdfUpdatedAt) {
          const pdfDate = new Date(feedbackStatus.pdfUpdatedAt);
          const now = new Date();
          const oneWeekFromPdf = new Date(pdfDate.getTime() + (7 * 24 * 60 * 60 * 1000));
          targetDate = oneWeekFromPdf;
          daysRemaining = Math.ceil((oneWeekFromPdf.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          progressPercentage = Math.min(100, Math.max(0, ((7 - daysRemaining) / 7) * 100));
        } else if (feedbackStatus.reason === 'too_soon_since_last' && feedbackStatus.lastFeedbackAt) {
          const lastFeedbackDate = new Date(feedbackStatus.lastFeedbackAt);
          const now = new Date();
          const twoWeeksFromLast = new Date(lastFeedbackDate.getTime() + (14 * 24 * 60 * 60 * 1000));
          targetDate = twoWeeksFromLast;
          daysRemaining = Math.ceil((twoWeeksFromLast.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          progressPercentage = Math.min(100, Math.max(0, ((14 - daysRemaining) / 14) * 100));
        }

        return (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              {React.createElement(FiCheckCircle as React.ComponentType<{ className?: string }>, { className: "w-6 h-6 mt-0.5 text-blue-600 flex-shrink-0" })}
              <div className="flex-1">
                {feedbackStatus.reason === 'no_pdf' && (
                  <>
                    <p className="font-semibold text-gray-900 mb-1">{t('dashboard.feedback.status.noPlan')}</p>
                    <p className="text-sm text-gray-700">
                      {t('dashboard.feedback.status.noPlanMessage')}
                    </p>
                  </>
                )}
                {(feedbackStatus.reason === 'too_soon' || feedbackStatus.reason === 'too_soon_since_last') && (
                  <>
                    <p className="font-semibold text-gray-900 mb-1">
                      {feedbackStatus.reason === 'too_soon'
                        ? t('dashboard.feedback.status.tooSoon')
                        : t('dashboard.feedback.status.tooSoonSinceLast')}
                    </p>
                    <p className="text-sm text-gray-700 mb-4">
                      {feedbackStatus.reason === 'too_soon'
                        ? t('dashboard.feedback.status.tooSoonMessage')
                        : t('dashboard.feedback.status.tooSoonSinceLastMessage')}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-4 mb-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">
                          {daysRemaining > 0
                            ? `${daysRemaining} ${daysRemaining === 1 ? 'giorno' : 'giorni'} rimanenti`
                            : 'Disponibile a breve'}
                        </span>
                        <span className="text-blue-600 font-semibold">{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Target Date */}
                    {targetDate && (
                      <div className="mt-3 bg-white bg-opacity-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs text-gray-600 mb-1">Prossimo check disponibile il:</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {targetDate.toLocaleDateString('it-IT', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {feedbackStatus.reason === 'already_submitted' && (
                  <>
                    <p className="font-semibold text-gray-900 mb-1">{t('dashboard.feedback.status.alreadySubmitted')}</p>
                    <p className="text-sm text-gray-700">
                      {t('dashboard.feedback.status.alreadySubmittedMessage')}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Previous Checks */}
      {feedbacks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.feedback.previousFeedbacks')}</h3>
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {t('dashboard.feedback.details.feedbackOf')} {formatDate(feedback.feedback_date)}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('dashboard.feedback.details.submittedOn')} {formatDate(feedback.created_at)}
                    </p>
                  </div>
                  {feedback.current_weight && (
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-gray-400">{t('dashboard.feedback.checkin.currentWeight')}</p>
                      <p className="text-xl font-bold text-gray-900 leading-tight">{feedback.current_weight} kg</p>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="px-4 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    { label: t('dashboard.feedback.checkin.energyLabel'), value: getEnergyLabel(feedback.energy_level), color: getStatusColor(feedback.energy_level, 'energy') },
                    { label: t('dashboard.feedback.checkin.workoutsLabel'), value: getWorkoutsLabel(feedback.workouts_completed), color: getStatusColor(feedback.workouts_completed, 'workouts') },
                    { label: t('dashboard.feedback.checkin.mealPlanLabel'), value: getMealPlanLabel(feedback.meal_plan_followed), color: getStatusColor(feedback.meal_plan_followed, 'meal') },
                    { label: t('dashboard.feedback.checkin.sleepLabel'), value: getSleepLabel(feedback.sleep_quality), color: getStatusColor(feedback.sleep_quality, 'sleep') },
                    { label: t('dashboard.feedback.checkin.discomfortLabel'), value: getDiscomfortLabel(feedback.physical_discomfort), color: getStatusColor(feedback.physical_discomfort, 'discomfort') },
                    { label: t('dashboard.feedback.checkin.motivationLabel'), value: getMotivationLabel(feedback.motivation_level), color: getStatusColor(feedback.motivation_level, 'motivation') },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${metric.color}`}>
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>

                {feedback.weekly_highlights && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-500 mb-1">{t('dashboard.feedback.checkin.weeklyHighlightsLabel')}</p>
                    <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{feedback.weekly_highlights}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {feedbacks.length === 0 && !feedbackStatus?.shouldShow && (
        <div className="text-center py-12">
          {React.createElement(FiMessageSquare as React.ComponentType<{ className?: string }>, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" })}
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {t('dashboard.feedback.noFeedbacks')}
          </h3>
          <p className="text-gray-500">
            {t('dashboard.feedback.noFeedbacksMessage')}
          </p>
        </div>
      )}
    </div>
  );
};

export default FeedbackTab;
