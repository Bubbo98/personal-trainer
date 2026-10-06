import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiGlobe, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { RiInstagramLine, RiTiktokLine } from 'react-icons/ri';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FadeCarousel from '../components/FadeCarousel';
import { CONTACT, SOCIAL } from '../config';
import { usePageMeta } from '../lib/usePageMeta';

const PHOTOS = ['/Contatti/1.webp', '/Contatti/2.webp'];
const GYM_SITE = 'https://www.allenamentofunzionalemilano.net';
const MAP_URL = `https://www.google.com/maps?q=${encodeURIComponent(CONTACT.gymAddress)}&output=embed`;

const Item = ({ icon, href, external, children }: { icon: ReactNode; href?: string; external?: boolean; children: ReactNode }) => {
  const { t } = useTranslation('public');
  const body = (
    <>
      <span className="bg-gray-900 p-3 sm:p-4 rounded-xl flex-shrink-0 text-white">{icon}</span>
      <span className="text-base xs:text-lg sm:text-3xl font-bold text-gray-900 break-words min-w-0">{children}</span>
      {external && <span className="sr-only">{t('contact.opensInNewTab')}</span>}
    </>
  );
  const className = 'flex items-center gap-3 xs:gap-4 sm:gap-6';
  return href ? (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={`${className} hover:opacity-80 transition-opacity rounded-xl`}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
};

const Contact = () => {
  const { t } = useTranslation(['public', 'common']);
  usePageMeta({ title: t('common:meta.contact.title'), description: t('common:meta.contact.description'), path: '/contact' });
  const icon = 'w-6 h-6 sm:w-8 sm:h-8';
  const alts = [t('contact.photoAlt1'), t('contact.photoAlt2')];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="sr-only">{t('common:nav.contact')}</h1>

          <div className="mb-12">
            <div className="md:hidden max-w-sm mx-auto aspect-square">
              <FadeCarousel images={PHOTOS} alt={alts} label={t('contact.photosLabel')} className="w-full h-full" />
            </div>
            <div className="hidden md:grid md:grid-cols-2 gap-6 lg:gap-8 xl:gap-10">
              {PHOTOS.map((src, i) => (
                <img key={src} src={src} alt={alts[i]} loading="lazy" decoding="async" className="w-full aspect-square object-cover rounded-3xl bg-gray-200" />
              ))}
            </div>
          </div>

          <address className="not-italic space-y-12 max-w-sm md:max-w-none mx-auto md:mx-0">
            <Item icon={<FiPhone className={icon} aria-hidden />} href={`tel:${CONTACT.phone}`}>
              {CONTACT.phoneDisplay}
            </Item>
            <Item icon={<FiMail className={icon} aria-hidden />} href={`mailto:${CONTACT.email}`}>
              {CONTACT.email}
            </Item>
            <Item icon={<RiInstagramLine className={icon} aria-hidden />} href={SOCIAL.instagram} external>
              {SOCIAL.instagramHandle}
            </Item>
            <Item icon={<RiTiktokLine className={icon} aria-hidden />} href={SOCIAL.tiktok} external>
              {SOCIAL.tiktokHandle}
            </Item>
            <Item icon={<FiGlobe className={icon} aria-hidden />} href={GYM_SITE} external>
              Allenamento Funzionale Milano
            </Item>
            <div className="space-y-4">
              <Item icon={<FiMapPin className={icon} aria-hidden />}>{t('contact.gymAddress')}</Item>
              <iframe src={MAP_URL} title={t('contact.mapTitle')} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-64 rounded-2xl border-0" />
            </div>
          </address>

          <Link
            to="/booking#booking-calendar"
            className="block text-center mt-16 mb-12 max-w-sm md:max-w-none mx-auto md:mx-0 bg-gray-900 text-white py-6 px-8 font-bold text-base xs:text-lg sm:text-2xl hover:bg-gray-800 transition-colors rounded-3xl"
          >
            {t('contact.bookConsultation')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
