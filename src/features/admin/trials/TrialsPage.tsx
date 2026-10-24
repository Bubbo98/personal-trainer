import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PeopleList from './PeopleList';
import TrialDetailPage from './TrialDetailPage';
import TemplatesList from './TemplatesList';
import TemplateDetailPage from './TemplateDetailPage';
import QuestionnaireEditor from './QuestionnaireEditor';

const SECTIONS = [
  { to: '/admin/trials', label: 'trials.nav.people', end: true },
  { to: '/admin/trials/templates', label: 'trials.nav.templates', end: false },
  { to: '/admin/trials/questionnaire', label: 'trials.nav.questionnaire', end: false },
] as const;

/** /admin/trials/* — free sessions and online trials: people, plan templates, questionnaire. */
const TrialsPage = () => {
  const { t } = useTranslation('admin');
  return (
    <div className="space-y-6">
      <nav aria-label={t('trials.nav.label')} className="flex flex-wrap gap-2">
        {SECTIONS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-4 py-2 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
            }
          >
            {t(label)}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<PeopleList />} />
        <Route path="templates" element={<TemplatesList />} />
        <Route path="templates/:templateId" element={<TemplateDetailPage />} />
        <Route path="questionnaire" element={<QuestionnaireEditor />} />
        <Route path=":trialId" element={<TrialDetailPage />} />
        <Route path="*" element={<Navigate to="/admin/trials" replace />} />
      </Routes>
    </div>
  );
};

export default TrialsPage;
