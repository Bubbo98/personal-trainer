import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiCalendar } from 'react-icons/fi';
import { BOOKING_PATH } from '../lib/services';

/** Public pages that get the bar: not the booking page itself, the legal pages, the client area or the admin. */
const PAGES = ['/', '/about', '/services', '/contact'];

/** Phones: the free consultation is always one tap away (the spacer keeps the footer readable). */
const StickyBookingBar = () => {
  const { t } = useTranslation('public');
  const { pathname } = useLocation();
  if (!PAGES.includes(pathname.replace(/(.)\/$/, '$1'))) return null;

  return (
    <>
      <div className="h-20 sm:hidden bg-gray-900" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden p-3 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        <Link to={BOOKING_PATH} className="flex items-center justify-center gap-3 w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-lg">
          <FiCalendar className="w-5 h-5" aria-hidden />
          {t('home.stickyCta')}
        </Link>
      </div>
    </>
  );
};

export default StickyBookingBar;
