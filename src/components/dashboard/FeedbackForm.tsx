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
  discomfortDetails: string;
  muscularZones: string[];
  muscularNotes: string;
  articularZones: string[];
  articularNotes: string;
  motivationLevel: "very_high" | "good" | "medium" | "low" | "";
  weeklyHighlights: string;
  currentWeight: string;
}

const MUSCULAR_ZONES = [
  "Collo", "Spalla", "Petto", "Schiena alta", "Lombare", "Addome",
  "Bicipite", "Tricipite", "Avambraccio", "Gluteo", "Quadricipite",
  "Femorali", "Polpaccio", "Tibiale"
];

const ARTICULAR_ZONES = [
  "Cervicale", "Spalla", "Gomito", "Polso", "Colonna",
  "Anca", "Ginocchio", "Caviglia", "Piede"
];

interface FeedbackFormProps {
  onSubmit: (data: FeedbackFormData) => Promise<void>;
  initialData?: Partial<FeedbackFormData>;
  isLoading?: boolean;
}

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const OptionButton: React.FC<OptionButtonProps> = ({ selected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all duration-150 ${
      selected
        ? "border-gray-900 bg-gray-900 text-white"
        : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
    }`}
  >
    {children}
  </button>
);

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
    discomfortDetails: initialData?.discomfortDetails || "",
    muscularZones: initialData?.muscularZones || [],
    muscularNotes: initialData?.muscularNotes || "",
    articularZones: initialData?.articularZones || [],
    articularNotes: initialData?.articularNotes || "",
    motivationLevel: initialData?.motivationLevel || "",
    weeklyHighlights: initialData?.weeklyHighlights || "",
    currentWeight: initialData?.currentWeight || "",
  });

  const [hasDiscomfort, setHasDiscomfort] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (
      !formData.energyLevel ||
      !formData.workoutsCompleted ||
      !formData.mealPlanFollowed ||
      !formData.sleepQuality ||
      !formData.motivationLevel ||
      !formData.currentWeight
    ) {
      setValidationError(t("dashboard.feedback.checkin.validationError"));
      return;
    }

    const physicalDiscomfort = !hasDiscomfort
      ? "none"
      : (formData.muscularZones.length > 0 || formData.articularZones.length > 0)
        ? "significant"
        : "minor";

    try {
      await onSubmit({ ...formData, physicalDiscomfort });
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Form header */}
      <div className="px-5 py-5 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">
          {t("dashboard.feedback.formTitle")}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{t("dashboard.feedback.formSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
        {/* Q1 — Energia */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            1. {t("dashboard.feedback.checkin.energyLevel")}
          </p>
          <div className="space-y-2">
            {[
              { value: "high", label: t("dashboard.feedback.checkin.energyOptions.high") },
              { value: "medium", label: t("dashboard.feedback.checkin.energyOptions.medium") },
              { value: "low", label: t("dashboard.feedback.checkin.energyOptions.low") },
            ].map((o) => (
              <OptionButton
                key={o.value}
                selected={formData.energyLevel === o.value}
                onClick={() => handleChange("energyLevel", o.value)}
              >
                {o.label}
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Q2 — Allenamenti */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            2. {t("dashboard.feedback.checkin.workoutsCompleted")}
          </p>
          <div className="space-y-2">
            {[
              { value: "all", label: t("dashboard.feedback.checkin.workoutsOptions.all") },
              { value: "almost_all", label: t("dashboard.feedback.checkin.workoutsOptions.almost_all") },
              { value: "few_or_none", label: t("dashboard.feedback.checkin.workoutsOptions.few_or_none") },
            ].map((o) => (
              <OptionButton
                key={o.value}
                selected={formData.workoutsCompleted === o.value}
                onClick={() => handleChange("workoutsCompleted", o.value)}
              >
                {o.label}
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Q3 — Piano alimentare */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            3. {t("dashboard.feedback.checkin.mealPlanFollowed")}
          </p>
          <div className="space-y-2">
            {[
              { value: "completely", label: t("dashboard.feedback.checkin.mealPlanOptions.completely") },
              { value: "mostly", label: t("dashboard.feedback.checkin.mealPlanOptions.mostly") },
              { value: "sometimes", label: t("dashboard.feedback.checkin.mealPlanOptions.sometimes") },
              { value: "no", label: t("dashboard.feedback.checkin.mealPlanOptions.no") },
            ].map((o) => (
              <OptionButton
                key={o.value}
                selected={formData.mealPlanFollowed === o.value}
                onClick={() => handleChange("mealPlanFollowed", o.value)}
              >
                {o.label}
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Q4 — Sonno */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            4. {t("dashboard.feedback.checkin.sleepQuality")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "excellent", label: t("dashboard.feedback.checkin.sleepOptions.excellent") },
              { value: "good", label: t("dashboard.feedback.checkin.sleepOptions.good") },
              { value: "fair", label: t("dashboard.feedback.checkin.sleepOptions.fair") },
              { value: "poor", label: t("dashboard.feedback.checkin.sleepOptions.poor") },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleChange("sleepQuality", o.value)}
                className={`px-3 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ${
                  formData.sleepQuality === o.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q5 — Dolori */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            5. {t("dashboard.feedback.checkin.physicalDiscomfort")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setHasDiscomfort(false);
                setFormData(prev => ({ ...prev, muscularZones: [], muscularNotes: "", articularZones: [], articularNotes: "" }));
              }}
              className={`px-3 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ${
                !hasDiscomfort
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
              }`}
            >
              {t("dashboard.feedback.checkin.discomfortNo")}
            </button>
            <button
              type="button"
              onClick={() => setHasDiscomfort(true)}
              className={`px-3 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ${
                hasDiscomfort
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
              }`}
            >
              {t("dashboard.feedback.checkin.discomfortYes")}
            </button>
          </div>

          {hasDiscomfort && (
            <div className="space-y-4 mt-2">
              {/* Muscolare */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💪</span>
                  <span className="text-sm font-semibold text-gray-800">{t("dashboard.feedback.checkin.muscularTitle")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MUSCULAR_ZONES.map((zone) => {
                    const selected = formData.muscularZones.includes(zone);
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          muscularZones: selected
                            ? prev.muscularZones.filter(z => z !== zone)
                            : [...prev.muscularZones, zone]
                        }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selected
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-600 border-gray-300"
                        }`}
                      >
                        {t(`dashboard.feedback.checkin.muscularZones.${zone}`, zone)}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={formData.muscularNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, muscularNotes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                  placeholder={t("dashboard.feedback.checkin.discomfortNotesPlaceholder")}
                />
              </div>

              {/* Articolare */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🦴</span>
                  <span className="text-sm font-semibold text-gray-800">{t("dashboard.feedback.checkin.articularTitle")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ARTICULAR_ZONES.map((zone) => {
                    const selected = formData.articularZones.includes(zone);
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          articularZones: selected
                            ? prev.articularZones.filter(z => z !== zone)
                            : [...prev.articularZones, zone]
                        }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selected
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-600 border-gray-300"
                        }`}
                      >
                        {t(`dashboard.feedback.checkin.articularZones.${zone}`, zone)}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={formData.articularNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, articularNotes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                  placeholder={t("dashboard.feedback.checkin.discomfortNotesPlaceholder")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Q6 — Motivazione */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            6. {t("dashboard.feedback.checkin.motivationLevel")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "very_high", label: t("dashboard.feedback.checkin.motivationOptions.very_high") },
              { value: "good", label: t("dashboard.feedback.checkin.motivationOptions.good") },
              { value: "medium", label: t("dashboard.feedback.checkin.motivationOptions.medium") },
              { value: "low", label: t("dashboard.feedback.checkin.motivationOptions.low") },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleChange("motivationLevel", o.value)}
                className={`px-3 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ${
                  formData.motivationLevel === o.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q7 — Note settimanali */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            7. {t("dashboard.feedback.checkin.weeklyHighlights")}{" "}
            <span className="text-xs font-normal text-gray-400">
              {t("dashboard.feedback.checkin.weightOptional")}
            </span>
          </p>
          <textarea
            value={formData.weeklyHighlights}
            onChange={(e) => handleChange("weeklyHighlights", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent text-sm"
            placeholder={t("dashboard.feedback.checkin.weeklyHighlightsPlaceholder")}
          />
        </div>

        {/* Q8 — Peso */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            8. {t("dashboard.feedback.checkin.currentWeight")}
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={formData.currentWeight}
              onChange={(e) => handleChange("currentWeight", e.target.value)}
              className="w-36 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent text-lg font-semibold"
              placeholder="00.0"
            />
            <span className="text-gray-600 font-medium">kg</span>
          </div>
        </div>

        {/* Errore validazione */}
        {validationError && (
          <div className="mx-5 my-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {validationError}
          </div>
        )}

        {/* Submit */}
        <div className="px-5 py-5">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base font-semibold"
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
          <p className="text-xs text-gray-400 text-center mt-3">
            {t("dashboard.feedback.form.closingMessage")}
          </p>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;
