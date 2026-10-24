import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { Checkbox, SelectField, TextAreaField, TextField } from '../../../components/ui/Field';
import { DISCIPLINES, type Discipline, type TemplateInput, type TrialTemplate } from './types';

const toNumber = (value: string) => (value.trim() === '' ? null : Number(value));

/** Create or edit a trial template (its plan is edited on the template's page). */
const TemplateFormModal = ({
  template,
  saving,
  onSubmit,
  onClose,
}: {
  template?: TrialTemplate;
  saving: boolean;
  onSubmit: (input: TemplateInput) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState({
    name: template?.name ?? '',
    discipline: template?.discipline ?? ('gym' as Discipline),
    description: template?.description ?? '',
    online: template?.online ?? false,
    minScore: template?.minScore?.toString() ?? '',
    maxScore: template?.maxScore?.toString() ?? '',
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const min = toNumber(form.minScore);
  const max = toNumber(form.maxScore);
  const rangeError = min !== null && max !== null && min > max ? t('trials.templates.form.rangeError') : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (rangeError) return;
    onSubmit({ name: form.name.trim(), discipline: form.discipline, description: form.description.trim(), online: form.online, minScore: min, maxScore: max });
  };

  return (
    <Modal title={template ? t('trials.templates.form.editTitle') : t('trials.templates.form.createTitle')} onClose={onClose} dismissible={!saving}>
      <form onSubmit={submit} className="px-5 py-4 space-y-4">
        <TextField
          label={t('trials.templates.form.name')}
          hint={t('trials.templates.form.nameHint')}
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          data-autofocus
        />
        <SelectField label={t('trials.templates.form.discipline')} value={form.discipline} onChange={(e) => set('discipline', e.target.value as Discipline)}>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {t(`trials.discipline.${d}`)}
            </option>
          ))}
        </SelectField>
        <TextAreaField label={t('trials.templates.form.description')} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />

        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <Checkbox label={t('trials.templates.form.online')} checked={form.online} onChange={(e) => set('online', e.target.checked)} />
          {form.online && (
            <>
              <p className="text-xs text-gray-500">{t('trials.templates.form.rangeHint')}</p>
              <div className="grid grid-cols-2 gap-4">
                <TextField label={t('trials.templates.form.minScore')} type="number" step={1} value={form.minScore} onChange={(e) => set('minScore', e.target.value)} />
                <TextField
                  label={t('trials.templates.form.maxScore')}
                  type="number"
                  step={1}
                  value={form.maxScore}
                  onChange={(e) => set('maxScore', e.target.value)}
                  error={rangeError}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" fullWidth loading={saving}>
            {template ? t('actions.saveChanges') : t('trials.templates.form.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TemplateFormModal;
