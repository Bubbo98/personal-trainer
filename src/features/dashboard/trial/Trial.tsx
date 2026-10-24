import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiClock, FiMessageCircle, FiPhone } from 'react-icons/fi';
import { CONTACT } from '../../../config';
import { formatDate } from '../../../lib/format';
import type { TrialSession } from '../types';
import { trialDaysLeft } from './trialDays';

const whatsappHref = (text: string) => `https://wa.me/${CONTACT.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

const ContactButtons = ({ dark }: { dark?: boolean }) => {
  const { t } = useTranslation('dashboard');
  const secondary = dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50';
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsappHref(t('trial.whatsappMessage'))}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700"
      >
        <FiMessageCircle className="w-4 h-4" aria-hidden />
        {t('trial.whatsapp')}
      </a>
      <a href={`tel:${CONTACT.phone}`} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${secondary}`}>
        <FiPhone className="w-4 h-4" aria-hidden />
        {CONTACT.phoneDisplay}
      </a>
      <Link to="/coaching-online" className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${secondary}`}>
        {t('trial.discoverCoaching')}
        <FiArrowRight className="w-4 h-4" aria-hidden />
      </Link>
    </div>
  );
};

/** Top of the dashboard during a trial: days left and how to continue. */
export const TrialBanner = ({ trial }: { trial: TrialSession }) => {
  const { t } = useTranslation('dashboard');
  const days = trialDaysLeft(trial);
  return (
    <section className="mb-6 bg-gray-900 text-white rounded-2xl p-5 sm:p-6 space-y-4" aria-label={t('trial.label')}>
      <div className="flex items-start gap-3">
        <FiClock className="w-6 h-6 flex-shrink-0 mt-0.5 text-gray-300" aria-hidden />
        <div>
          <p className="text-lg font-semibold">{days <= 1 ? t('trial.lastDay') : t('trial.daysLeft', { count: days })}</p>
          <p className="text-sm text-gray-300 mt-1">{t('trial.until', { date: formatDate(trial.expiresAt, 'long') })}</p>
          <p className="text-sm text-gray-300 mt-2">{t('trial.intro')}</p>
        </div>
      </div>
      <ContactButtons dark />
    </section>
  );
};

/** The link of an ended trial: what's next. */
export const TrialOver = () => {
  const { t } = useTranslation('dashboard');
  return (
    <div className="text-center py-12 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('trial.overTitle')}</h1>
      <p className="text-gray-600">{t('trial.overMessage')}</p>
      <div className="flex justify-center">
        <ContactButtons />
      </div>
    </div>
  );
};
