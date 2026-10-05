import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheck } from 'react-icons/fi';
import { inputClass } from '../../../components/ui/Field';
import VideoCard from '../components/VideoCard';
import type { Exercise, Video } from '../types';
import { joinWeights, splitWeights, suggestedWeights, type Draft } from '../workout';
import type { SaveState } from './useAutosave';

interface ExerciseCardProps {
  exercise: Exercise;
  position: number;
  videos: Video[];
  draft: Draft;
  status?: SaveState;
  onChange: (draft: Draft) => void;
  onBlur: () => void;
  onRetry: () => void;
  onPlay: (video: Video) => void;
}

const smallInput = inputClass.replace('px-4 py-2.5', 'px-3 py-2').replace('rounded-xl', 'rounded-lg') + ' text-sm';

/** One exercise of the day: prescription, its videos and this week's weight/reps inputs. */
const ExerciseCard = ({ exercise, position, videos, draft, status, onChange, onBlur, onRetry, onPlay }: ExerciseCardProps) => {
  const { t } = useTranslation('dashboard');
  const id = useId();
  const slots = Math.max(1, exercise.weight_slots ?? 1);
  const suggested = suggestedWeights(exercise.notes, slots);
  const weights = splitWeights(draft.weight, slots);
  const placeholder = (i: number) => (suggested[i] ? t('workout.example', { value: suggested[i] }) : slots === 1 ? t('workout.example', { value: 70 }) : '');

  const setWeight = (index: number, value: string) => {
    const next = [...weights];
    next[index] = value;
    onChange({ ...draft, weight: slots === 1 ? value : joinWeights(next, slots) });
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400 w-5 text-right" aria-hidden>
          {position}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 leading-snug">{exercise.name}</h4>
            <span className="flex-shrink-0 mt-0.5 text-xs" aria-live="polite">
              {status === 'saving' && <span className="text-gray-400">{t('workout.saving')}</span>}
              {status === 'saved' && (
                <span className="flex items-center gap-1 font-medium text-green-600">
                  <FiCheck className="w-3.5 h-3.5" aria-hidden />
                  {t('workout.saved')}
                </span>
              )}
              {status === 'error' && (
                <button type="button" onClick={onRetry} className="font-medium text-red-600 underline">
                  {t('workout.saveFailed')}
                </button>
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {exercise.sets && <Chip>{t('workout.sets', { value: exercise.sets })}</Chip>}
            {exercise.reps && <Chip>{t('workout.reps', { value: exercise.reps })}</Chip>}
            {exercise.rest && <Chip>⏱ {exercise.rest}</Chip>}
          </div>
          {exercise.notes && <p className="text-xs text-gray-400 mt-1 italic">{exercise.notes}</p>}
        </div>
      </div>

      {videos.length > 0 && (
        <div className="space-y-2 mb-3">
          {videos.map((video) => (
            <VideoCard key={video.assignmentId ?? video.id} video={video} onPlay={onPlay} variant="row" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {slots === 1 ? (
          <div>
            <label htmlFor={`${id}-w0`} className="block text-xs text-gray-500 mb-1">
              {t('workout.weight')}
            </label>
            <input
              id={`${id}-w0`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={weights[0]}
              onChange={(e) => setWeight(0, e.target.value)}
              onBlur={onBlur}
              placeholder={placeholder(0)}
              className={smallInput}
            />
          </div>
        ) : (
          <fieldset className="col-span-2">
            <legend className="block text-xs text-gray-500 mb-1">{t('workout.weights')}</legend>
            <div className={`grid gap-2 ${slots === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {weights.map((weight, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={t('workout.weightN', { number: i + 1 })}
                  value={weight}
                  onChange={(e) => setWeight(i, e.target.value)}
                  onBlur={onBlur}
                  placeholder={placeholder(i)}
                  className={smallInput}
                />
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <label htmlFor={`${id}-reps`} className="block text-xs text-gray-500 mb-1">
            {t('workout.repsDone')}
          </label>
          <input
            id={`${id}-reps`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft.repsDone}
            onChange={(e) => onChange({ ...draft, repsDone: e.target.value })}
            onBlur={onBlur}
            placeholder={exercise.reps || '—'}
            className={smallInput}
          />
        </div>
      </div>
    </div>
  );
};

const Chip = ({ children }: { children: ReactNode }) => (
  <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">{children}</span>
);

export default ExerciseCard;
