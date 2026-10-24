import { useTranslation } from 'react-i18next';
import { FiBarChart2, FiClipboard, FiPlayCircle } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';
import TrialWizard from '../features/trial-signup/TrialWizard';

interface Item {
  title: string;
  text: string;
}

const INCLUDE_ICONS = [FiClipboard, FiPlayCircle, FiBarChart2];

/** /prova-gratuita — 7 days of the online coaching method for free: questionnaire, signup, link by email. */
const FreeTrial = () => {
  const { t } = useTranslation(['public', 'common']);
  usePageMeta({ title: t('common:meta.trial.title'), description: t('common:meta.trial.description'), path: '/prova-gratuita' });

  const includes = t('trialSignup.includes', { returnObjects: true }) as Item[];
  const steps = t('trialSignup.how.steps', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <section className="pt-28 sm:pt-40 pb-16 lg:pb-24 px-6 lg:px-16" aria-labelledby="trial-title">
          <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 items-start">
            <div className="space-y-8">
              <div>
                <p className="inline-block bg-gray-900 text-white text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full mb-4">{t('trialSignup.badge')}</p>
                <h1 id="trial-title" className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
                  {t('trialSignup.title')}
                </h1>
                <p className="text-lg text-gray-600 mt-4">{t('trialSignup.subtitle')}</p>
              </div>

              <ul className="space-y-4">
                {includes.map((item, i) => {
                  const Icon = INCLUDE_ICONS[i % INCLUDE_ICONS.length];
                  return (
                    <li key={item.title} className="flex gap-4">
                      <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-white shadow flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-900" aria-hidden />
                      </span>
                      <div>
                        <h2 className="font-semibold text-gray-900">{item.title}</h2>
                        <p className="text-gray-600 text-sm">{item.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('trialSignup.how.title')}</h2>
                <ol className="space-y-2">
                  {steps.map((step, i) => (
                    <li key={step} className="flex gap-3 text-gray-700">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:sticky lg:top-32">
              <TrialWizard />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FreeTrial;
