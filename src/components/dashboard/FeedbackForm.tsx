import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiSend, FiCheckCircle } from "react-icons/fi";

interface FeedbackFormData {
  firstName: string;
  lastName: string;
  email: string;
  energyLevel: "high" | "medium" | "low" | "";
  workoutsCompleted: "all" | "almost_all" | "few_or_none" | "";
  mealPlanFollowed: "completely" | "mostly" | "sometimes" | "no" | "";
  sleepQuality: "excellent" | "good" | "fair" | "poor" | "";
  physicalDiscomfort: "none" | "minor" | "significant" | "";
  motivationLevel: "very_high" | "good" | "medium" | "low" | "";
  weeklyHighlights: string;
  currentWeight: string;
}

interface FeedbackFormProps {
  onSubmit: (data: FeedbackFormData) => Promise<void>;
  initialData?: Partial<FeedbackFormData>;
  isLoading?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FeedbackFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    energyLevel: initialData?.energyLevel || "",
    workoutsCompleted: initialData?.workoutsCompleted || "",
    mealPlanFollowed: initialData?.mealPlanFollowed || "",
    sleepQuality: initialData?.sleepQuality || "",
    physicalDiscomfort: initialData?.physicalDiscomfort || "",
    motivationLevel: initialData?.motivationLevel || "",
    weeklyHighlights: initialData?.weeklyHighlights || "",
    currentWeight: initialData?.currentWeight || "",
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate required fields
    if (
      !formData.energyLevel ||
      !formData.workoutsCompleted ||
      !formData.mealPlanFollowed ||
      !formData.sleepQuality ||
      !formData.physicalDiscomfort ||
      !formData.motivationLevel ||
      !formData.currentWeight
    ) {
      setValidationError(t("dashboard.feedback.checkin.validationError"));
      return;
    }

    try {
      await onSubmit(formData);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting check:", error);
    }
  };

  const handleChange = (field: keyof FeedbackFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg text-center">
        <div className="flex justify-center mb-4">
          {React.createElement(
            FiCheckCircle as React.ComponentType<{ className?: string }>,
            { className: "w-16 h-16 text-green-500" },
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {t("dashboard.feedback.form.thankYou")}
        </h3>
        <p className="text-gray-600 mb-4">
          {t("dashboard.feedback.form.submittedSuccess")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 lg:p-8 shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("dashboard.feedback.formTitle")}
        </h2>
        <p className="text-gray-600">{t("dashboard.feedback.formSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Hidden fields for user info */}
        <input type="hidden" value={formData.firstName} />
        <input type="hidden" value={formData.lastName} />
        <input type="hidden" value={formData.email} />

        {/* Question 1 - Energy Level */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            1. {t("dashboard.feedback.checkin.energyLevel")}
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              {
                value: "high",
                label: t("dashboard.feedback.checkin.energyOptions.high"),
              },
              {
                value: "medium",
                label: t("dashboard.feedback.checkin.energyOptions.medium"),
              },
              {
                value: "low",
                label: t("dashboard.feedback.checkin.energyOptions.low"),
              },
            ].map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name="energyLevel"
                  value={option.value}
                  checked={formData.energyLevel === option.value}
                  onChange={(e) => handleChange("energyLevel", e.target.value)}
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="ml-2 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 2 - Workouts Completed */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            2. {t("dashboard.feedback.checkin.workoutsCompleted")}
          </label>
          <div className="space-y-2">
            {[
              {
                value: "all",
                label: t("dashboard.feedback.checkin.workoutsOptions.all"),
              },
              {
                value: "almost_all",
                label: t(
                  "dashboard.feedback.checkin.workoutsOptions.almost_all",
                ),
              },
              {
                value: "few_or_none",
                label: t(
                  "dashboard.feedback.checkin.workoutsOptions.few_or_none",
                ),
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="workoutsCompleted"
                  value={option.value}
                  checked={formData.workoutsCompleted === option.value}
                  onChange={(e) =>
                    handleChange("workoutsCompleted", e.target.value)
                  }
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="ml-2 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 3 - Meal Plan Followed */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            3. {t("dashboard.feedback.checkin.mealPlanFollowed")}
          </label>
          <div className="space-y-2">
            {[
              {
                value: "completely",
                label: t(
                  "dashboard.feedback.checkin.mealPlanOptions.completely",
                ),
              },
              {
                value: "mostly",
                label: t("dashboard.feedback.checkin.mealPlanOptions.mostly"),
              },
              {
                value: "sometimes",
                label: t(
                  "dashboard.feedback.checkin.mealPlanOptions.sometimes",
                ),
              },
              {
                value: "no",
                label: t("dashboard.feedback.checkin.mealPlanOptions.no"),
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="mealPlanFollowed"
                  value={option.value}
                  checked={formData.mealPlanFollowed === option.value}
                  onChange={(e) =>
                    handleChange("mealPlanFollowed", e.target.value)
                  }
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="ml-2 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 4 - Sleep Quality */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            4. {t("dashboard.feedback.checkin.sleepQuality")}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {[
              {
                value: "excellent",
                label: t("dashboard.feedback.checkin.sleepOptions.excellent"),
              },
              {
                value: "good",
                label: t("dashboard.feedback.checkin.sleepOptions.good"),
              },
              {
                value: "fair",
                label: t("dashboard.feedback.checkin.sleepOptions.fair"),
              },
              {
                value: "poor",
                label: t("dashboard.feedback.checkin.sleepOptions.poor"),
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="sleepQuality"
                  value={option.value}
                  checked={formData.sleepQuality === option.value}
                  onChange={(e) => handleChange("sleepQuality", e.target.value)}
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="ml-2 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 5 - Physical Discomfort */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            5. {t("dashboard.feedback.checkin.physicalDiscomfort")}
          </label>
          <div className="space-y-2">
            {[
              {
                value: "none",
                label: t("dashboard.feedback.checkin.discomfortOptions.none"),
              },
              {
                value: "minor",
                label: t("dashboard.feedback.checkin.discomfortOptions.minor"),
              },
              {
                value: "significant",
                label: t(
                  "dashboard.feedback.checkin.discomfortOptions.significant",
                ),
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="physicalDiscomfort"
                  value={option.value}
                  checked={formData.physicalDiscomfort === option.value}
                  onChange={(e) =>
                    handleChange("physicalDiscomfort", e.target.value)
                  }
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="ml-2 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 6 - Motivation Level */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            6. {t("dashboard.feedback.checkin.motivationLevel")}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {[
              {
                value: "very_high",
                label: t(
                  "dashboard.feedback.checkin.motivationOptions.very_high",
                ),
              },
              {
                value: "good",
                label: t("dashboard.feedback.checkin.motivationOptions.good"),
              },
              {
                value: "medium",
                label: t("dashboard.feedback.checkin.motivationOptions.medium"),
              },
              {
                value: "low",
                label: t("dashboard.feedback.checkin.motivationOptions.low"),
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="motivationLevel"
                  value={option.value}
                  checked={formData.motivationLevel === option.value}
                  onChange={(e) =>
                    handleChange("motivationLevel", e.target.value)
                  }
                  className="w-4 h-4 text-gray-800 border-gray-300 focus:ring-gray-800"
                />
                <span className="ml-2 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 7 - Weekly Highlights */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            7. {t("dashboard.feedback.checkin.weeklyHighlights")}{" "}
            <span className="text-xs text-gray-500 pl-1">
              {t("dashboard.feedback.checkin.weightOptional")}
            </span>
          </label>
          <textarea
            value={formData.weeklyHighlights}
            onChange={(e) => handleChange("weeklyHighlights", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            placeholder={t(
              "dashboard.feedback.checkin.weeklyHighlightsPlaceholder",
            )}
          />
        </div>

        {/* Question 8 - Current Weight */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            8. {t("dashboard.feedback.checkin.currentWeight")}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={formData.currentWeight}
              onChange={(e) => handleChange("currentWeight", e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              placeholder={t("dashboard.feedback.checkin.weightPlaceholder")}
            />
            <span className="text-gray-600">kg</span>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {validationError}
          </div>
        )}

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
                <span>{t("dashboard.feedback.form.sending")}</span>
              </>
            ) : (
              <>
                {React.createElement(
                  FiSend as React.ComponentType<{ className?: string }>,
                  { className: "w-5 h-5" },
                )}
                <span>{t("dashboard.feedback.checkin.submit")}</span>
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 text-center mt-4">
            {t("dashboard.feedback.form.closingMessage")}
          </p>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;
