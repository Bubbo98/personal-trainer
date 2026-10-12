import { useEffect, useMemo } from 'react';
import { preconnect } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Cal, { getCalApi } from '@calcom/embed-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CONTACT } from '../config';
import { usePageMeta } from '../lib/usePageMeta';
import { getUtmParams, trackLead } from '../lib/tracking';

const CAL_LINK = 'joshua-maurizio-cproiv/consulenza';
const CALENDAR_ID = 'booking-calendar';

// One listener for the whole visit, however many times the page mounts
let leadListener = false;
function listenForBookings() {
  if (leadListener) return;
  leadListener = true;
  void getCalApi().then((cal) =>
    cal('on', {
      action: 'bookingSuccessfulV2',
      callback: (e: { detail: { data: { uid?: string } } }) => trackLead(e.detail.data.uid),
    }),
  );
}

const Booking = () => {
  const { t } = useTranslation(['public', 'common']);
  const { hash } = useLocation();
  usePageMeta({ title: t('common:meta.booking.title'), description: t('common:meta.booking.description'), path: '/booking' });
  preconnect('https://app.cal.com');
  // A new object would make the embed reload: built once, with the ad's utm_* so Cal.com records the source
  const calConfig = useMemo(() => ({ layout: 'month_view' as const, theme: 'light' as const, ...getUtmParams() }), []);

  useEffect(listenForBookings, []);

  // Links to /booking#booking-calendar land on the calendar
  useEffect(() => {
    if (hash !== `#${CALENDAR_ID}`) return;
    const timer = setTimeout(() => document.getElementById(CALENDAR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    return () => clearTimeout(timer);
  }, [hash]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20">
        <div className="max-w-2xl lg:max-w-5xl xl:max-w-7xl mx-auto">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-4">{t('booking.title')}</h1>

          <p className="mb-6 sm:mb-8 text-center text-base xs:text-lg sm:text-xl text-gray-600 leading-relaxed">{t('booking.description')}</p>

          {/* The calendar comes first: on phones it is the first thing under the title */}
          <section id={CALENDAR_ID} aria-label={t('booking.calendarLabel')} className="bg-white rounded-3xl p-2 sm:p-8 lg:p-12 shadow-lg scroll-mt-28">
            <Cal calLink={CAL_LINK} style={{ width: '100%', minHeight: '600px' }} config={calConfig} />
          </section>

          <p className="mt-12 text-center text-base xs:text-lg sm:text-xl text-gray-600 leading-relaxed">{t('booking.note')}</p>

          <img
            src="/prenotaLaConsulenza.webp"
            alt={t('booking.imageAlt')}
            width={384}
            height={576}
            decoding="async"
            loading="lazy"
            className="mt-12 max-w-xs md:max-w-sm mx-auto w-full h-auto rounded-3xl bg-gray-200"
          />

          <p className="mt-12 text-center text-base xs:text-lg sm:text-xl text-gray-700">
            {t('booking.directContact')}{' '}
            <a href={`tel:${CONTACT.phone}`} className="font-bold text-gray-900 hover:text-gray-700 transition-colors">
              {CONTACT.phoneDisplay}
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Booking;
