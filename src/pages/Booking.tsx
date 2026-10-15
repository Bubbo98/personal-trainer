import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BookingCalendar from '../components/BookingCalendar';
import { CONTACT } from '../config';
import { usePageMeta } from '../lib/usePageMeta';
import { CALENDAR_ID } from '../lib/services';

const Booking = () => {
  const { t } = useTranslation(['public', 'common']);
  const { hash } = useLocation();
  usePageMeta({ title: t('common:meta.booking.title'), description: t('common:meta.booking.description'), path: '/booking' });

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
          <BookingCalendar />

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
