import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLinks } from '../../queries';
import ExerciseVideoLinker from './ExerciseVideoLinker';
import TrainingDaysEditor from './TrainingDaysEditor';

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

export default DaysTab;
