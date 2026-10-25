import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiGlobe, FiLayers, FiPlus } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { adminKeys, useTrialQuestionnaire, useTrialTemplates } from '../queries';
import { missingDays, rangeGaps, rangeLabel } from './helpers';
import TemplateFormModal from './TemplateFormModal';
import { DISCIPLINES, type TemplateInput, type TrialTemplate } from './types';

/** Warnings about the online assignment: a discipline without templates, scores no range covers. */
const CoverageHints = ({ templates }: { templates: TrialTemplate[] }) => {
  const { t } = useTranslation('admin');
  const questionnaire = useTrialQuestionnaire();
  if (!questionnaire.data) return null;
  const hints = DISCIPLINES.flatMap((discipline) => {
    const gaps = rangeGaps(templates, questionnaire.data.questionnaire, discipline);
    const name = t(`trials.discipline.${discipline}`);
    if (!gaps.hasOnline) return [t('trials.templates.noOnline', { discipline: name })];
    const days = missingDays(templates, questionnaire.data.questionnaire, discipline);
    return [
      ...(days.length > 0 ? [t('trials.templates.missingDays', { discipline: name, days: days.join(', ') })] : []),
      ...(gaps.uncovered.length > 0 ? [t('trials.templates.uncovered', { discipline: name, scores: gaps.uncovered.join(', ') })] : []),
    ];
  });
  if (hints.length === 0) return null;
  return (
    <Alert kind="warning">
      <ul className="space-y-1">
        {hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>
    </Alert>
  );
};

/** /admin/trials/templates — the plans trials start from. */
const TemplatesList = () => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const templates = useTrialTemplates();
  const [creating, setCreating] = useState(false);

  const create = useMutation({
    mutationFn: (input: TemplateInput) => adminApi.post<{ template: TrialTemplate }>('/admin/trial-templates', input),
    onSuccess: ({ template }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.trialTemplates });
      setCreating(false);
      toast.success(t('trials.templates.created'));
      navigate(`/admin/trials/templates/${template.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (templates.isPending) return <LoadingState />;
  if (templates.isError) return <ErrorState message={errorMessage(templates.error)} onRetry={() => templates.refetch()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('trials.templates.title')}</h2>
          <p className="text-sm text-gray-600">{t('trials.templates.subtitle')}</p>
        </div>
        <Button onClick={() => setCreating(true)} icon={<FiPlus className="w-5 h-5" aria-hidden />}>
          {t('trials.templates.new')}
        </Button>
      </div>

      <CoverageHints templates={templates.data} />

      {templates.data.length === 0 ? (
        <EmptyState icon={<FiLayers className="w-10 h-10" aria-hidden />} title={t('trials.templates.empty')} message={t('trials.templates.emptyHint')} />
      ) : (
        DISCIPLINES.map((discipline) => {
          const list = templates.data.filter((x) => x.discipline === discipline);
          if (list.length === 0) return null;
          return (
            <section key={discipline} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t(`trials.discipline.${discipline}`)}</h3>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((template) => (
                  <li key={template.id}>
                    <Link to={`/admin/trials/templates/${template.id}`} className="block bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-4 space-y-2 h-full">
                      <p className="font-semibold text-gray-900">{template.name}</p>
                      {template.description && <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>}
                      <p className="text-xs text-gray-500">
                        {t('trials.templates.days', { count: template.dayCount })} · {t('trials.templates.counts', { exercises: template.exerciseCount, videos: template.videoCount })}
                      </p>
                      {template.online ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          <FiGlobe className="w-3 h-3" aria-hidden />
                          {t('trials.templates.onlineRange', { range: rangeLabel(template, t('trials.templates.anyScore')) })}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{t('trials.templates.gymOnly')}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {creating && <TemplateFormModal saving={create.isPending} onSubmit={(input) => create.mutate(input)} onClose={() => setCreating(false)} />}
    </div>
  );
};

export default TemplatesList;
