import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiCalendar, FiFileText } from 'react-icons/fi';
import DaysTab from '../users/detail/DaysTab';
import PlanPdfPanel from '../users/detail/PlanPdfPanel';
import WorkoutPlanPanel from '../users/detail/WorkoutPlanPanel';

const TABS = [
  { id: 'plan', icon: FiActivity },
  { id: 'days', icon: FiCalendar },
  { id: 'pdf', icon: FiFileText },
] as const;

type Tab = (typeof TABS)[number]['id'];

/** The plan of a template or of a trial account, with the same editors as a client's ("?tab=" in the URL). */
const PlanTabs = ({ userId, name }: { userId: number; name: string }) => {
  const { t } = useTranslation('admin');
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some((x) => x.id === params.get('tab')) ? (params.get('tab') as Tab) : 'plan';

  return (
    <div className="space-y-6">
      <nav aria-label={t('trials.planTabs.label')} className="border-b border-gray-200 overflow-x-auto">
        <ul className="flex gap-4 sm:gap-8 w-max min-w-full">
          {TABS.map(({ id, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setParams({ tab: id }, { replace: true })}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  tab === id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {t(`trials.planTabs.${id}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === 'plan' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <WorkoutPlanPanel userId={userId} userName={name} />
        </div>
      )}
      {tab === 'days' && <DaysTab userId={userId} />}
      {tab === 'pdf' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <PlanPdfPanel userId={userId} userName={name} trial />
        </div>
      )}
    </div>
  );
};

export default PlanTabs;
