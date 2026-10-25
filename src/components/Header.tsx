import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiMail, FiMonitor, FiUser } from 'react-icons/fi';
import type { IconType } from 'react-icons';

const NAV: { to: string; label: 'nav.coaching' | 'nav.about' | 'nav.services' | 'nav.contact'; icon: IconType }[] = [
  { to: '/coaching-online', label: 'nav.coaching', icon: FiMonitor },
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
        {/* Two lines that never wrap up to very wide screens (iPhones are narrower than most Androids); no subtitle on phones */}
        <Link to="/" className="flex items-center gap-2 sm:gap-4 min-w-0 text-white hover:text-gray-300 transition-colors" aria-label={t('header.home')}>
          <span className="flex gap-1 flex-shrink-0">
            <img src="/Logo/logo1-small.webp" alt="" width={56} height={56} className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain" />
            <img src="/Logo/logo2-small.webp" alt="" width={56} height={56} className="hidden xs:block w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] min-[360px]:text-xs xs:text-sm sm:text-base md:text-xl xl:text-2xl font-bold tracking-wide sm:tracking-wider leading-tight 2xl:leading-normal whitespace-nowrap">
              <span className="block 2xl:inline">JOSHUA MAURIZIO</span>
              <span className="block 2xl:inline"> E DENISE BERGAMO</span>
            </span>
            <span className="hidden sm:block text-xs md:text-sm font-light tracking-widest">PERSONAL TRAINER</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 xs:gap-4 sm:gap-5 md:gap-8 flex-shrink-0">
          <nav aria-label={t('header.nav')} className="flex gap-2.5 xs:gap-4 sm:gap-5 md:gap-8">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={t(label)}
                className={({ isActive }) =>
                  `text-white hover:text-gray-300 transition-colors font-medium text-base md:text-lg flex items-center ${isActive ? 'underline underline-offset-8 decoration-2' : ''}`
                }
              >
                <Icon className="w-5 h-5 xs:w-6 xs:h-6 lg:hidden" aria-hidden />
                <span className="hidden lg:inline">{t(label)}</span>
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
