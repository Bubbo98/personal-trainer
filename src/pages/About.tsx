import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import FadeCarousel from '../components/FadeCarousel';
import Reviews from '../components/Reviews';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

// Photo folder and number of photos of each timeline step, in order
const TIMELINE_PHOTOS: [folder: string, count: number][] = [
  ['Primo', 2],
  ['Secondo', 1],
  ['Terzo', 1],
  ['Quarto', 5],
  ['Quinto', 5],
  ['Sesto', 2],
  ['Settimo', 3],
  ['Ottavo', 2],
  ['Nono', 4],
  ['Decimo', 4],
  ['Undicesimo', 1],
];

const photosOf = (step: number): string[] => {
  const [folder, count] = TIMELINE_PHOTOS[step] ?? [];
  return folder ? Array.from({ length: count }, (_, i) => `/ChiSono/${folder}/${i + 1}.webp`) : [];
};

interface TimelineStep {
  title: string;
  content: string;
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="text-sm md:text-lg lg:text-xl text-gray-700 flex items-center">
        <span className="w-2 h-2 bg-gray-900 rounded-full mr-3 flex-shrink-0" aria-hidden="true" />
        {item}
      </li>
    ))}
  </ul>
);

const About = () => {
  const { t } = useTranslation(['public', 'common']);
  usePageMeta({ title: t('common:meta.about.title'), description: t('common:meta.about.description'), path: '/about' });

  const steps = t('about.timeline.sections', { returnObjects: true }) as TimelineStep[];
  const certifications = t('about.certifications.list', { returnObjects: true }) as string[];
  const specializations = t('about.specializations.list', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20">
        <div className="grid grid-cols-1 xs:grid-cols-5 gap-6 lg:gap-12 items-start">
          <div className="xs:col-span-2 lg:justify-end flex">
            <img
              src="/joshua-portrait.webp"
              alt={t('about.portraitAlt')}
              width={520}
              height={780}
              className="w-full h-auto object-cover rounded-3xl bg-gray-200 max-h-[725px] max-w-[520px]"
              decoding="async"
            />
          </div>

          <div className="xs:col-span-3 space-y-8 w-full">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900">{t('about.title')}</h1>
            <p className="text-sm md:text-lg lg:text-xl text-gray-700 leading-relaxed">{t('about.description')}</p>
            <section className="space-y-4">
              <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{t('about.certifications.title')}</h2>
              <Bullets items={certifications} />
            </section>
            <section className="space-y-4">
              <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{t('about.specializations.title')}</h2>
              <Bullets items={specializations} />
            </section>
            <a href="#timeline" className="inline-block bg-gray-900 text-white px-4 md:px-8 py-2 md:py-4 font-medium hover:bg-gray-800 transition-colors rounded-xl text-sm md:text-lg">
              {t('about.learnMore')}
            </a>
          </div>
        </div>

        <section id="timeline" className="mt-32 max-w-7xl mx-auto scroll-mt-32" aria-labelledby="timeline-title">
          <h2 id="timeline-title" className="text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-16">
            {t('about.timeline.title')}
          </h2>

          <ol className="relative">
            {/* The line joining the steps, on large screens */}
            <span className="absolute left-1/2 -translate-x-1/2 w-1 bg-gray-300 h-full hidden lg:block" aria-hidden="true" />
            {steps.map((step, index) => {
              const even = index % 2 === 0;
              return (
                <li key={step.title} className="relative mb-16 lg:mb-24 last:mb-0">
                  <article className={`flex items-start gap-6 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center ${even ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-28 h-28 xs:w-40 xs:h-40 sm:w-52 sm:h-52 lg:w-full lg:h-auto lg:aspect-square lg:max-w-lg flex-shrink-0 ${even ? 'lg:order-1' : 'lg:order-2 lg:justify-self-end'}`}>
                      <FadeCarousel
                        images={photosOf(index)}
                        alt={t('about.timelineImages', { title: step.title })}
                        label={t('about.timelineImages', { title: step.title })}
                        className="w-full h-full rounded-xl"
                      />
                    </div>
                    <div className={`flex-1 space-y-2 lg:space-y-6 ${even ? 'lg:order-2' : 'lg:order-1'}`}>
                      <h3 className="text-base sm:text-xl lg:text-4xl xl:text-5xl font-bold text-gray-900">{step.title}</h3>
                      <p className="text-xs sm:text-base lg:text-xl xl:text-2xl text-gray-700 leading-relaxed">{step.content}</p>
                    </div>
                  </article>
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gray-900 rounded-full border-4 border-white shadow-lg hidden lg:block" aria-hidden="true" />
                </li>
              );
            })}
          </ol>
        </section>
      </main>
      <Reviews type="public" />
      <Footer />
    </div>
  );
};

export default About;
