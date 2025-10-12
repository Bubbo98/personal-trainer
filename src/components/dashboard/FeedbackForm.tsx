import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSend, FiCheckCircle } from 'react-icons/fi';

interface FeedbackFormData {
  firstName: string;
  lastName: string;
  email: string;
  trainingSatisfaction: number;
  motivationLevel: number;
  difficulties: string;
  nutritionQuality: 'ottima' | 'buona' | 'da_migliorare' | 'difficolta';
  sleepHours: number;
  recoveryImproved: boolean;
  feelsSupported: boolean;
  supportImprovement: string;
}

interface FeedbackFormProps {
  onSubmit: (data: FeedbackFormData) => Promise<void>;
  initialData?: Partial<FeedbackFormData>;
  isLoading?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, initialData, isLoading = false }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FeedbackFormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    trainingSatisfaction: initialData?.trainingSatisfaction || 5,
    motivationLevel: initialData?.motivationLevel || 5,
    difficulties: initialData?.difficulties || '',
    nutritionQuality: initialData?.nutritionQuality || 'buona',
    sleepHours: initialData?.sleepHours || 7,
    recoveryImproved: initialData?.recoveryImproved || true,
    feelsSupported: initialData?.feelsSupported || true,
    supportImprovement: initialData?.supportImprovement || ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleChange = (field: keyof FeedbackFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg text-center">
        <div className="flex justify-center mb-4">
          {React.createElement(FiCheckCircle as React.ComponentType<{ className?: string }>, { className: "w-16 h-16 text-green-500" })}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.feedback.form.thankYou')}</h3>
        <p className="text-gray-600 mb-4">
          {t('dashboard.feedback.form.submittedSuccess')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 lg:p-8 shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('dashboard.feedback.formTitle')}
        </h2>
        <p className="text-gray-600">
          {t('dashboard.feedback.formSubtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sezione 1 – Informazioni Generali */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
            🔹 {t('dashboard.feedback.form.generalInfo')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.feedback.form.firstName')} *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.feedback.form.lastName')} *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.feedback.form.email')} *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.feedback.form.feedbackDate')}
            </label>
            <input
              type="text"
              disabled
              value={new Date().toLocaleDateString('it-IT')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          </div>
        </div>

        {/* Sezione 2 – Andamento dell'allenamento */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
            🔹 {t('dashboard.feedback.form.trainingProgress')}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.feedback.form.trainingSatisfaction')} *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.trainingSatisfaction}
                onChange={(e) => handleChange('trainingSatisfaction', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">
                {formData.trainingSatisfaction}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 ({t('dashboard.feedback.form.notAtAll')})</span>
              <span>10 ({t('dashboard.feedback.form.veryMuch')})</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.feedback.form.motivationLevel')} *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.motivationLevel}
                onChange={(e) => handleChange('motivationLevel', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">
                {formData.motivationLevel}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 ({t('dashboard.feedback.form.notAtAll')})</span>
              <span>10 ({t('dashboard.feedback.form.veryMuch')})</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashboard.feedback.form.difficulties')}
            </label>
            <textarea
              value={formData.difficulties}
              onChange={(e) => handleChange('difficulties', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              placeholder={t('dashboard.feedback.form.difficultiesPlaceholder')}
            />
          </div>
        </div>

        {/* Sezione 3 – Alimentazione e recupero */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
            🔹 {t('dashboard.feedback.form.nutritionRecovery')}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.feedback.form.nutritionQuality')} *
            </label>
            <div className="space-y-2">
              {[
                { value: 'ottima', label: t('dashboard.feedback.form.nutritionOptions.ottima') },
                { value: 'buona', label: t('dashboard.feedback.form.nutritionOptions.buona') },
                { value: 'da_migliorare', label: t('dashboard.feedback.form.nutritionOptions.da_migliorare') },
                { value: 'difficolta', label: t('dashboard.feedback.form.nutritionOptions.difficolta') }
              ].map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="nutritionQuality"
                    value={option.value}
                    checked={formData.nutritionQuality === option.value}
                    onChange={(e) => handleChange('nutritionQuality', e.target.value)}
                    className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                  />
                  <span className="text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.feedback.form.sleepHours')} *
            </label>
            <input
              type="number"
              min="0"
              max="24"
              required
              value={formData.sleepHours}
              onChange={(e) => handleChange('sleepHours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.feedback.form.recoveryImproved')} *
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="recoveryImproved"
                  checked={formData.recoveryImproved === true}
                  onChange={() => handleChange('recoveryImproved', true)}
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="text-gray-700">{t('dashboard.feedback.form.yes')}</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="recoveryImproved"
                  checked={formData.recoveryImproved === false}
                  onChange={() => handleChange('recoveryImproved', false)}
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="text-gray-700">{t('dashboard.feedback.form.no')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sezione 4 – Comunicazione e supporto */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
            🔹 {t('dashboard.feedback.form.supportCommunication')}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.feedback.form.feelsSupported')} *
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="feelsSupported"
                  checked={formData.feelsSupported === true}
                  onChange={() => handleChange('feelsSupported', true)}
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="text-gray-700">{t('dashboard.feedback.form.yes')}</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="feelsSupported"
                  checked={formData.feelsSupported === false}
                  onChange={() => handleChange('feelsSupported', false)}
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="text-gray-700">{t('dashboard.feedback.form.no')}</span>
              </label>
            </div>
          </div>

          {!formData.feelsSupported && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.feedback.form.supportImprovement')}
              </label>
              <textarea
                value={formData.supportImprovement}
                onChange={(e) => handleChange('supportImprovement', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                placeholder={t('dashboard.feedback.form.supportImprovementPlaceholder')}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('dashboard.feedback.form.sending')}</span>
              </>
            ) : (
              <>
                {React.createElement(FiSend as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                <span>{t('dashboard.feedback.form.submit')}</span>
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 text-center mt-4">
            {t('dashboard.feedback.form.closingMessage')}
          </p>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;
