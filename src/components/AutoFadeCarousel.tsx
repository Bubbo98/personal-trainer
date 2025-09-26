import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Constants
const DEFAULT_INTERVAL = 3000;
const FADE_DURATION = 1000;

// Types
interface CarouselImage {
  src: string;
  alt: string;
  loading?: 'lazy' | 'eager';
}

interface AutoFadeCarouselProps {
  images: string[];
  altTexts: string[];
  className?: string;
  interval?: number;
  autoPlay?: boolean;
  pauseOnHover?: boolean;
  showIndicators?: boolean;
  fadeDuration?: number;
  onImageChange?: (index: number) => void;
  'aria-label'?: string;
}

// Custom hook for carousel logic
const useCarousel = (
  imagesLength: number,
  interval: number,
  autoPlay: boolean,
  onImageChange?: (index: number) => void
) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex === imagesLength - 1 ? 0 : prevIndex + 1;
      onImageChange?.(nextIndex);
      return nextIndex;
    });
  }, [imagesLength, onImageChange]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < imagesLength) {
      setCurrentIndex(index);
      onImageChange?.(index);
    }
  }, [imagesLength, onImageChange]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  useEffect(() => {
    if (!autoPlay || isPaused || imagesLength <= 1) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(goToNext, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoPlay, isPaused, interval, imagesLength, goToNext]);

  return {
    currentIndex,
    goToNext,
    goToSlide,
    pause,
    resume,
    isPaused
  };
};

const AutoFadeCarousel: React.FC<AutoFadeCarouselProps> = ({
  images,
  altTexts,
  className = "",
  interval = DEFAULT_INTERVAL,
  autoPlay = true,
  pauseOnHover = true,
  showIndicators = false,
  fadeDuration = FADE_DURATION,
  onImageChange,
  'aria-label': ariaLabel = "Image carousel"
}) => {
  // Always call hooks first - before any conditional logic
  const {
    currentIndex,
    goToNext,
    goToSlide,
    pause,
    resume,
    isPaused
  } = useCarousel(images.length, interval, autoPlay, onImageChange);

  // Prepare carousel images
  const carouselImages: CarouselImage[] = useMemo(() =>
    images.map((src, index) => ({
      src,
      alt: altTexts[index] || `Image ${index + 1}`,
      loading: index === 0 ? 'eager' : 'lazy'
    })),
    [images, altTexts]
  );

  // Event handlers - all hooks must come before any early returns
  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) pause();
  }, [pauseOnHover, pause]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) resume();
  }, [pauseOnHover, resume]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        goToSlide(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        goToNext();
        break;
      case ' ':
        event.preventDefault();
        if (isPaused) resume();
        else pause();
        break;
    }
  }, [currentIndex, images.length, goToSlide, goToNext, isPaused, pause, resume]);

  // Validation - after all hooks
  if (images.length !== altTexts.length) {
    console.warn('AutoFadeCarousel: images and altTexts arrays must have the same length');
  }

  if (images.length === 0) {
    return null;
  }

  // Component styles
  const containerClassName = `relative overflow-hidden ${className}`;
  const imageContainerClassName = (isActive: boolean) =>
    `absolute inset-0 transition-opacity ease-in-out ${
      isActive ? 'opacity-100' : 'opacity-0'
    }`;

  const imageClassName = "w-full h-full object-cover";
  const indicatorsClassName = "absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2";
  const indicatorClassName = (isActive: boolean) =>
    `w-2 h-2 rounded-full cursor-pointer transition-colors ${
      isActive ? 'bg-white' : 'bg-white/50'
    }`;

  return (
    <div
      className={containerClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Images */}
      {carouselImages.map((image, index) => (
        <div
          key={`${image.src}-${index}`}
          className={imageContainerClassName(index === currentIndex)}
          style={{
            transitionDuration: `${fadeDuration}ms`
          }}
          aria-hidden={index !== currentIndex}
        >
          <img
            src={image.src}
            alt={image.alt}
            className={imageClassName}
            loading={image.loading}
            decoding="async"
            onError={(e) => {
              console.error(`Failed to load image: ${image.src}`);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ))}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div className={indicatorsClassName} role="tablist">
          {images.map((_, index) => (
            <button
              key={index}
              className={indicatorClassName(index === currentIndex)}
              onClick={() => goToSlide(index)}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to slide ${index + 1} of ${images.length}`}
              tabIndex={index === currentIndex ? 0 : -1}
            />
          ))}
        </div>
      )}

      {/* Screen reader announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {`Image ${currentIndex + 1} of ${images.length}: ${altTexts[currentIndex]}`}
      </div>
    </div>
  );
};

export default AutoFadeCarousel;