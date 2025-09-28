import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import ImageCarousel from '../components/ImageCarousel';
import Reviews from '../components/Reviews';
import Footer from '../components/Footer';
import { getTimelineImages } from '../utils/imageLoader';

// Constants
const SCROLL_OFFSET = 120;
const TIMELINE_RECALC_DELAY = 100;
const TIMELINE_INIT_DELAY = 500;
// const MOBILE_BREAKPOINT = 1024; // Unused for now

// Types
interface ConnectionPath {
  d: string;
}

// interface TimelineState {
//   paths: ConnectionPath[];
//   viewBox: string;
// }

interface TimelineSection {
  title: string;
  content: string;
}

interface AboutPageProps {}

// Components
const ProfileImage: React.FC = () => (
  <div className="bg-gray-200 rounded-3xl overflow-hidden max-w-[520px]">
    <img
      src="/joshua-portrait.jpg"
      alt="Joshua Maurizio"
      className="w-full h-auto object-cover max-h-[725px] max-w-[520px]"
      loading="eager"
      decoding="async"
    />
  </div>
);

const CertificationsList: React.FC<{ certifications: string[] }> = ({ certifications }) => (
  <ul className="space-y-2">
    {certifications.map((cert, index) => (
      <li key={index} className="text-xs sm:text-sm md:text-lg lg:text-xl text-gray-700 flex items-center">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-900 rounded-full mr-2 sm:mr-3" aria-hidden="true" />
        {cert}
      </li>
    ))}
  </ul>
);

const SpecializationsList: React.FC<{ specializations: string[] }> = ({ specializations }) => (
  <ul className="space-y-2">
    {specializations.map((spec, index) => (
      <li key={index} className="text-xs sm:text-sm md:text-lg lg:text-xl text-gray-700 flex items-center">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-900 rounded-full mr-2 sm:mr-3" aria-hidden="true" />
        {spec}
      </li>
    ))}
  </ul>
);

const TimelineConnectionPoint: React.FC = () => (
  <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2">
    <div className="w-4 h-4 bg-gray-900 rounded-full border-4 border-white shadow-lg" />
  </div>
);

const TimelineSVGPath: React.FC = () => (
  <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gray-300 h-full hidden lg:block">
    <svg className="w-full h-full" viewBox="0 0 4 100" preserveAspectRatio="none">
      <path
        d="M2,0 Q1,10 2,20 Q3,30 2,40 Q1,50 2,60 Q3,70 2,80 Q1,90 2,100"
        stroke="#374151"
        strokeWidth="4"
        fill="none"
      />
    </svg>
  </div>
);

const About: React.FC<AboutPageProps> = () => {
  const { t } = useTranslation();
  const timelineRef = useRef<HTMLDivElement>(null);
  // const [timelineState, setTimelineState] = useState<TimelineState>({ paths: [], viewBox: "0 0 100 100" }); // Unused for now
  const connectionPointsRef = useRef<(HTMLDivElement | null)[]>([]);

  const calculateConnectionPaths = useCallback(() => {
    if (!timelineRef.current || typeof window === 'undefined') return;

    const timeline = timelineRef.current;
    const isMobile = window.innerWidth < 1024; // lg breakpoint

    if (!isMobile) {
      // setTimelineState({ paths: [], viewBox: "0 0 100 100" }); // Unused for now
      return;
    }

    const paths: ConnectionPath[] = [];
    const points = connectionPointsRef.current.filter(Boolean);

    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];

      if (!currentPoint || !nextPoint) continue;

      const currentRect = currentPoint.getBoundingClientRect();
      const nextRect = nextPoint.getBoundingClientRect();

      // Torniamo a getBoundingClientRect ma con coordinate corrette
      const timelineRect = timeline.getBoundingClientRect();

      // METODO SEMPLICE: usa coordinate del punto + offset calibrato manualmente
      const currentX = currentRect.left + currentRect.width / 2 - timelineRect.left;
      const currentY = currentRect.top + currentRect.height / 2 - timelineRect.top - 100; // Riduco a -100px
      const nextX = nextRect.left + nextRect.width / 2 - timelineRect.left;
      const nextY = nextRect.top + nextRect.height / 2 - timelineRect.top - 100; // Riduco a -100px

      // Crea il percorso curvo con coordinate pixel
      const verticalDistance = Math.abs(nextY - currentY);
      const tunnelOffset = Math.max(verticalDistance * 0.25, 10);
      const tunnelY = currentY + tunnelOffset;

      const isLeftToRight = i % 2 === 0;
      const curveStartX = isLeftToRight ? currentX + 60 : currentX - 60;
      const curveEndX = isLeftToRight ? nextX - 60 : nextX + 60;

      const pathData = [
        `M${currentX},${currentY}`,
        `Q${currentX},${tunnelY} ${curveStartX},${tunnelY}`,
        `L${curveEndX},${tunnelY}`,
        `Q${nextX},${tunnelY} ${nextX},${nextY}`
      ].join(' ');

      paths.push({ d: pathData });
    }


    // setTimelineState({
    //   paths,
    //   viewBox: `0 0 ${timelineRect.width} ${timelineRect.height}`
    // }); // Unused for now
  }, []);

  const handleScrollToTimeline = useCallback(() => {
    const timelineSection = document.getElementById('timeline-section');
    if (timelineSection) {
      const elementPosition = timelineSection.offsetTop;
      const offsetPosition = elementPosition - SCROLL_OFFSET;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    calculateConnectionPaths();

    const handleResize = () => {
      calculateConnectionPaths();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateConnectionPaths]);

  useEffect(() => {
    const timer = setTimeout(calculateConnectionPaths, TIMELINE_RECALC_DELAY);
    return () => clearTimeout(timer);
  }, [t, calculateConnectionPaths]);

  useEffect(() => {
    const timer = setTimeout(calculateConnectionPaths, TIMELINE_INIT_DELAY);
    return () => clearTimeout(timer);
  }, [calculateConnectionPaths]);

  // Computed values
  const timelineSections = useMemo(() => {
    return t('about.timeline.sections', { returnObjects: true }) as TimelineSection[];
  }, [t]);

  const certifications = useMemo(() => {
    return t('about.certifications.list', { returnObjects: true }) as string[];
  }, [t]);

  const specializations = useMemo(() => {
    return t('about.specializations.list', { returnObjects: true }) as string[];
  }, [t]);

  // Component styles
  const pageClassName = 'min-h-screen bg-gray-50';
  const mainClassName = 'pt-28 sm:pt-40 px-6 lg:px-16 pb-16 lg:pb-20';
  const gridClassName = 'grid grid-cols-1 xs:grid-cols-5 lg:grid-cols-5 gap-6 lg:gap-12 items-start';
  const titleClassName = 'text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900';
  const descriptionClassName = 'text-xs sm:text-sm md:text-lg lg:text-xl text-gray-700 leading-relaxed';
  const sectionTitleClassName = 'text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900';
  const buttonClassName = 'bg-gray-900 text-white px-3 sm:px-4 md:px-8 py-1.5 sm:py-2 md:py-4 font-medium hover:bg-gray-800 transition-colors rounded-xl text-xs sm:text-sm md:text-lg';
  const timelineTitleClassName = 'text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-16';

  return (
    <div className={pageClassName} style={{ scrollBehavior: 'smooth' }}>
      <Helmet>
        <title>{t('pages.about.title')}</title>
      </Helmet>
      <Header />

      <main className={mainClassName}>
        <div className="w-full">
          <div className={gridClassName}>

            {/* Profile Image */}
            <div className="order-1 lg:order-1 xs:col-span-2 lg:col-span-2 lg:justify-end flex">
              <ProfileImage />
            </div>

            {/* Content */}
            <div className="order-2 lg:order-2 xs:col-span-3 lg:col-span-3 space-y-8 w-full">
              <h1 className={titleClassName}>
                {t('about.title')}
              </h1>

              <div className="space-y-8">
                <p className={descriptionClassName}>
                  {t('about.description')}
                </p>

                {/* Certifications */}
                <div className="space-y-4">
                  <h3 className={sectionTitleClassName}>
                    {t('about.certifications.title')}
                  </h3>
                  <CertificationsList certifications={certifications} />
                </div>

                {/* Specializations */}
                <div className="space-y-4">
                  <h3 className={sectionTitleClassName}>
                    {t('about.specializations.title')}
                  </h3>
                  <SpecializationsList specializations={specializations} />
                </div>
              </div>

              <button
                onClick={handleScrollToTimeline}
                className={buttonClassName}
                aria-label={`${t('about.learnMore')} - Scroll to timeline section`}
              >
                {t('about.learnMore')}
              </button>
            </div>

          </div>
        </div>

        {/* Timeline Section */}
        <section id="timeline-section" className="mt-32 max-w-7xl mx-auto" ref={timelineRef} aria-labelledby="timeline-title">
          <h2 id="timeline-title" className={timelineTitleClassName}>
            {t('about.timeline.title')}
          </h2>

          <div className="relative">
            <TimelineSVGPath />

            {/* Timeline sections */}
            {timelineSections.map((section, index) => {
              const isLeft = index % 2 === 0;
              const isEven = index % 2 === 0;

              return (
                <article key={index} className="relative mb-16 lg:mb-24 last:mb-0">
                  {/* Desktop Layout */}
                  <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-center">
                    {/* Desktop Image */}
                    <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
                      <div className="w-full aspect-square max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                        <ImageCarousel
                          images={getTimelineImages(index)}
                          alt={`${section.title} - Timeline image ${index + 1}`}
                          className="w-full h-full"
                          autoplay={true}
                          autoplayInterval={5000}
                          pauseOnHover={true}
                          transitionType="fade"
                          enableSwipe={false}
                        />
                      </div>
                    </div>

                    {/* Desktop Content */}
                    <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'} space-y-6`}>
                      <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900">
                        {section.title}
                      </h3>
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-700 leading-relaxed">
                        {section.content}
                      </p>
                    </div>

                    <TimelineConnectionPoint />
                  </div>

                  {/* Mobile Layout */}
                  <div className="lg:hidden">
                    <div className={`flex items-start gap-6 px-4 ${!isLeft ? 'flex-row-reverse' : ''}`}>
                      {/* Mobile Image */}
                      <div className="w-28 h-28 xs:w-40 xs:h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 lg:w-72 lg:h-72 flex-shrink-0">
                        <ImageCarousel
                          images={getTimelineImages(index)}
                          alt={`${section.title} - Timeline image ${index + 1}`}
                          className="w-full h-full rounded-xl"
                          autoplay={true}
                          autoplayInterval={5000}
                          pauseOnHover={true}
                          transitionType="fade"
                          enableSwipe={false}
                        />
                      </div>

                      {/* Mobile Content */}
                      <div className="flex-1 space-y-2">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                          {section.title}
                        </h3>
                        <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
      <Reviews type="public" />
      <Footer />
    </div>
  );
};

export default About;