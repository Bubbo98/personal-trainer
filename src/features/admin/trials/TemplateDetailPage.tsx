import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiEdit3, FiTrash2 } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { adminKeys, useTrialTemplates } from '../queries';
import { rangeLabel } from './helpers';
import PlanTabs from './PlanTabs';
import TemplateFormModal from './TemplateFormModal';
import type { TemplateInput } from './types';

/** /admin/trials/templates/:templateId — a template's settings and its plan. */
const TemplateDetailPage = () => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const { templateId } = useParams<{ templateId: string }>();
  const templates = useTrialTemplates();
  const [editing, setEditing] = useState(false);
  const id = Number(templateId);

  const update = useMutation({
    mutationFn: (input: TemplateInput) => adminApi.put(`/admin/trial-templates/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.trialTemplates });
      setEditing(false);
      toast.success(t('trials.templates.saved'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => adminApi.delete(`/admin/trial-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.trialTemplates });
      toast.success(t('trials.templates.deleted'));
      navigate('/admin/trials/templates');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (templates.isPending) return <LoadingState />;
  if (templates.isError) return <ErrorState message={errorMessage(templates.error)} onRetry={() => templates.refetch()} />;

  const template = templates.data.find((x) => x.id === id);
  const back = (
    <Link to="/admin/trials/templates" className="p-2 hover:bg-gray-100 rounded-xl" aria-label={t('trials.templates.back')} title={t('trials.templates.back')}>
      <FiArrowLeft className="w-6 h-6" aria-hidden />
    </Link>
  );
  if (!template) {
    return (
      <div className="flex items-center gap-4">
        {back}
        <p className="text-gray-600">{t('trials.templates.notFound')}</p>
      </div>
    );
  }

  const askRemove = async () => {
    if (await confirm({ title: t('trials.templates.deleteTitle'), message: t('trials.templates.deleteMessage', { name: template.name }), confirmLabel: t('actions.delete'), danger: true })) {
      remove.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {back}
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-sm text-gray-600">
              {[
                t(`trials.discipline.${template.discipline}`),
                template.online ? t('trials.templates.onlineRange', { range: rangeLabel(template, t('trials.templates.anyScore')) }) : t('trials.templates.gymOnly'),
              ].join(' · ')}
            </p>
            {template.description && <p className="text-sm text-gray-500 mt-1">{template.description}</p>}
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="secondary" icon={<FiEdit3 className="w-4 h-4" aria-hidden />} onClick={() => setEditing(true)}>
            {t('actions.edit')}
          </Button>
          <Button variant="danger" icon={<FiTrash2 className="w-4 h-4" aria-hidden />} onClick={askRemove} loading={remove.isPending}>
            {t('actions.delete')}
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">{t('trials.templates.planHint')}</p>
      <PlanTabs userId={template.userId} name={template.name} />

      {editing && <TemplateFormModal template={template} saving={update.isPending} onSubmit={(input) => update.mutate(input)} onClose={() => setEditing(false)} />}
    </div>
  );
};

export default TemplateDetailPage;
