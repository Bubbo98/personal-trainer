import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import Cal from '@calcom/embed-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Constants
const BOOKING_IMAGE_SRC = '/prenotaLaConsulenza.jpg';
const BOOKING_IMAGE_ALT = 'Prenota la tua consulenza';
const CAL_LINK = 'joshua-maurizio-cproiv/consulenza';
const CALENDAR_ID = 'booking-calendar';
const PHONE_NUMBER = '+393282062823';
const PHONE_DISPLAY = '3282062823';

// Types
interface BookingPageProps {}

interface BookingImageProps {
  src: string;
  alt: string;
  className?: string;
}

interface CalendarWidgetProps {
  calLink: string;
  id?: string;
}

interface DirectContactProps {
  phoneNumber: string;
  displayNumber: string;
}

// Components
const BookingImage: React.FC<BookingImageProps> = ({ src, alt, className = "" }) => (
  <div className={`bg-gray-200 rounded-3xl overflow-hidden ${className}`}>
    <img
      src={src}
      alt={alt}
      className="w-full h-auto object-cover"
      loading="eager"
      decoding="async"
    />
  </div>
);

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ calLink, id = CALENDAR_ID }) => (
  <div id={id} className="bg-white rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg">
    <Cal
      calLink={calLink}
      style={{ width: "100%", height: "600px", overflow: "scroll" }}
      className="lg:h-[900px]"
      config={{
        layout: 'month_view',
        theme: 'light'
      }}
    />
  </div>
);

const DirectContact: React.FC<DirectContactProps> = ({ phoneNumber, displayNumber }) => {
  const { t } = useTranslation();

  return (
    <div className="mt-16 text-center">
      <p className="text-base xs:text-lg sm:text-xl text-gray-700">
        {t('booking.directContact')}{' '}
        <a
          href={`tel:${phoneNumber}`}
          className="font-bold text-gray-900 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 rounded"
          aria-label={`Call ${displayNumber}`}
        >
          {displayNumber}
        </a>
      </p>
    </div>
  );
};

const Booking: React.FC<BookingPageProps> = () => {
  const { t } = useTranslation();

  // Component styles
  const pageClassName = 'min-h-screen bg-gray-50';
  const mainClassName = 'pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20';
  const containerClassName = 'max-w-2xl lg:max-w-5xl xl:max-w-7xl mx-auto';
  const titleClassName = 'text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900';
  const descriptionClassName = 'text-base xs:text-lg sm:text-xl text-gray-600 leading-relaxed';

  // Memoized description content
  const descriptionContent = useMemo(() => (
    <>
      {t('booking.description')}
      <br />
      {t('booking.note')}
    </>
  ), [t]);

  return (
    <div className={pageClassName}>
      <Helmet>
        <title>{t('pages.booking.title')}</title>
      </Helmet>
      <Header />

      <main className={mainClassName}>
        <div className={containerClassName}>
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className={titleClassName}>
              {t('booking.title')}
            </h1>
          </div>

          {/* Booking Image */}
          <div className="mb-12 max-w-xs md:max-w-sm mx-auto">
            <BookingImage
              src={BOOKING_IMAGE_SRC}
              alt={BOOKING_IMAGE_ALT}
            />
          </div>

          {/* Description */}
          <div className="mb-8 text-center">
            <p className={descriptionClassName}>
              {descriptionContent}
            </p>
          </div>

          {/* Calendar Widget */}
          <CalendarWidget calLink={CAL_LINK} />

          {/* Direct Contact */}
          <DirectContact
            phoneNumber={PHONE_NUMBER}
            displayNumber={PHONE_DISPLAY}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Booking;