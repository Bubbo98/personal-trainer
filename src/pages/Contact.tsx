import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AutoFadeCarousel from '../components/AutoFadeCarousel';
import { FiPhone, FiMail, FiGlobe, FiMapPin } from 'react-icons/fi';
import { RiInstagramLine, RiTiktokLine } from 'react-icons/ri';
import type { IconType } from 'react-icons';

// Constants
const CONTACT_IMAGES = ['/Contatti/1.jpg', '/Contatti/2.jpg'] as const;
const CONTACT_IMAGE_ALTS = ['Joshua Personal Trainer', 'Allenamento personalizzato'] as const;
const CAROUSEL_INTERVAL = 5000;
const SCROLL_DELAY = 100;
const BOOKING_CALENDAR_ID = 'booking-calendar';
const GYM_NAME = 'Allenamento Funzionale Milano';
const GYM_ADDRESS = "Via Cortina d'Ampezzo 14, Milano 20139";
const MAPS_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2798.4857926159906!2d9.237074915519916!3d45.46595877910175!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c6b4b8e0c9c1%3A0x123456789!2sVia%20Cortina%20d'Ampezzo%2C%2014%2C%2020139%20Milano%20MI%2C%20Italy!5e0!3m2!1sen!2sit!4v1635000000000!5m2!1sen!2sit";

// Types
interface ContactPageProps {}

interface ContactInfo {
  id: string;
  icon: IconType;
  href?: string;
  target?: string;
  rel?: string;
  text: string;
  isTranslated?: boolean;
  ariaLabel: string;
}

interface ContactItemProps {
  contact: ContactInfo;
  onClick?: () => void;
}

interface ContactImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Components
const ContactImage: React.FC<ContactImageProps> = ({ src, alt, className = "" }) => (
  <div className={`bg-gray-200 rounded-3xl overflow-hidden aspect-square ${className}`}>
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
    />
  </div>
);

const ContactItem: React.FC<ContactItemProps> = ({ contact, onClick }) => {
  const { t } = useTranslation();
  const IconComponent = contact.icon as React.ComponentType<{ className?: string }>;
  const displayText = contact.isTranslated ? t(contact.text) : contact.text;

  const content = (
    <>
      <div className="bg-gray-900 p-3 sm:p-4 rounded-xl flex-shrink-0">
        <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
      </div>
      <div className="text-left">
        <p className="text-base xs:text-lg sm:text-3xl font-bold text-gray-900">
          {displayText}
        </p>
      </div>
    </>
  );

  if (contact.href) {
    return (
      <a
        href={contact.href}
        target={contact.target}
        rel={contact.rel}
        className="flex items-center space-x-3 xs:space-x-4 sm:space-x-6 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 rounded-xl"
        aria-label={contact.ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-3 xs:space-x-4 sm:space-x-6 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 rounded-xl"
      aria-label={contact.ariaLabel}
    >
      {content}
    </button>
  );
};

const GymLocationSection: React.FC = () => {
  const MapPinIcon = FiMapPin as React.ComponentType<{ className?: string }>;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 xs:space-x-4 sm:space-x-6">
        <div className="bg-gray-900 p-3 sm:p-4 rounded-xl flex-shrink-0">
          <MapPinIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div className="text-left">
          <p className="text-base xs:text-lg sm:text-3xl font-bold text-gray-900">
            {GYM_ADDRESS}
          </p>
        </div>
      </div>

      <div className="w-full h-64 rounded-2xl overflow-hidden">
        <iframe
          src={MAPS_EMBED_URL}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`${GYM_NAME} location map`}
        />
      </div>
    </div>
  );
};

const Contact: React.FC<ContactPageProps> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBookingNavigation = useCallback(() => {
    navigate('/booking');
    setTimeout(() => {
      const calendarSection = document.getElementById(BOOKING_CALENDAR_ID);
      if (calendarSection) {
        calendarSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, SCROLL_DELAY);
  }, [navigate]);

  // Contact information configuration
  const contactInfo: ContactInfo[] = useMemo(() => [
    {
      id: 'phone',
      icon: FiPhone,
      href: 'tel:+393282062823',
      text: 'contact.phone',
      isTranslated: true,
      ariaLabel: 'Call Joshua at +39 328 206 2823'
    },
    {
      id: 'email',
      icon: FiMail,
      href: 'mailto:josh17111991@gmail.com',
      text: 'contact.email',
      isTranslated: true,
      ariaLabel: 'Send email to josh17111991@gmail.com'
    },
    {
      id: 'instagram',
      icon: RiInstagramLine,
      href: 'https://instagram.com/mauriziojoshuapt',
      target: '_blank',
      rel: 'noopener noreferrer',
      text: '@mauriziojoshuapt',
      isTranslated: false,
      ariaLabel: 'Visit Instagram profile @mauriziojoshuapt'
    },
    {
      id: 'tiktok',
      icon: RiTiktokLine,
      href: 'https://tiktok.com/@jdpushandpull',
      target: '_blank',
      rel: 'noopener noreferrer',
      text: '@JD Push & Pull',
      isTranslated: false,
      ariaLabel: 'Visit TikTok profile @JD Push & Pull'
    },
    {
      id: 'website',
      icon: FiGlobe,
      href: 'https://www.allenamentofunzionalemilano.net',
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'Allenamento Funzionale Milano',
      isTranslated: false,
      ariaLabel: 'Visit Allenamento Funzionale Milano website'
    }
  ], []);

  // Component styles
  const pageClassName = 'min-h-screen bg-gray-50';
  const mainClassName = 'pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20';
  const containerClassName = 'max-w-4xl mx-auto';
  const buttonClassName = 'w-full bg-gray-900 text-white py-6 px-8 font-bold text-base xs:text-lg sm:text-2xl hover:bg-gray-800 transition-colors rounded-3xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2';

  return (
    <div className={pageClassName}>
      <Helmet>
        <title>{t('pages.contact.title')}</title>
        <link rel="canonical" href="https://esercizifacili.com/contact" />
        <meta property="og:url" content="https://esercizifacili.com/contact" />
        <meta name="description" content="Contatta Joshua, Personal Trainer a Milano. Telefono, email, Instagram e TikTok. Palestra in Via Cortina d'Ampezzo 14, Milano." />
      </Helmet>
      <Header />

      <main className={mainClassName}>
        <div className={containerClassName}>
          {/* Contact Images */}
          <div className="mb-12">
            {/* Mobile: Auto-fade carousel */}
            <div className="md:hidden max-w-sm mx-auto">
              <div className="bg-gray-200 rounded-2xl overflow-hidden aspect-square">
                <AutoFadeCarousel
                  images={[...CONTACT_IMAGES]}
                  altTexts={[...CONTACT_IMAGE_ALTS]}
                  className="w-full h-full"
                  interval={CAROUSEL_INTERVAL}
                  aria-label="Contact images carousel"
                />
              </div>
            </div>

            {/* Desktop: Side by side grid */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 lg:gap-8 xl:gap-10">
              {CONTACT_IMAGES.map((src, index) => (
                <ContactImage
                  key={src}
                  src={src}
                  alt={CONTACT_IMAGE_ALTS[index]}
                />
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-12 max-w-sm md:max-w-none mx-auto md:mx-0">
            {contactInfo.map((contact) => (
              <ContactItem key={contact.id} contact={contact} />
            ))}

            {/* Gym Location */}
            <GymLocationSection />
          </div>

          {/* CTA Button */}
          <div className="mt-16 mb-12 max-w-sm md:max-w-none mx-auto md:mx-0">
            <button
              onClick={handleBookingNavigation}
              className={buttonClassName}
              aria-label="Book consultation - Navigate to booking page"
            >
              {t('contact.bookConsultation')}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;