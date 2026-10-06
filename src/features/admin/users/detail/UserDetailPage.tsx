import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiArrowLeft, FiBarChart2, FiCalendar, FiFileText, FiVideo } from 'react-icons/fi';
import { ErrorState, LoadingState } from '../../../../components/ui/States';
import { useErrorMessage } from '../../../../lib/errors';
import { useLinks, useUsers } from '../../queries';
import { displayName } from '../../types';
import BodyReportsPanel from './BodyReportsPanel';
import ExerciseVideoLinker from './ExerciseVideoLinker';
import PlanPdfPanel from './PlanPdfPanel';
import TrainingDaysEditor from './TrainingDaysEditor';
import UserVideosPanel from './UserVideosPanel';
import WorkoutPlanPanel from './WorkoutPlanPanel';

const TABS = [
  { id: 'days', icon: FiCalendar },
  { id: 'videos', icon: FiVideo },
  { id: 'pdf', icon: FiFileText },
  { id: 'plan', icon: FiActivity },
  { id: 'body', icon: FiBarChart2 },
] as const;

type Tab = (typeof TABS)[number]['id'];

/** Days: the exercise ↔ video links; the old days editor for plans without exercises (or on request). */
const DaysTab = ({ userId }: { userId: number }) => {
  const { t } = useTranslation('admin');
  const links = useLinks(userId);
  const [showOld, setShowOld] = useState(false);
  const hasPlan = links.data?.some((d) => d.exercises.length > 0);

  return (
    <>
      <ExerciseVideoLinker userId={userId} />
      {links.isPending ? null : hasPlan && !showOld ? (
        <button type="button" onClick={() => setShowOld(true)} className="text-xs text-gray-400 hover:text-gray-700 underline">
          {t('detail.showOldEditor')}
        </button>
      ) : (
        <>
          {hasPlan && (
            <button type="button" onClick={() => setShowOld(false)} className="mb-3 text-xs text-gray-400 hover:text-gray-700 underline">
              {t('detail.hideOldEditor')}
            </button>
          )}
          <TrainingDaysEditor userId={userId} />
        </>
      )}
    </>
  );
};

/** /admin/users/:userId — everything about one client; the tab lives in the URL (?tab=). */
const UserDetailPage = () => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const { userId } = useParams<{ userId: string }>();
  const [params, setParams] = useSearchParams();
  const users = useUsers();
  const id = Number(userId);
  const tab: Tab = TABS.some((x) => x.id === params.get('tab')) ? (params.get('tab') as Tab) : 'days';

  if (users.isPending) return <LoadingState />;
  if (users.isError) return <ErrorState message={errorMessage(users.error)} onRetry={() => users.refetch()} />;

  const user = users.data.find((u) => u.id === id);
  const back = (
    <Link to="/admin/users" className="p-2 hover:bg-gray-100 rounded-xl" aria-label={t('detail.back')} title={t('detail.back')}>
      <FiArrowLeft className="w-6 h-6" aria-hidden />
    </Link>
  );
  if (!user) {
    return (
      <div className="flex items-center gap-4">
        {back}
        <p className="text-gray-600">{t('detail.notFound')}</p>
      </div>
    );
  }
  const name = displayName(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {back}
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
          <p className="text-sm text-gray-600 break-all">{[user.username, user.email].filter(Boolean).join(' • ')}</p>
        </div>
      </div>

      <nav aria-label={t('detail.tabsLabel')} className="border-b border-gray-200 overflow-x-auto">
        <ul className="flex gap-4 sm:gap-8 w-max min-w-full">
          {TABS.map(({ id: tabId, icon: Icon }) => (
            <li key={tabId}>
              <button
                type="button"
                aria-current={tab === tabId ? 'page' : undefined}
                onClick={() => setParams({ tab: tabId }, { replace: true })}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  tab === tabId ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {t(`detail.tabs.${tabId}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === 'days' && <DaysTab userId={id} />}
      {tab === 'videos' && <UserVideosPanel userId={id} />}
      {tab === 'pdf' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <PlanPdfPanel userId={id} userName={name} />
        </div>
      )}
      {tab === 'plan' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <WorkoutPlanPanel userId={id} userName={name} />
        </div>
      )}
      {tab === 'body' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <BodyReportsPanel userId={id} userName={name} />
        </div>
      )}
    </div>
  );
};

export default UserDetailPage;
