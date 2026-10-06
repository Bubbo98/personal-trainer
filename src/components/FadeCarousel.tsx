import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface FadeCarouselProps {
  images: string[];
  /** Alt text of each image (or one for all). */
  alt: string | string[];
  className?: string;
  interval?: number;
  /** Arrows on top of the images. */
  arrows?: boolean;
  label: string;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Cross-fading slideshow: autoplays (paused on hover/focus and for users who
 * prefer reduced motion), with dots and optional arrows.
 */
const FadeCarousel = ({ images, alt, className = '', interval = 5000, arrows = false, label }: FadeCarouselProps) => {
  const { t } = useTranslation('common');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const count = images.length;
  const altOf = (i: number) => (Array.isArray(alt) ? (alt[i] ?? alt[0]) : alt);

  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(timer);
  }, [count, paused, reduced, interval]);

  if (count === 0) return null;
  if (count === 1) return <img src={images[0]} alt={altOf(0)} loading="lazy" decoding="async" className={`object-cover ${className}`} />;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gray-200 ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={altOf(i)}
          aria-hidden={i !== index}
          loading={i === 0 ? 'lazy' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}

      {arrows && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            aria-label={t('carousel.previous')}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <FiChevronLeft className="w-5 h-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label={t('carousel.next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <FiChevronRight className="w-5 h-5" aria-hidden />
          </button>
        </>
      )}

      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t('carousel.goTo', { number: i + 1, total: count })}
            aria-current={i === index || undefined}
            className={`h-2.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2.5 bg-white/60 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FadeCarousel;
