import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Reviews from '../components/Reviews';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

const Home = () => {
  const { t } = useTranslation('common');
  usePageMeta({ title: t('meta.home.title'), description: t('meta.home.description'), path: '/' });

  return (
    <div className="min-h-full w-full">
      <Header />
      <main>
        <Hero />
        <Reviews />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
