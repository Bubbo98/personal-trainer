import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Reviews from '../components/Reviews';
import Footer from '../components/Footer';

// Types
interface HomePageProps {}

const Home: React.FC<HomePageProps> = () => {
  const { t } = useTranslation();
  const pageClassName = 'h-full w-full';

  return (
    <div className={pageClassName}>
      <Helmet>
        <title>{t('pages.home.title')}</title>
      </Helmet>
      <Header />
      <Hero />
      <Reviews />
      <Footer />
    </div>
  );
};

export default Home;