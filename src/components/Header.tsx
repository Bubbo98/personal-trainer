import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiGrid, FiMail } from 'react-icons/fi';
import type { IconType } from 'react-icons';

// Constants
const SCROLL_THRESHOLD = 100;
const LOGO_PATHS = ['/Logo/logo1.jpg', '/Logo/logo2.jpg'] as const;

// Types
interface NavigationItem {
  key: string;
  translationKey: string;
  icon: IconType;
  route: string;
  ariaLabel: string;
}

interface LogoProps {
  src: string;
  alt: string;
  className: string;
}

// Components
const Logo: React.FC<LogoProps> = ({ src, alt, className }) => (
  <img
    src={src}
    alt={alt}
    className={className}
    onError={(e) => {
      e.currentTarget.style.display = 'none';
    }}
    loading="lazy"
  />
);

const NavigationButton: React.FC<{
  item: NavigationItem;
  onClick: () => void;
  translatedText: string;
}> = ({ item, onClick, translatedText }) => {
  const IconComponent = item.icon as React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

  return (
    <button
      onClick={onClick}
      className="text-white hover:text-gray-300 transition-colors font-medium text-md sm:text-lg flex items-center justify-center"
      aria-label={item.ariaLabel}
    >
      <IconComponent className="w-6 h-6 sm:hidden" aria-hidden={true} />
      <span className="hidden sm:inline">{translatedText}</span>
    </button>
  );
};

const Header: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  const isHome = location.pathname === '/';

  // Navigation configuration
  const navigationItems: NavigationItem[] = useMemo(() => [
    {
      key: 'about',
      translationKey: 'nav.about',
      icon: FiUser,
      route: '/about',
      ariaLabel: 'Navigate to About page'
    },
    {
      key: 'services',
      translationKey: 'nav.services',
      icon: FiGrid,
      route: '/services',
      ariaLabel: 'Navigate to Services page'
    },
    {
      key: 'contact',
      translationKey: 'nav.contact',
      icon: FiMail,
      route: '/contact',
      ariaLabel: 'Navigate to Contact page'
    }
  ], []);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  const navigateToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const navigateToRoute = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  useEffect(() => {
    if (!isHome) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome, handleScroll]);

  // Computed styles
  const headerClassName = useMemo(() => {
    const baseClasses = 'fixed top-0 w-full z-50 p-2 sm:p-4 md:p-6 transition-all duration-300';
    const backgroundClasses = !isHome || isScrolled
      ? 'bg-gray-900/95 backdrop-blur-sm'
      : 'bg-transparent';
    return `${baseClasses} ${backgroundClasses}`;
  }, [isHome, isScrolled]);

  const logoClassName = 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain';

  return (
    <header className={headerClassName}>
      <div className="flex justify-between items-center custom:px-16">
        {/* Brand Section */}
        <button
          onClick={navigateToHome}
          className="flex items-center gap-3 sm:gap-4 text-white text-left hover:text-gray-300 transition-colors"
          aria-label="Go to homepage"
        >
          {/* Logo Section */}
          <div className="flex gap-1" role="img" aria-label="Joshua Maurizio logos">
            {LOGO_PATHS.map((logoPath, index) => (
              <Logo
                key={logoPath}
                src={logoPath}
                alt={`Joshua Maurizio logo ${index + 1}`}
                className={logoClassName}
              />
            ))}
          </div>

          {/* Brand Text */}
          <div>
            <h1 className="text-sm xs:text-lg sm:text-2xl font-bold tracking-wider">
              JOSHUA MAURIZIO
            </h1>
            <p className="text-sm font-light tracking-widest">
              PERSONAL TRAINER
            </p>
          </div>
        </button>

        {/* Navigation Section */}
        <nav className="flex space-x-2 xs:space-x-4 sm:space-x-8" role="navigation" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <NavigationButton
              key={item.key}
              item={item}
              onClick={() => navigateToRoute(item.route)}
              translatedText={t(item.translationKey)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;