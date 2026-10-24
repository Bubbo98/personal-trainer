import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import {
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClipboard,
  FiFileText,
  FiMapPin,
  FiMonitor,
  FiPlayCircle,
  FiRefreshCw,
  FiSmartphone,
} from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GoogleReviews from '../components/GoogleReviews';
import BookingCalendar from '../components/BookingCalendar';
import { CONTACT } from '../config';
import { usePageMeta } from '../lib/usePageMeta';
import { CALENDAR_ID } from '../lib/services';

interface Item {
  title: string;
  text: string;
}
interface Faq {
  q: string;
  a: string;
}

const INCLUDE_ICONS: IconType[] = [FiFileText, FiPlayCircle, FiBarChart2, FiClipboard, FiRefreshCw, FiSmartphone];

const bookButton = 'inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors font-semibold text-lg';

/** Same-page link to the calendar at the bottom: works in the prerendered page too. */
const BookLink = ({ className = bookButton }: { className?: string }) => {
  const { t } = useTranslation('public');
  return (
    <a href={`#${CALENDAR_ID}`} className={className}>
      <FiCalendar className="w-5 h-5" aria-hidden />
      {t('coaching.cta')}
    </a>
  );
};

/**
 * Landing page of the ads: online coaching first (how it works, what the client gets: the client
 * area as it really is), training at the gym in Milan as the other path, then the free consultation calendar.
 */
const CoachingOnline = () => {
  const { t } = useTranslation(['public', 'common']);
  const { hash } = useLocation();
  usePageMeta({ title: t('common:meta.coaching.title'), description: t('common:meta.coaching.description'), path: '/coaching-online' });

  // Links from other pages (/coaching-online#booking-calendar) land on the calendar
  useEffect(() => {
    if (hash !== `#${CALENDAR_ID}`) return;
    const timer = setTimeout(() => document.getElementById(CALENDAR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    return () => clearTimeout(timer);
  }, [hash]);

  const highlights = t('coaching.highlights', { returnObjects: true }) as string[];
  const steps = t('coaching.how.steps', { returnObjects: true }) as Item[];
  const includes = t('coaching.includes.items', { returnObjects: true }) as Item[];
  const forWho = t('coaching.forWho.items', { returnObjects: true }) as string[];
  const gymItems = t('coaching.gym.items', { returnObjects: true }) as string[];
  const faqs = t('coaching.faq.items', { returnObjects: true }) as Faq[];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <section className="pt-28 sm:pt-40 pb-16 lg:pb-24 px-6 lg:px-16" aria-labelledby="coaching-title">
          <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <h1 id="coaching-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {t('coaching.title')}
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-6">{t('coaching.lead')}</p>
              <ul className="space-y-2 mb-8">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-900 font-medium">
                    <FiCheck className="w-5 h-5 flex-shrink-0 text-green-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <BookLink />
              <p className="mt-3 text-gray-600">{t('coaching.ctaNote')}</p>
              <Link to="/prova-gratuita" className="mt-5 inline-flex items-center gap-2 font-semibold text-gray-900 underline underline-offset-4 hover:gap-3 transition-all">
                {t('coaching.trialLink')}
                <FiArrowRight aria-hidden />
              </Link>
            </div>
            <img
              src="/Servizi/CoachingOnline.webp"
              alt={t('coaching.imageAlt')}
              width={900}
              height={600}
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto rounded-3xl shadow-lg bg-gray-200"
            />
          </div>
        </section>

        <section className="pb-16 lg:pb-24 px-6 lg:px-16" aria-labelledby="coaching-paths-title">
          <div className="max-w-6xl mx-auto">
            <h2 id="coaching-paths-title" className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-10">
              {t('coaching.paths.title')}
            </h2>
            {/* Online is the main path: the wider, dark card */}
            <div className="grid gap-6 md:grid-cols-5">
              <a href="#coaching-how-title" className="group md:col-span-3 bg-gray-900 text-white rounded-3xl p-8 lg:p-10 shadow-lg">
                <FiMonitor className="w-10 h-10 mb-4" aria-hidden />
                <h3 className="text-2xl lg:text-3xl font-bold mb-3">{t('coaching.paths.online.title')}</h3>
                <p className="text-lg text-gray-300 leading-relaxed mb-6">{t('coaching.paths.online.text')}</p>
                <span className="inline-flex items-center gap-2 font-semibold group-hover:gap-3 transition-all">
                  {t('coaching.paths.online.link')} <FiArrowRight aria-hidden />
                </span>
              </a>
              <a href="#coaching-gym-title" className="group md:col-span-2 bg-white rounded-3xl p-8 lg:p-10 shadow-md">
                <FiMapPin className="w-10 h-10 mb-4 text-gray-900" aria-hidden />
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">{t('coaching.paths.gym.title')}</h3>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">{t('coaching.paths.gym.text')}</p>
                <span className="inline-flex items-center gap-2 font-semibold text-gray-900 group-hover:gap-3 transition-all">
                  {t('coaching.paths.gym.link')} <FiArrowRight aria-hidden />
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-white" aria-labelledby="coaching-how-title">
          <div className="max-w-6xl mx-auto px-6 lg:px-16">
            <h2 id="coaching-how-title" className="scroll-mt-28 text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-12">
              {t('coaching.how.title')}
            </h2>
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.title} className="bg-gray-50 rounded-2xl p-6">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white font-bold mb-4" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-16 lg:py-24" aria-labelledby="coaching-includes-title">
          <div className="max-w-6xl mx-auto px-6 lg:px-16">
            <h2 id="coaching-includes-title" className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-12">
              {t('coaching.includes.title')}
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {includes.map((item, i) => {
                const Icon = INCLUDE_ICONS[i] ?? FiCheck;
                return (
                  <li key={item.title} className="bg-white rounded-2xl shadow-md p-6">
                    <Icon className="w-8 h-8 text-gray-900 mb-4" aria-hidden />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{item.text}</p>
                  </li>
                );
              })}
            </ul>
            <div className="text-center mt-12">
              <BookLink />
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-white" aria-labelledby="coaching-for-title">
          <div className="max-w-6xl mx-auto px-6 lg:px-16 grid gap-12 lg:grid-cols-2">
            <div>
              <h2 id="coaching-for-title" className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
                {t('coaching.forWho.title')}
              </h2>
              <ul className="space-y-4">
                {forWho.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-lg text-gray-700">
                    <FiCheck className="w-6 h-6 flex-shrink-0 mt-0.5 text-green-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <img
                src="/joshua-portrait.webp"
                alt={t('coaching.why.portraitAlt')}
                width={900}
                height={1351}
                loading="lazy"
                decoding="async"
                className="w-40 sm:w-48 h-auto rounded-2xl bg-gray-200 flex-shrink-0"
              />
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('coaching.why.title')}</h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-4">{t('coaching.why.text')}</p>
                <Link to="/about" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:gap-3 transition-all">
                  {t('coaching.why.more')} <FiArrowRight aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24" aria-labelledby="coaching-gym-title">
          <div className="max-w-6xl mx-auto px-6 lg:px-16 grid gap-10 lg:grid-cols-2 items-center">
            <img
              src="/Servizi/1to1.webp"
              alt={t('coaching.gym.imageAlt')}
              width={900}
              height={1200}
              loading="lazy"
              decoding="async"
              className="w-full max-w-sm mx-auto aspect-[4/5] object-cover rounded-3xl shadow-lg bg-gray-200"
            />
            <div>
              <h2 id="coaching-gym-title" className="scroll-mt-28 text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {t('coaching.gym.title')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">{t('coaching.gym.text')}</p>
              <ul className="space-y-3 mb-6">
                {gymItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-lg text-gray-700">
                    <FiCheck className="w-6 h-6 flex-shrink-0 mt-0.5 text-green-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-2 text-gray-900 font-medium mb-6">
                <FiMapPin className="w-5 h-5 flex-shrink-0" aria-hidden />
                {CONTACT.gymAddress}
              </p>
              <Link to="/services" className="inline-flex items-center gap-2 font-semibold text-gray-900 hover:gap-3 transition-all">
                {t('coaching.gym.more')} <FiArrowRight aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <GoogleReviews />

        <section className="py-16 lg:py-24" aria-labelledby="coaching-faq-title">
          <div className="max-w-3xl mx-auto px-6">
            <h2 id="coaching-faq-title" className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-10">
              {t('coaching.faq.title')}
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details key={faq.q} className="group bg-white rounded-2xl shadow-sm p-6">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-lg font-semibold text-gray-900">
                    {faq.q}
                    <FiChevronDown className="w-5 h-5 flex-shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-4 text-gray-700 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16 lg:pb-24 px-6 lg:px-16" aria-labelledby="coaching-booking-title">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-7xl mx-auto">
            <h2 id="coaching-booking-title" className="text-3xl lg:text-4xl font-bold text-gray-900 text-center mb-4">
              {t('coaching.booking.title')}
            </h2>
            <p className="mb-8 text-center text-lg sm:text-xl text-gray-600 leading-relaxed">{t('coaching.booking.text')}</p>
            <BookingCalendar />
            <p className="mt-10 text-center text-lg sm:text-xl text-gray-700">
              {t('booking.directContact')}{' '}
              <a href={`tel:${CONTACT.phone}`} className="font-bold text-gray-900 hover:text-gray-700 transition-colors">
                {CONTACT.phoneDisplay}
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CoachingOnline;
