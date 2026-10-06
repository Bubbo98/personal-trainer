import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiClock, FiFileText, FiMail, FiMapPin, FiPhone, FiUser } from 'react-icons/fi';
import { CONTACT } from '../config';
import { OWNER } from '../features/legal/content/owner';

const PARTNER_URL = 'https://www.allenamentofunzionalemilano.net';

const Column = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <h2 className="text-xl font-bold mb-6">{title}</h2>
    <div className="space-y-3 text-gray-300">{children}</div>
  </div>
);

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="flex items-start gap-3">
    <span className="text-gray-400 flex-shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0">{children}</div>
  </div>
);

const Footer = () => {
  const { t } = useTranslation('common');
  const icon = 'w-5 h-5';

  return (
    <footer className="bg-gray-900 text-white">
      <div className="px-6 lg:px-10 py-12 flex flex-col md:flex-row items-center gap-8">
        <img
          src="/Logo/logo1-medium.webp"
          alt={t('footer.logoAlt')}
          loading="lazy"
          width={224}
          height={224}
          className="flex-shrink-0 h-24 sm:h-32 md:h-40 lg:h-48 xl:h-56 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
        />

        <div className="flex-1 flex flex-col gap-12 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <Column title={t('footer.personalTrainer')}>
              <Row icon={<FiUser className={icon} aria-hidden />}>{OWNER.people}</Row>
              <Row icon={<FiMapPin className={icon} aria-hidden />}>
                Via Piero Bottoni 10
                <br />
                20141 Milano (MI)
              </Row>
            </Column>

            <Column title={t('footer.schedule')}>
              <Row icon={<FiClock className={icon} aria-hidden />}>
                <p className="font-medium text-white mb-2">{t('footer.mondayFriday')}</p>
                <p className="text-sm">{t('footer.workouts')}</p>
                <p className="text-sm">{t('footer.consultations')}</p>
              </Row>
            </Column>

            <Column title={t('footer.contacts')}>
              <Row icon={<FiPhone className={icon} aria-hidden />}>
                <a href={`tel:${CONTACT.phone}`} className="hover:text-white transition-colors">
                  +39 {CONTACT.phoneDisplay}
                </a>
              </Row>
              <Row icon={<FiMail className={icon} aria-hidden />}>
                <a href={`mailto:${CONTACT.email}`} className="hover:text-white transition-colors break-all">
                  {CONTACT.email}
                </a>
              </Row>
            </Column>

            <Column title={t('footer.fiscalData')}>
              <Row icon={<FiFileText className={icon} aria-hidden />}>
                <p className="text-sm">
                  <span className="text-gray-400">CF:</span> {OWNER.taxCode}
                </p>
                <p className="text-sm">
                  <span className="text-gray-400">P.IVA:</span> {OWNER.vat}
                </p>
              </Row>
            </Column>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row md:justify-between items-center gap-6">
            <div className="text-center md:text-left space-y-2">
              <p className="text-gray-400 text-sm">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
              <p className="text-gray-500 text-xs">{t('footer.allRightsReserved')}</p>
            </div>
            <nav aria-label={t('footer.legalLinks')} className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.privacyPolicy')}
              </Link>
              <Link to="/terms-of-service" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.termsOfService')}
              </Link>
              <Link to="/cookie-policy" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.cookiePolicy')}
              </Link>
            </nav>
          </div>

          <div className="pt-6 border-t border-gray-800 text-xs text-gray-500 text-center space-y-2">
            <p>{t('footer.qualifiedTrainer')}</p>
            <p>{t('footer.disclaimer')}</p>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <img src="/Logo/logo2-medium.webp" alt={t('footer.partnerLogoAlt')} loading="lazy" width={224} height={224} className="h-24 sm:h-32 md:h-40 lg:h-48 xl:h-56 w-auto object-contain" />
          <div className="text-center">
            <p className="text-gray-300 text-sm font-medium">{t('footer.functionalTraining')}</p>
            <a href={PARTNER_URL} target="_blank" rel="noopener noreferrer" className="text-gray-400 text-xs hover:text-white transition-colors underline block mt-1">
              www.allenamentofunzionalemilano.net
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
