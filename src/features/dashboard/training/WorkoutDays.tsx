import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronDown } from 'react-icons/fi';
import { formatDate, weekStart } from '../../../lib/format';
import VideoCard from '../components/VideoCard';
import { useSaveLog } from '../queries';
import type { Exercise, ExerciseLog, TrainingDay, Video } from '../types';
import { buildPlanDays, initialDrafts, splitDayName, type Draft } from '../workout';
import ExerciseCard from './ExerciseCard';
import { useAutosave } from './useAutosave';

const EMPTY_DRAFT: Draft = { weight: '', repsDone: '' };

/** Collapsible day: dark header with number, name and count. */
export const DayPanel = ({
  number,
  name,
  count,
  defaultOpen,
  children,
}: {
  number: number;
  name: string;
  count: string;
  defaultOpen: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const { label, subtitle } = splitDayName(name);
  return (
    <section className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 hover:bg-gray-800 transition-colors"
        >
          <span className="flex items-center gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold text-white">
              {number}
            </span>
            <span className="text-left">
              <span className="block font-semibold text-white leading-tight">{label}</span>
              {subtitle && <span className="block text-xs text-gray-400 leading-tight">{subtitle}</span>}
            </span>
          </span>
          <span className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{count}</span>
            <FiChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </span>
        </button>
      </h3>
      {open && (
        <div id={panelId} className="bg-white p-3 space-y-2">
          {children}
        </div>
      )}
    </section>
  );
};

interface WorkoutDaysProps {
  exercises: Exercise[];
  logs: ExerciseLog[];
  trainingDays: TrainingDay[];
  onPlay: (video: Video) => void;
}

/**
 * The client's week: each day of the plan with its exercises, their videos and
 * weight inputs that save themselves, plus the day's other videos.
 */
const WorkoutDays = ({ exercises, logs, trainingDays, onPlay }: WorkoutDaysProps) => {
  const { t } = useTranslation('dashboard');
  // Fixed when the page opens: a session crossing Monday midnight keeps filling the week it showed
  const [week] = useState(weekStart);
  const [drafts, setDrafts] = useState(() => initialDrafts(exercises, logs, week));
  const saveLog = useSaveLog();
  const autosave = useAutosave<Draft>((exerciseId, draft) =>
    saveLog.mutateAsync({ exerciseId, weekStart: week, weight: draft.weight, repsDone: draft.repsDone }),
  );

  const days = buildPlanDays(exercises, trainingDays, (number) => t('workout.dayFallback', { number }));

  const update = (exerciseId: number, draft: Draft) => {
    setDrafts((current) => ({ ...current, [exerciseId]: draft }));
    autosave.change(exerciseId, draft);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <p className="text-sm text-gray-500 px-1">{t('workout.intro', { date: formatDate(week, 'long') })}</p>

      {days.map((day, index) => (
        <DayPanel
          key={day.number}
          number={day.number}
          name={day.name}
          defaultOpen={index === 0}
          count={
            day.exercises.length > 0
              ? t('workout.exerciseCount', { count: day.exercises.length })
              : t('workout.videoCount', { count: day.extras.length })
          }
        >
          {day.exercises.map((exercise, i) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              position={i + 1}
              videos={day.videosByExercise.get(exercise.id) ?? []}
              draft={drafts[exercise.id] ?? EMPTY_DRAFT}
              status={autosave.status[exercise.id]}
              onChange={(draft) => update(exercise.id, draft)}
              onBlur={() => autosave.flush(exercise.id)}
              onRetry={() => autosave.retry(exercise.id)}
              onPlay={onPlay}
            />
          ))}

          {day.extras.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {day.exercises.length > 0 ? t('workout.otherVideos') : t('workout.dayVideos')}
              </p>
              <div className="space-y-2">
                {day.extras.map((video) => (
                  <VideoCard key={video.assignmentId ?? video.id} video={video} onPlay={onPlay} variant="row" />
                ))}
              </div>
            </div>
          )}
        </DayPanel>
      ))}
    </div>
  );
};

export default WorkoutDays;
