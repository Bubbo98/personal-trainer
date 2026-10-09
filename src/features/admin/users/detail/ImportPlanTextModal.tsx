import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import Button from '../../../../components/ui/Button';
import { TextAreaField } from '../../../../components/ui/Field';
import Modal from '../../../../components/ui/Modal';
import { adminApi } from '../../../../lib/api';
import { useErrorMessage } from '../../../../lib/errors';
import type { fromParsed } from './planEditor';

type ParsedDays = Parameters<typeof fromParsed>[0];

export interface PlanTextError {
  line: number;
  text: string;
  reason: 'columns' | 'beforeDay' | 'duplicateDay' | 'missingField' | 'empty' | 'tooLong';
}

/** Paste the plan Claude writes as text: either every line is read, or nothing is imported and the bad lines are listed. */
const ImportPlanTextModal = ({ onImport, onClose }: { onImport: (days: ParsedDays) => void; onClose: () => void }) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const [text, setText] = useState('');

  const read = useMutation({
    mutationFn: () => adminApi.post<{ days: ParsedDays; errors: PlanTextError[] }>('/workout/admin/parse-text', { text }),
    onSuccess: ({ days, errors }) => {
      if (!errors.length) onImport(days);
    },
  });
  const errors = read.data?.errors ?? [];

  return (
    <Modal
      title={t('plan.importTitle')}
      onClose={onClose}
      size="xl"
      dismissible={!read.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={read.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button loading={read.isPending} disabled={!text.trim()} onClick={() => read.mutate()}>
            {read.isPending ? t('plan.importing') : t('plan.importAction')}
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-4">
        <TextAreaField
          label={t('plan.importLabel')}
          hint={t('plan.importHint')}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            read.reset();
          }}
          rows={14}
          spellCheck={false}
          data-autofocus
          className="[&_textarea]:font-mono [&_textarea]:text-sm"
        />
        {read.isError && (
          <p role="alert" className="text-sm text-red-600">
            {errorMessage(read.error)}
          </p>
        )}
        {errors.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
            <p className="font-semibold text-red-800 mb-2">{t('plan.importErrorsTitle')}</p>
            <ul className="space-y-2">
              {errors.map((error, i) => (
                <li key={i} className="text-red-700">
                  {error.line > 0 && <span className="font-semibold">{t('plan.importErrorLine', { line: error.line })}: </span>}
                  {t(`plan.importErrors.${error.reason}`)}
                  {error.text && <code className="block mt-0.5 text-xs text-red-900 break-all">{error.text}</code>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportPlanTextModal;
