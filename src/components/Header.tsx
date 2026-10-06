import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiMail, FiUser } from 'react-icons/fi';
import type { IconType } from 'react-icons';

const NAV: { to: string; label: 'nav.about' | 'nav.services' | 'nav.contact'; icon: IconType }[] = [
  { to: '/about', label: 'nav.about', icon: FiUser },
  { to: '/services', label: 'nav.services', icon: FiGrid },
  { to: '/contact', label: 'nav.contact', icon: FiMail },
];

const SCROLL_THRESHOLD = 100;

/** Switches between Italian and English (remembered by the language detector). */
const LanguageSwitch = () => {
  const { t, i18n } = useTranslation('common');
  const next = i18n.resolvedLanguage === 'en' ? 'it' : 'en';
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={t('language.switchTo')}
      title={t('language.switchTo')}
      lang={next}
      className="text-white/90 hover:text-white border border-white/40 hover:border-white rounded-lg px-2 py-1 text-xs sm:text-sm font-semibold tracking-wide transition-colors"
    >
      {t('language.short')}
    </button>
  );
};

/** Site header: brand, main pages, language. Transparent over the home hero until scrolled. */
const Header = () => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const solid = !isHome || scrolled;

  return (
    <header className={`fixed top-0 w-full z-50 p-2 sm:p-4 md:p-6 transition-colors duration-300 ${solid ? 'bg-gray-900/95 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div className="flex justify-between items-center gap-2 custom:px-16">
        <Link to="/" className="flex items-center gap-3 sm:gap-4 text-white hover:text-gray-300 transition-colors" aria-label={t('header.home')}>
          <span className="flex gap-1 flex-shrink-0">
            <img src="/Logo/logo1-small.webp" alt="" width={56} height={56} className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain" />
            <img src="/Logo/logo2-small.webp" alt="" width={56} height={56} className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain" />
          </span>
          <span>
            <span className="block text-sm xs:text-lg sm:text-2xl font-bold tracking-wider leading-tight sm:leading-normal">
              <span className="block sm:inline">JOSHUA MAURIZIO</span>
              <span className="block sm:inline"> E DENISE BERGAMO</span>
            </span>
            <span className="block text-sm font-light tracking-widest">PERSONAL TRAINER</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 xs:gap-4 sm:gap-8">
          <nav aria-label={t('header.nav')} className="flex gap-3 xs:gap-4 sm:gap-8">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={t(label)}
                className={({ isActive }) =>
                  `text-white hover:text-gray-300 transition-colors font-medium text-base sm:text-lg flex items-center ${isActive ? 'underline underline-offset-8 decoration-2' : ''}`
                }
              >
                <Icon className="w-6 h-6 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">{t(label)}</span>
              </NavLink>
            ))}
          </nav>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
};

export default Header;
