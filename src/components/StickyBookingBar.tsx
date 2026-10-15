import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiCalendar } from 'react-icons/fi';
import { BOOKING_PATH, CALENDAR_ID } from '../lib/services';

/** Public pages that get the bar: not the booking page itself, the legal pages, the client area or the admin. */
const PAGES = ['/', '/about', '/services', '/contact', '/coaching-online'];
/** Pages with their own calendar: the bar scrolls to it instead of leaving. */
const OWN_CALENDAR = ['/coaching-online'];

/** Phones: the free consultation is always one tap away (the spacer keeps the footer readable). */
const StickyBookingBar = () => {
  const { t } = useTranslation('public');
  const { pathname } = useLocation();
  const page = pathname.replace(/(.)\/$/, '$1');
  if (!PAGES.includes(page)) return null;
  const className = 'flex items-center justify-center gap-3 w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-lg';
  const content = (
    <>
      <FiCalendar className="w-5 h-5" aria-hidden />
      {t('home.stickyCta')}
    </>
  );

  return (
    <>
      <div className="h-20 sm:hidden bg-gray-900" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden p-3 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        {OWN_CALENDAR.includes(page) ? (
          <a href={`#${CALENDAR_ID}`} className={className}>
            {content}
          </a>
        ) : (
          <Link to={BOOKING_PATH} className={className}>
            {content}
          </Link>
        )}
      </div>
    </>
  );
};

export default StickyBookingBar;
