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
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({ user }) => {
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
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(t('dashboard.feedback.error'));
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const getNutritionLabel = (quality: string): string => {
    return t(`dashboard.feedback.form.nutritionOptions.${quality}`, quality);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('dashboard.feedback.loading')}</p>
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
        let totalDays = 0;
        let progressPercentage = 0;
        let targetDate = null;

        if (feedbackStatus.reason === 'too_soon' && feedbackStatus.pdfUpdatedAt) {
          const pdfDate = new Date(feedbackStatus.pdfUpdatedAt);
          const now = new Date();
          const oneWeekFromPdf = new Date(pdfDate.getTime() + (7 * 24 * 60 * 60 * 1000));
          targetDate = oneWeekFromPdf;
          daysRemaining = Math.ceil((oneWeekFromPdf.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          totalDays = 7;
          progressPercentage = Math.min(100, Math.max(0, ((7 - daysRemaining) / 7) * 100));
        } else if (feedbackStatus.reason === 'too_soon_since_last' && feedbackStatus.lastFeedbackAt) {
          const lastFeedbackDate = new Date(feedbackStatus.lastFeedbackAt);
          const now = new Date();
          const twoWeeksFromLast = new Date(lastFeedbackDate.getTime() + (14 * 24 * 60 * 60 * 1000));
          targetDate = twoWeeksFromLast;
          daysRemaining = Math.ceil((twoWeeksFromLast.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          totalDays = 14;
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
                        <p className="text-xs text-gray-600 mb-1">Prossimo feedback disponibile il:</p>
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

      {/* Previous Feedbacks */}
      {feedbacks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.feedback.previousFeedbacks')}</h3>
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {t('dashboard.feedback.details.feedbackOf')} {formatDate(feedback.feedback_date)}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {t('dashboard.feedback.details.submittedOn')} {formatDate(feedback.created_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">{t('dashboard.feedback.details.trainingSatisfaction')}:</p>
                    <p className="text-gray-900">{feedback.training_satisfaction}/10</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">{t('dashboard.feedback.details.motivationLevel')}:</p>
                    <p className="text-gray-900">{feedback.motivation_level}/10</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">{t('dashboard.feedback.details.nutritionQuality')}:</p>
                    <p className="text-gray-900">{getNutritionLabel(feedback.nutrition_quality)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">{t('dashboard.feedback.details.avgSleepHours')}:</p>
                    <p className="text-gray-900">{feedback.sleep_hours} ore</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">{t('dashboard.feedback.details.recoveryImproved')}:</p>
                    <p className="text-gray-900">{feedback.recovery_improved ? t('dashboard.feedback.form.yes') : t('dashboard.feedback.form.no')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">{t('dashboard.feedback.details.feelsSupported')}:</p>
                    <p className="text-gray-900">{feedback.feels_supported ? t('dashboard.feedback.form.yes') : t('dashboard.feedback.form.no')}</p>
                  </div>
                </div>

                {feedback.difficulties && (
                  <div className="mt-4">
                    <p className="text-gray-600 font-medium mb-1">{t('dashboard.feedback.details.difficultiesFound')}:</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{feedback.difficulties}</p>
                  </div>
                )}

                {feedback.support_improvement && (
                  <div className="mt-4">
                    <p className="text-gray-600 font-medium mb-1">{t('dashboard.feedback.details.improvementSuggestions')}:</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{feedback.support_improvement}</p>
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
