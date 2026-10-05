import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

const NotFound = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t('notFound.title'), noindex: true });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
        <p className="text-6xl font-bold text-gray-900 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t('notFound.title')}</h1>
        <p className="text-gray-600 mb-8">{t('notFound.message')}</p>
        <Link to="/" className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors">
          {t('notFound.backHome')}
        </Link>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
