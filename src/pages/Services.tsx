import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Cal from '@calcom/embed-react';
import { FiCalendar } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

const SERVICES = [
  { id: '1to1', key: 'personal', image: '/Servizi/1to1.webp', calLink: 'joshua-maurizio-cproiv/allenamento-1-to-1' },
  { id: 'calisthenics', key: 'calisthenics', image: '/Servizi/CalEFun.webp', calLink: 'joshua-maurizio-cproiv/calisthenics-funzionale' },
  { id: 'bodybuilding', key: 'bodybuilding', image: '/Servizi/BodyEPer.webp', calLink: 'joshua-maurizio-cproiv/bodybuilding-e-performance' },
  { id: 'groups', key: 'groupClasses', image: '/Servizi/CorsiGruppo.webp', calLink: 'joshua-maurizio-cproiv/corsi-di-gruppo' },
  { id: 'online', key: 'onlineCoaching', image: '/Servizi/CoachingOnline.webp', calLink: 'joshua-maurizio-cproiv/coaching-online' },
] as const;

type Service = (typeof SERVICES)[number];

const bookingButton = 'flex items-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors text-lg font-semibold';

/** Image, description and booking button of a service. */
const ServiceDetails = ({ service, inline }: { service: Service; inline: boolean }) => {
  const { t } = useTranslation('public');
  return (
    <div className={`bg-white rounded-3xl p-6 sm:p-8 shadow-lg space-y-6 flex flex-col ${inline ? '' : 'min-h-[758px]'}`}>
      <img src={service.image} alt={t(`services.${service.key}.title`)} loading="lazy" decoding="async" className="h-80 sm:h-[450px] w-full max-w-2xl mx-auto object-cover rounded-2xl bg-gray-200" />
      <div className="flex-1 space-y-4">
        {t(`services.${service.key}.description`)
          .split('\n')
          .map((paragraph) => (
            <p key={paragraph} className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
      </div>
      <div className="flex justify-center">
        {inline ? (
          // Phones get Cal.com's own page: the embedded calendar is too cramped
          <a href={`https://cal.com/${service.calLink}`} target="_blank" rel="noopener noreferrer" className={bookingButton}>
            <FiCalendar className="w-5 h-5" aria-hidden />
            {t('services.bookSession')}
          </a>
        ) : (
          <a href="#booking-section" className={bookingButton}>
            <FiCalendar className="w-5 h-5" aria-hidden />
            {t('services.bookSession')}
          </a>
        )}
      </div>
    </div>
  );
};

const Services = () => {
  const { t } = useTranslation(['public', 'common']);
  usePageMeta({ title: t('common:meta.services.title'), description: t('common:meta.services.description'), path: '/services' });
  const [selectedId, setSelectedId] = useState<Service['id'] | null>(null);
  const selected = SERVICES.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-24">
        <div className="max-w-4xl xl:max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-16 text-center">{t('services.title')}</h1>

          <div className="lg:grid lg:grid-cols-5 lg:gap-12">
            <ul className="space-y-6 lg:space-y-12 lg:flex lg:flex-col lg:justify-between lg:py-4 lg:col-span-2">
              {SERVICES.map((service) => {
                const open = selectedId === service.id;
                return (
                  <li key={service.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(open ? null : service.id)}
                      aria-expanded={open}
                      aria-controls={`service-${service.id}`}
                      className="w-full bg-gray-900 text-white py-4 sm:py-6 px-6 sm:px-8 rounded-3xl hover:bg-gray-800 transition-colors text-left text-lg xs:text-xl sm:text-2xl lg:text-sm xl:text-base font-bold truncate"
                    >
                      {t(`services.${service.key}.title`)}
                    </button>
                    {/* Phones: the details open under the button */}
                    {open && (
                      <div id={`service-${service.id}`} className="lg:hidden mt-4">
                        <ServiceDetails service={service} inline />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-32">
                {selected ? (
                  <ServiceDetails service={selected} inline={false} />
                ) : (
                  <div className="bg-gray-300 rounded-2xl h-[758px] flex items-center justify-center">
                    <p className="text-xl text-gray-500 text-center px-6">{t('services.selectService')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {selected && (
          <section id="booking-section" className="hidden lg:block mt-16 max-w-4xl xl:max-w-6xl mx-auto scroll-mt-32" aria-labelledby="booking-title">
            <div className="text-center mb-8">
              <h2 id="booking-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                {t('services.bookYour')} {t(`services.${selected.key}.title`)}
              </h2>
              <p className="text-lg text-gray-600">{t('services.selectDateTime')}</p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <Cal key={selected.calLink} calLink={selected.calLink} style={{ width: '100%', height: '800px', overflow: 'scroll' }} config={{ layout: 'month_view', theme: 'light' }} />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Services;
