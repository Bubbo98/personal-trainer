import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import { onCookieSettingsOpen, saveConsent, useConsent } from '../lib/consent';

// Client only (false while prerendering and hydrating): the prerendered pages don't know the visitor's choice
const noSubscription = () => () => {};

/** Pages of the client area and the admin: no ads there, so no banner. */
const PRIVATE_AREA = /^\/(dashboard|admin)(\/|$)/;

const Toggle = ({ label, text, checked, onChange, disabled }: { label: string; text: string; checked: boolean; onChange?: (value: boolean) => void; disabled?: boolean }) => {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-t border-gray-100">
      <div>
        <label htmlFor={id} className="font-semibold text-gray-900">
          {label}
        </label>
        <p className="text-sm text-gray-600">{text}</p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-5 w-5 flex-shrink-0 accent-gray-900 disabled:opacity-60"
      />
    </div>
  );
};

/**
 * Cookie banner (Garante Privacy guidelines, 2021): rejecting is as easy as accepting,
 * closing with the X rejects, optional cookies stay off until chosen. Reopened from the footer.
 */
const CookieBanner = () => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const consent = useConsent();
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);
  const [reopened, setReopened] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const titleId = useId();

  useEffect(
    () =>
      onCookieSettingsOpen(() => {
        setAnalytics(consent?.analytics ?? false);
        setMarketing(consent?.marketing ?? false);
        setCustomizing(true);
        setReopened(true);
      }),
    [consent],
  );

  const open = mounted && (reopened || (!consent && !PRIVATE_AREA.test(pathname)));
  if (!open) return null;

  const choose = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setReopened(false);
    setCustomizing(false);
  };
  const button = 'flex-1 px-4 py-3 rounded-xl font-semibold transition-colors text-sm sm:text-base';

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-6 relative">
        <button
          type="button"
          onClick={() => choose({ analytics: false, marketing: false })}
          aria-label={t('cookies.close')}
          title={t('cookies.close')}
          className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-900 rounded-lg"
        >
          <FiX className="w-5 h-5" aria-hidden />
        </button>
        <h2 id={titleId} className="text-lg font-bold text-gray-900 pr-10 mb-2">
          {t('cookies.title')}
        </h2>
        <p className="text-sm text-gray-700 mb-4">
          {t('cookies.text')}{' '}
          <Link to="/cookie-policy" className="underline font-medium text-gray-900">
            {t('cookies.policy')}
          </Link>
        </p>

        {customizing && (
          <div className="mb-4">
            <Toggle label={t('cookies.necessary')} text={t('cookies.necessaryText')} checked disabled />
            <Toggle label={t('cookies.analytics')} text={t('cookies.analyticsText')} checked={analytics} onChange={setAnalytics} />
            <Toggle label={t('cookies.marketing')} text={t('cookies.marketingText')} checked={marketing} onChange={setMarketing} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button type="button" onClick={() => choose({ analytics: false, marketing: false })} className={`${button} bg-gray-100 text-gray-900 hover:bg-gray-200`}>
            {t('cookies.reject')}
          </button>
          {customizing ? (
            <button type="button" onClick={() => choose({ analytics, marketing })} className={`${button} bg-gray-100 text-gray-900 hover:bg-gray-200`}>
              {t('cookies.save')}
            </button>
          ) : (
            <button type="button" onClick={() => setCustomizing(true)} className={`${button} bg-gray-100 text-gray-900 hover:bg-gray-200`}>
              {t('cookies.customize')}
            </button>
          )}
          <button type="button" onClick={() => choose({ analytics: true, marketing: true })} className={`${button} bg-gray-900 text-white hover:bg-gray-800`}>
            {t('cookies.acceptAll')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default CookieBanner;
