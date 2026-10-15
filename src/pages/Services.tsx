import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiCalendar } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';
import { BOOKING_PATH, SERVICES } from '../lib/services';

/**
 * Every service with its full description in the page (readable by Google and by
 * visitors from ads without clicking around); every button books the free consultation.
 */
const Services = () => {
  const { t } = useTranslation(['public', 'common']);
  const { hash } = useLocation();
  usePageMeta({ title: t('common:meta.services.title'), description: t('common:meta.services.description'), path: '/services' });

  // Links from the home page (/services#calisthenics) land on that service
  useEffect(() => {
    if (!hash) return;
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    return () => clearTimeout(timer);
  }, [hash]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-24">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 text-center">{t('services.title')}</h1>
          <p className="text-lg sm:text-xl text-gray-600 text-center mb-12 lg:mb-16">{t('services.intro')}</p>

          <div className="space-y-10 lg:space-y-14">
            {SERVICES.map((service, i) => (
              <article
                key={service.id}
                id={service.id}
                aria-labelledby={`${service.id}-title`}
                className={`bg-white rounded-3xl shadow-lg overflow-hidden md:flex scroll-mt-28 sm:scroll-mt-36 ${i % 2 ? 'md:flex-row-reverse' : ''}`}
              >
                <img
                  src={service.image}
                  alt={t(`services.${service.key}.title`)}
                  loading={i === 0 ? undefined : 'lazy'}
                  decoding="async"
                  className="w-full md:w-2/5 aspect-[4/3] md:aspect-auto object-cover bg-gray-200"
                />
                <div className="p-6 sm:p-8 lg:p-10 flex flex-col gap-4 md:w-3/5">
                  <h2 id={`${service.id}-title`} className="text-2xl lg:text-3xl font-bold text-gray-900">
                    {t(`services.${service.key}.title`)}
                  </h2>
                  {t(`services.${service.key}.description`)
                    .split('\n')
                    .map((paragraph) => (
                      <p key={paragraph} className="text-base sm:text-lg text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  {'page' in service && (
                    <Link to={service.page} className="self-start inline-flex items-center gap-2 font-semibold text-gray-900 hover:gap-3 transition-all">
                      {t(`services.${service.key}.more`)} <FiArrowRight aria-hidden />
                    </Link>
                  )}
                  <Link
                    to={BOOKING_PATH}
                    className="mt-auto self-start inline-flex items-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors text-lg font-semibold"
                  >
                    <FiCalendar className="w-5 h-5" aria-hidden />
                    {t('services.bookConsultation')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
