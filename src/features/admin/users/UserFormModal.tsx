import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { Checkbox, SelectField, TextField } from '../../../components/ui/Field';
import type { AdminUser, CreateUserInput, Trainer, UpdateUserInput } from '../types';

type Props =
  | { mode: 'create'; trainers: Trainer[]; defaultTrainerId: number; saving: boolean; onSubmit: (input: CreateUserInput) => void; onClose: () => void }
  | { mode: 'edit'; user: AdminUser; trainers: Trainer[]; saving: boolean; onSubmit: (input: UpdateUserInput) => void; onClose: () => void };

/** Create or edit a client. */
const UserFormModal = (props: Props) => {
  const { t } = useTranslation('admin');
  const editing = props.mode === 'edit' ? props.user : null;
  const [form, setForm] = useState({
    username: '',
    firstName: editing?.firstName ?? '',
    lastName: editing?.lastName ?? '',
    email: editing?.email ?? '',
    isPaying: editing ? Boolean(editing.isPaying) : true,
    checkinExempt: Boolean(editing?.checkinExempt),
    trainerId: editing?.trainerId ?? (props.mode === 'create' ? props.defaultTrainerId : 1),
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const common = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      isPaying: form.isPaying,
      trainerId: form.trainerId,
    };
    if (props.mode === 'create') props.onSubmit({ ...common, username: form.username.trim() });
    else props.onSubmit({ ...common, checkinExempt: form.checkinExempt });
  };

  return (
    <Modal
      title={props.mode === 'create' ? t('users.form.createTitle') : t('users.form.editTitle')}
      onClose={props.onClose}
      dismissible={!props.saving}
    >
      <form onSubmit={submit} className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('users.form.firstName')} required autoComplete="off" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} data-autofocus />
          <TextField label={t('users.form.lastName')} required autoComplete="off" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </div>

        {props.mode === 'create' ? (
          <TextField
            label={t('users.form.username')}
            hint={t('users.form.usernameHint')}
            required
            autoComplete="off"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
          />
        ) : (
          <p className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600">
            <strong>{t('users.form.username')}:</strong> {props.user.username}
          </p>
        )}

        <TextField
          label={t('users.form.email')}
          hint={t('users.form.emailHint')}
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="email@example.com"
        />

        <SelectField label={t('users.form.trainer')} value={form.trainerId} onChange={(e) => set('trainerId', Number(e.target.value))}>
          {props.trainers.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {trainer.name}
            </option>
          ))}
        </SelectField>

        <div className="space-y-3 py-1">
          <Checkbox label={t('users.form.paying')} checked={form.isPaying} onChange={(e) => set('isPaying', e.target.checked)} />
          {props.mode === 'edit' && (
            <Checkbox label={t('users.form.checkinExempt')} checked={form.checkinExempt} onChange={(e) => set('checkinExempt', e.target.checked)} />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={props.onClose} disabled={props.saving}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" fullWidth loading={props.saving}>
            {props.mode === 'create' ? t('users.form.create') : t('actions.saveChanges')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
