import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import Cal from '@calcom/embed-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Types
interface Service {
  id: string;
  title: string;
  description: string;
  image: string;
  calLink: string;
}

interface ServicesPageProps {}

interface ServiceButtonProps {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}

interface ServiceContentProps {
  service: Service;
  isMobile?: boolean;
}

interface CalendarIconProps {
  className?: string;
}

// Components
const CalendarIcon: React.FC<CalendarIconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
  </svg>
);

const ServiceButton: React.FC<ServiceButtonProps> = ({ service, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className="w-full bg-gray-900 text-white py-4 sm:py-6 px-6 sm:px-8 rounded-3xl hover:bg-gray-800 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
    aria-expanded={isSelected}
    aria-controls={`service-content-${service.id}`}
  >
    <h2 className="text-lg xs:text-xl sm:text-2xl lg:text-sm xl:text-base font-bold whitespace-nowrap overflow-hidden text-ellipsis">
      {service.title}
    </h2>
  </button>
);

const ServiceImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = "" }) => (
  <div className={`bg-gray-200 rounded-2xl overflow-hidden ${className}`}>
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
    />
  </div>
);

const ServiceDescription: React.FC<{ description: string; textSize?: string }> = ({
  description,
  textSize = "text-base sm:text-lg"
}) => (
  <div className="space-y-4">
    {description.split('\n').map((paragraph, index) => (
      <p key={index} className={`${textSize} text-gray-700 leading-relaxed`}>
        {paragraph}
      </p>
    ))}
  </div>
);

const BookingButton: React.FC<{
  service: Service;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ service, onClick, href, children, className = "" }) => {
  const baseClassName = `flex items-center space-x-3 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClassName}
        aria-label={`Book ${service.title} session`}
      >
        <CalendarIcon />
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={baseClassName}
      aria-label={`Scroll to booking section for ${service.title}`}
    >
      <CalendarIcon />
      {children}
    </button>
  );
};

const ServiceContent: React.FC<ServiceContentProps> = ({ service, isMobile = false }) => {
  const { t } = useTranslation();
  const textSize = isMobile ? "text-base sm:text-lg" : "text-base sm:text-lg lg:text-xl";
  const imageHeight = "h-80 sm:h-[450px]";
  const containerHeight = isMobile ? "" : "h-80 sm:h-[758px]";

  return (
    <div className={`bg-white rounded-3xl p-6 sm:p-8 shadow-lg space-y-6 overflow-hidden flex flex-col ${containerHeight}`}>
      <ServiceImage
        src={service.image}
        alt={service.title}
        className={`${imageHeight} max-w-2xl mx-auto flex-shrink-0`}
      />

      <div className="flex-1 flex flex-col justify-between">
        <ServiceDescription description={service.description} textSize={textSize} />

        <div className="pt-4 flex justify-center">
          {isMobile ? (
            <BookingButton
              service={service}
              href={`https://cal.com/${service.calLink}`}
            >
              <span className="text-lg font-semibold">{t('services.bookSession')}</span>
            </BookingButton>
          ) : (
            <BookingButton
              service={service}
              onClick={() => {
                const bookingSection = document.getElementById('booking-section');
                if (bookingSection) {
                  bookingSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="hidden lg:flex"
            >
              <span className="text-lg font-semibold">{t('services.bookSession')}</span>
            </BookingButton>
          )}
        </div>
      </div>
    </div>
  );
};

const Services: React.FC<ServicesPageProps> = () => {
  const { t } = useTranslation();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Services configuration
  const services: Service[] = useMemo(() => [
    {
      id: '1to1',
      title: t('services.personal.title'),
      description: t('services.personal.description'),
      image: '/Servizi/1to1.jpg',
      calLink: 'joshua-maurizio-cproiv/allenamento-1-to-1'
    },
    {
      id: 'calisthenics',
      title: t('services.calisthenics.title'),
      description: t('services.calisthenics.description'),
      image: '/Servizi/CalEFun.jpg',
      calLink: 'joshua-maurizio-cproiv/calisthenics-funzionale'
    },
    {
      id: 'bodybuilding',
      title: t('services.bodybuilding.title'),
      description: t('services.bodybuilding.description'),
      image: '/Servizi/BodyEPer.jpg',
      calLink: 'joshua-maurizio-cproiv/bodybuilding-e-performance'
    },
    {
      id: 'gruppi',
      title: t('services.groupClasses.title'),
      description: t('services.groupClasses.description'),
      image: '/Servizi/CorsiGruppo.jpg',
      calLink: 'joshua-maurizio-cproiv/corsi-di-gruppo'
    },
    {
      id: 'online',
      title: t('services.onlineCoaching.title'),
      description: t('services.onlineCoaching.description'),
      image: '/Servizi/CoachingOnline.jpg',
      calLink: 'joshua-maurizio-cproiv/coaching-online'
    }
  ], [t]);

  const toggleService = useCallback((serviceId: string) => {
    setSelectedService(prev => prev === serviceId ? null : serviceId);
  }, []);


  // Get selected service data
  const selectedServiceData = useMemo(() => {
    return selectedService ? services.find(s => s.id === selectedService) : null;
  }, [selectedService, services]);

  // Component styles
  const pageClassName = 'min-h-screen bg-gray-50';
  const mainClassName = 'pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-24';
  const containerClassName = 'max-w-4xl xl:max-w-6xl mx-auto';
  const titleClassName = 'text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-16';
  const placeholderClassName = 'bg-gray-300 rounded-2xl h-80 sm:h-[758px] max-w-2xl mx-auto flex items-center justify-center';
  const bookingSectionClassName = 'mt-16 max-w-4xl xl:max-w-6xl mx-auto';
  const bookingTitleClassName = 'text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4';

  return (
    <div className={pageClassName}>
      <Helmet>
        <title>{t('pages.services.title')}</title>
        <link rel="canonical" href="https://www.esercizifacili.com/services" />
        <meta property="og:url" content="https://www.esercizifacili.com/services" />
        <meta name="description" content="Scopri i servizi di Personal Training a Milano: allenamenti 1-to-1, calisthenics, bodybuilding, corsi di gruppo e coaching online. Prenota ora!" />
      </Helmet>
      <Header />

      <main className={mainClassName}>
        <div className={containerClassName}>

          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className={titleClassName}>
              {t('services.title')}
            </h1>
          </div>

          {/* Services Layout */}
          <div className="lg:grid lg:grid-cols-5 lg:gap-12">
            {/* Service Buttons */}
            <div className="space-y-6 lg:space-y-12 lg:flex lg:flex-col lg:justify-between lg:py-4 lg:col-span-2">
              {services.map((service) => (
                <div key={service.id} className="lg:space-y-0">
                  <ServiceButton
                    service={service}
                    isSelected={selectedService === service.id}
                    onClick={() => toggleService(service.id)}
                  />

                  {/* Mobile Expandable Content */}
                  <div className="lg:hidden">
                    <div
                      id={`service-content-${service.id}`}
                      className={`transition-all duration-500 shadow-lg ease-in-out overflow-hidden rounded-3xl ${
                        selectedService === service.id
                          ? 'max-h-screen opacity-100'
                          : 'max-h-0 opacity-0'
                      }`}
                      aria-hidden={selectedService !== service.id}
                    >
                      <div className="mt-4">
                        <ServiceContent service={service} isMobile={true} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Fixed Content */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-32">
                {selectedServiceData ? (
                  <ServiceContent service={selectedServiceData} isMobile={false} />
                ) : (
                  <div className={placeholderClassName} role="img" aria-label="Service selection placeholder">
                    <p className="text-xl text-gray-500 text-center px-6">
                      {t('services.selectService')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Booking Section */}
        {selectedServiceData && (
          <section id="booking-section" className={bookingSectionClassName} aria-labelledby="booking-title">
            <div className="hidden lg:block">
              <div className="text-center mb-8">
                <h2 id="booking-title" className={bookingTitleClassName}>
                  {t('services.bookYour')} {selectedServiceData.title}
                </h2>
                <p className="text-lg text-gray-600">
                  {t('services.selectDateTime')}
                </p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-lg">
                <Cal
                  key={selectedServiceData.calLink}
                  calLink={selectedServiceData.calLink}
                  style={{ width: "100%", height: "800px", overflow: "scroll" }}
                  config={{
                    layout: 'month_view',
                    theme: 'light'
                  }}
                />
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default Services;