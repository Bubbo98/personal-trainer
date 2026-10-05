import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiSend } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/States';
import { inputClass } from '../../../components/ui/Field';
import { ARTICULAR_ZONES, MUSCULAR_ZONES, parseWeight, type Zone } from './checkin';
import { ANSWER_OPTIONS, type Answer, type AnswerKind, type CheckinSubmission } from '../types';


type Answers = { [K in Exclude<AnswerKind, 'discomfort'>]: Answer<K> | '' };

interface FormState extends Answers {
  hasDiscomfort: boolean;
  muscularZones: Zone[];
  muscularNotes: string;
  articularZones: Zone[];
  articularNotes: string;
  highlights: string;
  weight: string;
}

const INITIAL: FormState = {
  energy: '',
  workouts: '',
  mealPlan: '',
  sleep: '',
  motivation: '',
  hasDiscomfort: false,
  muscularZones: [],
  muscularNotes: '',
  articularZones: [],
  articularNotes: '',
  highlights: '',
  weight: '',
};

const choiceClass = (selected: boolean) =>
  `w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-colors ${
    selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
  }`;

/** One question: a radio group styled as big buttons. */
function Question<K extends Exclude<AnswerKind, 'discomfort'>>({
  number,
  kind,
  value,
  onChange,
  columns,
}: {
  number: number;
  kind: K;
  value: Answer<K> | '';
  onChange: (value: Answer<K>) => void;
  columns?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const name = `checkin-${kind}`;
  return (
    <fieldset className="px-5 py-5">
      <legend className="text-sm font-semibold text-gray-900 mb-3">
        {number}. {t(`checkin.form.${kind}`)}
      </legend>
      <div className={columns ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
        {(ANSWER_OPTIONS[kind] as readonly Answer<K>[]).map((option) => (
          <label key={option} className={`${choiceClass(value === option)} cursor-pointer block`}>
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
            {t(`checkin.answers.${kind}.${option}` as 'checkin.answers.energy.high')}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const ZonePicker = ({
  title,
  icon,
  zones,
  selected,
  onToggle,
  notes,
  onNotes,
}: {
  title: string;
  icon: ReactNode;
  zones: readonly Zone[];
  selected: Zone[];
  onToggle: (zone: Zone) => void;
  notes: string;
  onNotes: (notes: string) => void;
}) => {
  const { t } = useTranslation('dashboard');
  return (
    <fieldset className="border border-gray-200 rounded-xl p-4 space-y-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-gray-800">
        <span aria-hidden>{icon}</span>
        {title}
      </legend>
      <div className="flex flex-wrap gap-2">
        {zones.map((zone) => {
          const on = selected.includes(zone);
          return (
            <button
              key={zone}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(zone)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {t(`checkin.zones.${zone}`)}
            </button>
          );
        })}
      </div>
      <textarea
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
        rows={2}
        maxLength={500}
        aria-label={`${title}: ${t('checkin.form.zonesNotes')}`}
        placeholder={t('checkin.form.zonesNotes')}
        className={`${inputClass} text-sm`}
      />
    </fieldset>
  );
};

interface CheckinFormProps {
  /** Name and email of the client, sent with the answers. */
  identity: { firstName: string; lastName: string; email: string };
  onSubmit: (submission: CheckinSubmission) => Promise<unknown>;
  submitting: boolean;
}

/** The weekly check-in questionnaire. */
const CheckinForm = ({ identity, onSubmit, submitting }: CheckinFormProps) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((f) => ({ ...f, [field]: value }));
  const toggleZone = (field: 'muscularZones' | 'articularZones', zone: Zone) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(zone) ? f[field].filter((z) => z !== zone) : [...f[field], zone] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const { energy, workouts, mealPlan, sleep, motivation } = form;
    if (!energy || !workouts || !mealPlan || !sleep || !motivation || !form.weight.trim()) {
      setError(t('checkin.form.missingAnswers'));
      return;
    }
    const weight = parseWeight(form.weight);
    if (weight === null) {
      setError(t('checkin.form.weightInvalid'));
      return;
    }

    const anyZone = form.muscularZones.length > 0 || form.articularZones.length > 0;
    try {
      await onSubmit({
        ...identity,
        energyLevel: energy,
        workoutsCompleted: workouts,
        mealPlanFollowed: mealPlan,
        sleepQuality: sleep,
        motivationLevel: motivation,
        physicalDiscomfort: !form.hasDiscomfort ? 'none' : anyZone ? 'significant' : 'minor',
        muscularZones: form.hasDiscomfort ? form.muscularZones : [],
        muscularNotes: form.hasDiscomfort ? form.muscularNotes.trim() : '',
        articularZones: form.hasDiscomfort ? form.articularZones : [],
        articularNotes: form.hasDiscomfort ? form.articularNotes.trim() : '',
        weeklyHighlights: form.highlights.trim(),
        currentWeight: String(weight),
      });
      setSent(true);
    } catch {
      setError(t('checkin.form.failed'));
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg text-center" role="status">
        <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('checkin.form.thanksTitle')}</h3>
        <p className="text-gray-600">{t('checkin.form.thanksMessage')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-5 py-5 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900">{t('checkin.form.title')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('checkin.form.subtitle')}</p>
      </div>

      <form onSubmit={submit} noValidate className="divide-y divide-gray-100">
        <Question number={1} kind="energy" value={form.energy} onChange={(v) => set('energy', v)} />
        <Question number={2} kind="workouts" value={form.workouts} onChange={(v) => set('workouts', v)} />
        <Question number={3} kind="mealPlan" value={form.mealPlan} onChange={(v) => set('mealPlan', v)} />
        <Question number={4} kind="sleep" value={form.sleep} onChange={(v) => set('sleep', v)} columns />

        <fieldset className="px-5 py-5">
          <legend className="text-sm font-semibold text-gray-900 mb-3">5. {t('checkin.form.discomfort')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {[false, true].map((yes) => (
              <label key={String(yes)} className={`${choiceClass(form.hasDiscomfort === yes)} cursor-pointer text-center`}>
                <input
                  type="radio"
                  name="checkin-discomfort"
                  checked={form.hasDiscomfort === yes}
                  onChange={() => set('hasDiscomfort', yes)}
                  className="sr-only"
                />
                {yes ? t('checkin.form.discomfortYes') : t('checkin.form.discomfortNo')}
              </label>
            ))}
          </div>
          {form.hasDiscomfort && (
            <div className="space-y-4 mt-4">
              <ZonePicker
                title={t('checkin.form.muscular')}
                icon="💪"
                zones={MUSCULAR_ZONES}
                selected={form.muscularZones}
                onToggle={(zone) => toggleZone('muscularZones', zone)}
                notes={form.muscularNotes}
                onNotes={(notes) => set('muscularNotes', notes)}
              />
              <ZonePicker
                title={t('checkin.form.articular')}
                icon="🦴"
                zones={ARTICULAR_ZONES}
                selected={form.articularZones}
                onToggle={(zone) => toggleZone('articularZones', zone)}
                notes={form.articularNotes}
                onNotes={(notes) => set('articularNotes', notes)}
              />
            </div>
          )}
        </fieldset>

        <Question number={6} kind="motivation" value={form.motivation} onChange={(v) => set('motivation', v)} columns />

        <div className="px-5 py-5">
          <label htmlFor="checkin-highlights" className="block text-sm font-semibold text-gray-900 mb-3">
            7. {t('checkin.form.highlights')} <span className="text-xs font-normal text-gray-400">({t('common:common.optional')})</span>
          </label>
          <textarea
            id="checkin-highlights"
            value={form.highlights}
            onChange={(e) => set('highlights', e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t('checkin.form.highlightsPlaceholder')}
            className={`${inputClass} text-sm`}
          />
        </div>

        <div className="px-5 py-5">
          <label htmlFor="checkin-weight" className="block text-sm font-semibold text-gray-900 mb-3">
            8. {t('checkin.form.weight')}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="checkin-weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={form.weight}
              onChange={(e) => set('weight', e.target.value)}
              className={`${inputClass} w-36 text-lg font-semibold`}
              placeholder="72.5"
            />
            <span className="text-gray-600 font-medium">{t('checkin.form.weightUnit')}</span>
          </div>
        </div>

        <div className="px-5 py-5 space-y-3">
          {error && <Alert kind="error">{error}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={submitting} icon={<FiSend className="w-5 h-5" aria-hidden />}>
            {submitting ? t('checkin.form.sending') : t('checkin.form.submit')}
          </Button>
          <p className="text-xs text-gray-400 text-center">{t('checkin.form.closing')}</p>
        </div>
      </form>
    </div>
  );
};

export default CheckinForm;
