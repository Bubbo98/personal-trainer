import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Home hero. <picture> picks one image per screen size (the old version
 * downloaded all four); breakpoints match tailwind's custom screens.
 */
const Hero = () => {
  const { t } = useTranslation('public');

  return (
    <section className="h-screen w-full flex items-center justify-start relative overflow-hidden pl-12 lg:pl-20 xl:pl-32">
      <picture>
        <source media="(min-width: 1600px)" srcSet="/hero-image-web-xl.webp" />
        <source media="(min-width: 1200px)" srcSet="/hero-image-web-lg.webp" />
        <source media="(min-width: 850px)" srcSet="/hero-image-web-md.webp" />
        <img
          src="/hero-image-mobile.webp"
          alt={t('hero.imageAlt')}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </picture>
      <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

      <div className="relative z-10 text-left text-white w-full">
        <h1 className="text-3xl custom:text-5xl lg:text-7xl font-bold mb-4 leading-tight w-full xs:w-2/3 pr-12">
          {t('hero.title')}
          <br />
          {t('hero.subtitle')}
        </h1>
        <div className="flex flex-col custom:flex-row gap-4 custom:gap-12 justify-start mt-12 w-full xs:w-2/3 pr-12">
          <Link
            to="/booking#booking-calendar"
            className="bg-gray-900 text-white text-center px-8 py-4 font-medium hover:bg-gray-800 transition-colors rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {t('hero.consultation')}
          </Link>
          <Link
            to="/services"
            className="bg-gray-100 text-black text-center px-8 py-4 font-medium hover:bg-gray-200 transition-colors rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
          >
            {t('hero.discover')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
