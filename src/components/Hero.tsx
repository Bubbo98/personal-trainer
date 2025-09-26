import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// Constants
const SCROLL_DELAY = 100;
const BOOKING_CALENDAR_ID = 'booking-calendar';

// Types
interface HeroImage {
  src: string;
  alt: string;
  className: string;
  breakpoint: string;
}

interface ActionButton {
  key: string;
  translationKey: string;
  onClick: () => void;
  className: string;
  variant: 'primary' | 'secondary';
  ariaLabel: string;
}

// Components
const ResponsiveImage: React.FC<HeroImage> = ({ src, alt, className, breakpoint }) => (
  <img
    src={src}
    alt={alt}
    className={className}
    loading="eager"
    fetchPriority="high"
    decoding="async"
  />
);

const ActionButton: React.FC<{
  button: ActionButton;
  children: React.ReactNode;
}> = ({ button, children }) => (
  <button
    onClick={button.onClick}
    className={button.className}
    aria-label={button.ariaLabel}
  >
    {children}
  </button>
);

const Hero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Navigation handlers
  const navigateToBookingWithScroll = useCallback(() => {
    navigate('/booking');
    setTimeout(() => {
      const calendarSection = document.getElementById(BOOKING_CALENDAR_ID);
      if (calendarSection) {
        calendarSection.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, SCROLL_DELAY);
  }, [navigate]);

  const navigateToServices = useCallback(() => {
    navigate('/services');
  }, [navigate]);

  // Hero images configuration
  const heroImages: HeroImage[] = useMemo(() => [
    {
      src: '/hero-image-mobile.jpg',
      alt: 'Joshua Maurizio Personal Trainer - Mobile Hero Image',
      className: 'absolute inset-0 w-full h-full object-cover object-center custom:hidden',
      breakpoint: 'mobile'
    },
    {
      src: '/hero-image-web-md.jpeg',
      alt: 'Joshua Maurizio Personal Trainer - Medium Screen Hero Image',
      className: 'absolute inset-0 w-full h-full object-cover object-center hidden custom:block custom-lg:hidden',
      breakpoint: 'medium'
    },
    {
      src: '/hero-image-web-lg.jpeg',
      alt: 'Joshua Maurizio Personal Trainer - Large Screen Hero Image',
      className: 'absolute inset-0 w-full h-full object-cover object-center hidden custom-lg:block custom-xl:hidden',
      breakpoint: 'large'
    },
    {
      src: '/hero-image-web-xl.jpeg',
      alt: 'Joshua Maurizio Personal Trainer - Extra Large Screen Hero Image',
      className: 'absolute inset-0 w-full h-full object-cover object-center hidden custom-xl:block',
      breakpoint: 'extra-large'
    }
  ], []);

  // Action buttons configuration
  const actionButtons: ActionButton[] = useMemo(() => [
    {
      key: 'consultation',
      translationKey: 'hero.consultation',
      onClick: navigateToBookingWithScroll,
      className: 'bg-gray-900 text-white px-8 py-4 font-medium hover:bg-gray-800 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2',
      variant: 'primary',
      ariaLabel: 'Book a consultation session'
    },
    {
      key: 'discover',
      translationKey: 'hero.discover',
      onClick: navigateToServices,
      className: 'bg-gray-100 text-black px-8 py-4 font-medium hover:bg-gray-200 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2',
      variant: 'secondary',
      ariaLabel: 'Discover available services'
    }
  ], [navigateToBookingWithScroll, navigateToServices]);

  // Component styles
  const sectionClassName = 'h-screen w-full flex items-center justify-start relative overflow-hidden pl-12 lg:pl-20 xl:pl-32';
  const overlayClassName = 'absolute inset-0 bg-black/20';
  const contentClassName = 'relative z-10 text-left text-white w-full';
  const titleClassName = 'text-3xl custom:text-5xl lg:text-7xl font-bold mb-4 leading-tight w-full xs:w-2/3 pr-12';
  const buttonsContainerClassName = 'flex flex-col custom:flex-row gap-4 custom:gap-12 justify-start mt-12 w-full xs:w-2/3 pr-12';

  return (
    <section className={sectionClassName} role="banner" aria-label="Hero section">
      {/* Background Images */}
      {heroImages.map((image) => (
        <ResponsiveImage
          key={image.breakpoint}
          src={image.src}
          alt={image.alt}
          className={image.className}
          breakpoint={image.breakpoint}
        />
      ))}

      {/* Overlay */}
      <div className={overlayClassName} aria-hidden="true" />

      {/* Content */}
      <div className={contentClassName}>
        <h1 className={titleClassName}>
          {t('hero.title')}
          <br />
          {t('hero.subtitle')}
        </h1>

        {/* Action Buttons */}
        <div className={buttonsContainerClassName}>
          {actionButtons.map((button) => (
            <ActionButton key={button.key} button={button}>
              {t(button.translationKey)}
            </ActionButton>
          ))}
        </div>

        {/* Admin Link - Only for development/testing */}
        <div className="mt-8">
          <a
            href="/admin"
            className="text-white/50 hover:text-white/80 text-sm underline transition-colors"
          >
            Admin CMS
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;