import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle } from 'react-icons/fi';
import { Checkbox } from './ui/Field';

/**
 * The notice on the use of a trial plan (a generic plan, see a doctor first, use at your own risk),
 * with its acceptance box: at the online signup and at the first opening of the trial dashboard.
 * The full text is in the terms of service.
 */
export const TrialNoticeCheck = ({ checked, onChange, error }: { checked: boolean; onChange: (checked: boolean) => void; error?: string | null }) => {
  const { t } = useTranslation('common');
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="flex items-center gap-2 font-semibold text-amber-900">
        <FiAlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden />
        {t('trialNotice.title')}
      </p>
      <p className="text-sm text-amber-900/90 leading-relaxed">{t('trialNotice.text')}</p>
      <Link to="/terms-of-service" target="_blank" className="inline-block text-sm text-amber-900 underline">
        {t('trialNotice.terms')}
      </Link>
      <div>
        <Checkbox label={t('trialNotice.accept')} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {error && (
          <p className="text-xs text-red-600 mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
