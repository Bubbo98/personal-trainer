import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiCheckCircle, FiCheckSquare, FiLogOut, FiMessageSquare, FiMoreHorizontal, FiTrendingUp } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import Header from '../../components/Header';
import { Alert, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { usePageMeta } from '../../lib/usePageMeta';
import { useErrorMessage } from '../../lib/errors';
import { ApiError } from '../../lib/api';
import { daysUntil, formatDate, weekStart } from '../../lib/format';
import { BadgeDot, SubTabs } from './components/Badges';
import { worstBadge, type Badge } from './components/badge';
import VideoPlayerModal from './components/VideoPlayerModal';
import {
  dismissSeenNotifications,
  useCheckinStatus,
  useExercises,
  usePlanInfo,
  useSeenNotifications,
  useTrainingDays,
  useVideos,
  useWorkoutLogs,
} from './queries';
import type { SessionUser, Video } from './types';
import { useSession } from './useSession';
import { weightsPending } from './workout';
import WorkoutDays from './training/WorkoutDays';
import DayVideos from './training/DayVideos';
import VideoLibrary from './training/VideoLibrary';
import PlanCard from './training/PlanCard';
import WeightHistory from './progress/WeightHistory';
import BodyComposition from './progress/BodyComposition';
import CheckinSection from './checkin/CheckinSection';
import MoreSection from './more/MoreSection';
import ReviewSection from './review/ReviewSection';

// Top-level sections: bottom bar on phones, top bar on larger screens.
// 'reviews' has no nav entry: it's only reachable with the ?tab=reviews link of the review email.
type Section = 'training' | 'progress' | 'check' | 'more' | 'reviews';
type TrainingView = 'days' | 'videos' | 'plan';
type ProgressView = 'weights' | 'body';

const NAV: { id: Exclude<Section, 'reviews'>; icon: IconType }[] = [
  { id: 'training', icon: FiActivity },
  { id: 'progress', icon: FiTrendingUp },
  { id: 'check', icon: FiCheckSquare },
  { id: 'more', icon: FiMoreHorizontal },
];

const PAGE = 'min-h-screen bg-gray-50';
// Extra bottom padding on phones so content clears the fixed bottom bar
const MAIN = 'pt-28 sm:pt-40 px-4 sm:px-6 lg:px-16 pb-28 sm:pb-16 lg:pb-20';

const Shell = ({ children }: { children: ReactNode }) => (
  <div className={PAGE}>
    <Header />
    <main className={MAIN}>
      <div className="max-w-7xl mx-auto">{children}</div>
    </main>
  </div>
);

/** Days: the plan's exercises with weight inputs, or the day videos for plans without exercises. */
const DaysView = ({ onPlay, onShowVideos }: { onPlay: (video: Video) => void; onShowVideos: () => void }) => {
  const errorMessage = useErrorMessage();
  const exercises = useExercises();
  const logs = useWorkoutLogs();
  const days = useTrainingDays();
  const videos = useVideos();

  if (exercises.isError) return <ErrorState message={errorMessage(exercises.error)} onRetry={() => exercises.refetch()} />;
  if (days.isError) return <ErrorState message={errorMessage(days.error)} onRetry={() => days.refetch()} />;
  if (exercises.isPending || days.isPending) return <LoadingState />;

  if (exercises.data.length > 0) {
    if (logs.isError) return <ErrorState message={errorMessage(logs.error)} onRetry={() => logs.refetch()} />;
    if (logs.isPending) return <LoadingState />;
    return <WorkoutDays exercises={exercises.data} logs={logs.data} trainingDays={days.data} onPlay={onPlay} />;
  }
  if (days.data.length > 0) {
    return <DayVideos days={days.data} onPlay={onPlay} onShowAll={videos.data?.length ? onShowVideos : undefined} />;
  }
  // No plan structure at all: the whole library is the best we can show
  if (videos.isPending) return <LoadingState />;
  if (videos.isError) return <ErrorState message={errorMessage(videos.error)} onRetry={() => videos.refetch()} />;
  return <VideoLibrary videos={videos.data} onPlay={onPlay} />;
};

const VideosView = ({ onPlay }: { onPlay: (video: Video) => void }) => {
  const errorMessage = useErrorMessage();
  const videos = useVideos();
  if (videos.isPending) return <LoadingState />;
  if (videos.isError) return <ErrorState message={errorMessage(videos.error)} onRetry={() => videos.refetch()} />;
  return <VideoLibrary videos={videos.data} onPlay={onPlay} />;
};

/** Shows once the "your trainer read your check-in" notices, then dismisses them on the server. */
const TrainerSeenBanner = () => {
  const { t } = useTranslation('dashboard');
  const notifications = useSeenNotifications();
  const dismissed = useRef(false);
  const list = notifications.data ?? [];

  useEffect(() => {
    if (list.length > 0 && !dismissed.current) {
      dismissed.current = true;
      dismissSeenNotifications().catch(() => {
        /* shown again next time: harmless */
      });
    }
  }, [list.length]);

  if (list.length === 0) return null;
  return (
    <Alert kind="success" className="mb-6 border-2" icon={<FiCheckCircle className="w-8 h-8 text-green-500" aria-hidden />} title={t('banners.trainerSeenTitle')}>
      {list.length === 1 ? t('banners.trainerSeenOne', { date: formatDate(list[0].feedback_date) }) : t('banners.trainerSeenMany', { count: list.length })}
    </Alert>
  );
};

const Dashboard = ({ user, initialSection, onLogout }: { user: SessionUser; initialSection: Section | null; onLogout: () => void }) => {
  const { t } = useTranslation('dashboard');
  const toast = useToast();
  const checkin = useCheckinStatus();
  const plan = usePlanInfo();
  const exercises = useExercises();
  const logs = useWorkoutLogs();

  const checkRequired = checkin.data?.shouldShow === true;
  const [chosenSection, setChosenSection] = useState<Section>(initialSection ?? 'training');
  // While a check-in is due every other section is locked
  const section: Section = checkRequired ? 'check' : chosenSection;
  const [trainingView, setTrainingView] = useState<TrainingView>('days');
  const [progressView, setProgressView] = useState<ProgressView>('weights');
  const [playing, setPlaying] = useState<Video | null>(null);

  // Reminder dots: expired plan = alert, expiring within a week = warn, weights not logged this week = warn
  const daysLeft = plan.data && !plan.data.locked ? daysUntil(plan.data.expirationDate) : null;
  const planBadge: Badge = daysLeft === null ? null : daysLeft < 0 ? 'alert' : daysLeft < 7 ? 'warn' : null;
  const weightsBadge: Badge = exercises.data && logs.data && weightsPending(exercises.data, logs.data, weekStart()) ? 'warn' : null;
  const navBadge = (id: Section): Badge =>
    id === 'check' ? (checkRequired ? 'alert' : null) : id === 'training' && !checkRequired ? worstBadge(planBadge, weightsBadge) : null;

  const goTo = (id: Section) => {
    if (checkRequired && id !== 'check') return;
    setChosenSection(id);
    window.scrollTo({ top: 0 });
  };

  const name = user.firstName?.trim();

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{name ? t('welcomeName', { name }) : `${t('welcome')}!`}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors"
          aria-label={t('logout')}
        >
          <FiLogOut className="w-5 h-5" aria-hidden />
          <span className="hidden sm:inline">{t('logout')}</span>
        </button>
      </div>

      <TrainerSeenBanner />

      {checkRequired && (
        <Alert kind="warning" className="mb-6 border-2" icon={<FiMessageSquare className="w-8 h-8 text-orange-500" aria-hidden />} title={t('banners.checkRequiredTitle')}>
          {t('banners.checkRequiredMessage')}
        </Alert>
      )}

      {/* Section nav — larger screens (phones use the bottom bar) */}
      <nav aria-label={t('nav.label')} className="hidden sm:flex gap-1 bg-gray-200 p-1 rounded-xl mb-6">
        {NAV.map(({ id, icon: Icon }) => {
          const locked = checkRequired && id !== 'check';
          return (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              disabled={locked}
              title={locked ? t('nav.lockedHint') : undefined}
              aria-current={section === id ? 'page' : undefined}
              className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                section === id ? 'bg-white text-gray-900 shadow' : locked ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'
              } ${id === 'check' && checkRequired ? 'ring-2 ring-orange-400' : ''}`}
            >
              <Icon className="w-5 h-5" aria-hidden />
              <span>{t(`nav.${id}`)}</span>
              <BadgeDot badge={navBadge(id)} className="top-1 right-1" />
            </button>
          );
        })}
      </nav>

      {section === 'training' && (
        <SubTabs
          label={t('training.tabs.label')}
          active={trainingView}
          onChange={setTrainingView}
          items={[
            { id: 'days', label: t('training.tabs.days'), badge: weightsBadge },
            { id: 'videos', label: t('training.tabs.videos') },
            { id: 'plan', label: t('training.tabs.plan'), badge: planBadge },
          ]}
        />
      )}
      {section === 'progress' && (
        <SubTabs
          label={t('progress.tabs.label')}
          active={progressView}
          onChange={setProgressView}
          items={[
            { id: 'weights', label: t('progress.tabs.weights') },
            { id: 'body', label: t('progress.tabs.body') },
          ]}
        />
      )}

      <div>
        {section === 'reviews' && <ReviewSection />}
        {section === 'check' && (
          <CheckinSection
            user={user}
            onCompleted={() => {
              toast.success(t('checkin.form.thanksTitle'));
              setChosenSection('training');
            }}
          />
        )}
        {section === 'more' && <MoreSection hasPlan={Boolean(plan.data)} trainerId={user.trainerId} />}
        {section === 'progress' && (progressView === 'weights' ? <WeightHistory /> : <BodyComposition />)}
        {section === 'training' &&
          (trainingView === 'plan' ? (
            <PlanCard />
          ) : trainingView === 'videos' ? (
            <VideosView onPlay={setPlaying} />
          ) : (
            <DaysView onPlay={setPlaying} onShowVideos={() => setTrainingView('videos')} />
          ))}
      </div>

      {/* Bottom bar — phones only */}
      <nav aria-label={t('nav.label')} className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map(({ id, icon: Icon }) => {
            const locked = checkRequired && id !== 'check';
            return (
              <button
                key={id}
                type="button"
                onClick={() => goTo(id)}
                disabled={locked}
                aria-current={section === id ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  section === id ? 'text-gray-900' : locked ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6" aria-hidden />
                <span>{t(`nav.${id}`)}</span>
                <BadgeDot badge={navBadge(id)} className="top-1.5 left-1/2 ml-2" />
              </button>
            );
          })}
        </div>
      </nav>

      {playing && <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />}
    </>
  );
};

/** /dashboard and /dashboard/:token — the client area. */
const DashboardPage = () => {
  const { t } = useTranslation('dashboard');
  const { token } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const session = useSession(token);
  const [initialSection] = useState<Section | null>(() => (searchParams.get('tab') === 'reviews' ? 'reviews' : null));

  usePageMeta({ title: t('title'), noindex: true });

  // The login link must not stay in the address bar (history, screenshots…)
  useEffect(() => {
    if (token && session.isSuccess) navigate('/dashboard', { replace: true });
  }, [token, session.isSuccess, navigate]);

  if (session.isPending) {
    return (
      <Shell>
        <LoadingState label={t('loading')} />
      </Shell>
    );
  }

  if (session.isError) {
    const expired = session.error instanceof ApiError && session.error.code === 'PLAN_EXPIRED';
    const network = session.error instanceof ApiError && session.error.code === 'NETWORK';
    if (network) {
      return (
        <Shell>
          <ErrorState message={errorMessage(session.error)} onRetry={() => session.refetch()} />
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="text-center py-16 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{expired ? t('accessDenied.planExpiredTitle') : t('accessDenied.title')}</h1>
          <p className="text-gray-600 mb-8">{expired ? errorMessage(session.error) : t('accessDenied.message')}</p>
          <button type="button" onClick={() => navigate('/')} className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors">
            {t('accessDenied.backHome')}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Dashboard
        user={session.data}
        initialSection={initialSection}
        onLogout={() => {
          session.logout();
          navigate('/');
        }}
      />
    </Shell>
  );
};

export default DashboardPage;
