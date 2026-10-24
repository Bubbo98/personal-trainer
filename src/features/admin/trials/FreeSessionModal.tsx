import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiCopy, FiEdit3, FiMessageCircle } from 'react-icons/fi';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../../components/ui/Field';
import { Alert } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { copyText } from '../../../lib/clipboard';
import { useErrorMessage } from '../../../lib/errors';
import { adminKeys } from '../queries';
import { whatsappUrl } from './helpers';
import type { FreeSessionInput, Trial, TrialTemplate } from './types';

/** The link of a trial, ready to copy or send on WhatsApp. */
export const ShareLink = ({ url, phone, firstName }: { url: string; phone?: string | null; firstName?: string | null }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const whatsapp = whatsappUrl(phone);
  const message = t('trials.share.message', { name: firstName || '', url }).replace(/\s+,/, ',');

  return (
    <div className="space-y-3">
      <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t('trials.share.link')} className="w-full bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700" />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={<FiCopy className="w-4 h-4" aria-hidden />}
          onClick={async () => ((await copyText(url)) ? toast.success(t('trials.share.copied')) : toast.info(t('trials.share.notCopied')))}
        >
          {t('trials.share.copy')}
        </Button>
        {whatsapp && (
          <a
            href={`${whatsapp}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl font-medium bg-green-600 text-white hover:bg-green-700"
          >
            <FiMessageCircle className="w-4 h-4" aria-hidden />
            {t('trials.share.whatsapp')}
          </a>
        )}
      </div>
    </div>
  );
};

/** New free session: pick the template, add who it is for, get the link. */
const FreeSessionModal = ({ templates, onClose }: { templates: TrialTemplate[]; onClose: () => void }) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FreeSessionInput>({ templateId: templates[0]?.id ?? 0, firstName: '', lastName: '', email: '', phone: '', notes: '' });
  const set = <K extends keyof FreeSessionInput>(key: K, value: FreeSessionInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const create = useMutation({
    mutationFn: (input: FreeSessionInput) => adminApi.post<{ trial: Trial; loginUrl: string }>('/admin/trials', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.trials }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim() });
  };

  if (create.data) {
    const { trial, loginUrl } = create.data;
    return (
      <Modal title={t('trials.free.createdTitle')} onClose={onClose}>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">{t('trials.free.createdHint')}</p>
          <ShareLink url={loginUrl} phone={trial.phone} firstName={trial.firstName} />
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to={`/admin/trials/${trial.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            >
              <FiEdit3 className="w-4 h-4" aria-hidden />
              {t('trials.free.customize')}
            </Link>
            <Button onClick={onClose}>{t('trials.free.done')}</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t('trials.free.title')} onClose={onClose} dismissible={!create.isPending}>
      <form onSubmit={submit} className="px-5 py-4 space-y-4">
        {templates.length === 0 ? (
          <Alert kind="warning">{t('trials.free.noTemplates')}</Alert>
        ) : (
          <SelectField label={t('trials.free.template')} value={form.templateId} onChange={(e) => set('templateId', Number(e.target.value))} data-autofocus>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {t(`trials.discipline.${template.discipline}`)}
              </option>
            ))}
          </SelectField>
        )}
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t('trials.fields.firstName')} autoComplete="off" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          <TextField label={t('trials.fields.lastName')} autoComplete="off" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </div>
        <TextField
          label={t('trials.fields.phone')}
          hint={t('trials.free.phoneHint')}
          type="tel"
          autoComplete="off"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="+39 333 123 4567"
        />
        <TextField label={t('trials.fields.email')} type="email" autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <TextAreaField label={t('trials.fields.notes')} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        {create.isError && <Alert kind="error">{errorMessage(create.error)}</Alert>}
        <p className="text-xs text-gray-500">{t('trials.free.daysHint')}</p>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={create.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" fullWidth loading={create.isPending} disabled={templates.length === 0}>
            {t('trials.free.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FreeSessionModal;
