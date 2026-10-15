import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiCalendar, FiMapPin, FiPhoneCall, FiTrendingUp } from 'react-icons/fi';
import { BOOKING_PATH, SERVICES, servicePath } from '../lib/services';

const STEPS = [
  { key: 'call', icon: FiPhoneCall },
  { key: 'gym', icon: FiMapPin },
  { key: 'plan', icon: FiTrendingUp },
] as const;

const bookButton = 'inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors font-semibold text-lg';

/** "How it works": from the free call to the personal plan. */
export const HowItWorks = () => {
  const { t } = useTranslation('public');
  return (
    <section className="py-16 lg:py-24 bg-white" aria-labelledby="how-title">
      <div className="max-w-6xl mx-auto px-6 lg:px-16">
        <h2 id="how-title" className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-12">
          {t('home.how.title')}
        </h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ key, icon: Icon }, i) => (
            <li key={key} className="bg-gray-50 rounded-2xl p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white font-bold" aria-hidden>
                  {i + 1}
                </span>
                <Icon className="w-6 h-6 text-gray-700" aria-hidden />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t(`home.how.${key}.title`)}</h3>
              <p className="text-gray-700 leading-relaxed">{t(`home.how.${key}.text`)}</p>
            </li>
          ))}
        </ol>
        <div className="text-center mt-10">
          <Link to={BOOKING_PATH} className={bookButton}>
            <FiCalendar className="w-5 h-5" aria-hidden />
            {t('hero.consultation')}
          </Link>
        </div>
      </div>
    </section>
  );
};

/** The services in short, each leading to its full description. */
export const ServicesPreview = () => {
  const { t } = useTranslation('public');
  return (
    <section className="py-16 lg:py-24 bg-gray-50" aria-labelledby="services-preview-title">
      <div className="max-w-7xl mx-auto px-6 lg:px-16">
        <h2 id="services-preview-title" className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-12">
          {t('home.services.title')}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <li key={service.id}>
              <Link to={servicePath(service)} className="group block h-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow overflow-hidden">
                <img src={service.image} alt="" loading="lazy" decoding="async" width={900} height={600} className="w-full aspect-[3/2] object-cover bg-gray-200" />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t(`services.${service.key}.title`)}</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">{t(`services.${service.key}.description`).split('\n')[0]}</p>
                  <span className="inline-flex items-center gap-2 font-semibold text-gray-900 group-hover:gap-3 transition-all">
                    {t('home.services.more')} <FiArrowRight aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

/** Closing call to action. */
export const FinalCta = () => {
  const { t } = useTranslation('public');
  return (
    <section className="py-16 lg:py-20 bg-gray-900 text-white" aria-labelledby="final-cta-title">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 id="final-cta-title" className="text-3xl lg:text-4xl font-bold mb-4">
          {t('home.cta.title')}
        </h2>
        <p className="text-lg text-gray-300 mb-8">{t('home.cta.text')}</p>
        <Link to={BOOKING_PATH} className="inline-flex items-center justify-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors font-semibold text-lg">
          <FiCalendar className="w-5 h-5" aria-hidden />
          {t('hero.consultation')}
        </Link>
      </div>
    </section>
  );
};
