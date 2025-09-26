import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Constants
const SWIPE_THRESHOLD = 50;
const DRAG_RESISTANCE = 0.3;
const TRANSITION_DURATION = 300;

// Types
interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  showControls?: boolean;
  showIndicators?: boolean;
  enableSwipe?: boolean;
  onImageChange?: (index: number) => void;
  'aria-label'?: string;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  dragX: number;
}

// Custom hook for drag functionality
const useDragCarousel = (
  imagesLength: number,
  currentIndex: number,
  onNavigate: (direction: 'prev' | 'next') => void
) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    dragX: 0
  });

  const handleDragStart = useCallback((clientX: number) => {
    setDragState({
      isDragging: true,
      startX: clientX,
      dragX: 0
    });
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!dragState.isDragging) return;

    setDragState(prev => ({
      ...prev,
      dragX: clientX - prev.startX
    }));
  }, [dragState.isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    if (Math.abs(dragState.dragX) > SWIPE_THRESHOLD) {
      const direction = dragState.dragX > 0 ? 'prev' : 'next';
      onNavigate(direction);
    }

    setDragState({
      isDragging: false,
      startX: 0,
      dragX: 0
    });
  }, [dragState.isDragging, dragState.dragX, onNavigate]);

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd
  };
};

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt,
  className = "",
  showControls = true,
  showIndicators = true,
  enableSwipe = true,
  onImageChange,
  'aria-label': ariaLabel = "Image carousel"
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onImageChange?.(newIndex);
  }, [currentIndex, images.length, onImageChange]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    onImageChange?.(newIndex);
  }, [currentIndex, images.length, onImageChange]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < images.length && index !== currentIndex) {
      setCurrentIndex(index);
      onImageChange?.(index);
    }
  }, [currentIndex, images.length, onImageChange]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      goToPrevious();
    } else {
      goToNext();
    }
  }, [goToPrevious, goToNext]);

  // Drag functionality
  const { dragState, handleDragStart, handleDragMove, handleDragEnd } = useDragCarousel(
    images.length,
    currentIndex,
    handleNavigate
  );

  // Event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableSwipe) return;
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [enableSwipe, handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enableSwipe) return;
    handleDragMove(e.clientX);
  }, [enableSwipe, handleDragMove]);

  const handleMouseUp = useCallback(() => {
    if (!enableSwipe) return;
    handleDragEnd();
  }, [enableSwipe, handleDragEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return;
    handleDragStart(e.touches[0].clientX);
  }, [enableSwipe, handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return;
    handleDragMove(e.touches[0].clientX);
  }, [enableSwipe, handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipe) return;
    handleDragEnd();
  }, [enableSwipe, handleDragEnd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        goToPrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        goToNext();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(images.length - 1);
        break;
    }
  }, [goToPrevious, goToNext, goToSlide, images.length]);

  // Computed styles
  const containerClassName = useMemo(() => {
    const baseClasses = `bg-gray-200 rounded-2xl overflow-hidden relative group select-none ${className}`;
    return images.length > 1 ? baseClasses : `${baseClasses} pointer-events-none`;
  }, [className, images.length]);

  const imageStyle = useMemo(() => ({
    transform: dragState.isDragging ? `translateX(${dragState.dragX * DRAG_RESISTANCE}px)` : 'translateX(0)',
    transition: dragState.isDragging ? 'none' : `transform ${TRANSITION_DURATION}ms ease-out`
  }), [dragState.isDragging, dragState.dragX]);

  const cursorStyle = useMemo(() => {
    if (!enableSwipe || images.length === 1) return 'default';
    return dragState.isDragging ? 'grabbing' : 'grab';
  }, [enableSwipe, images.length, dragState.isDragging]);

  // Early return for validation
  if (images.length === 0) {
    return null;
  }

  // Single image case
  if (images.length === 1) {
    return (
      <div className={containerClassName} role="img" aria-label={`${alt}: Single image`}>
        <img
          src={images[0]}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            console.error(`Failed to load image: ${images[0]}`);
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      style={{ cursor: cursorStyle }}
      role="region"
      aria-label={ariaLabel}
      aria-live="polite"
      tabIndex={0}
    >
      {/* Main Image */}
      <img
        src={images[currentIndex]}
        alt={`${alt} ${currentIndex + 1} of ${images.length}`}
        className="w-full h-full object-cover pointer-events-none"
        style={imageStyle}
        draggable={false}
        loading={currentIndex === 0 ? 'eager' : 'lazy'}
        decoding="async"
        onError={(e) => {
          console.error(`Failed to load image: ${images[currentIndex]}`);
          e.currentTarget.style.display = 'none';
        }}
      />

      {/* Navigation Controls */}
      {showControls && images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 opacity-80 hover:opacity-100 transition-all duration-300 z-10 hidden sm:block focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/70"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 opacity-80 hover:opacity-100 transition-all duration-300 z-10 hidden sm:block focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/70"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div
          className="absolute bottom-1 sm:bottom-2 md:bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-2 opacity-90 z-10"
          role="tablist"
          aria-label="Image indicators"
        >
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white focus:ring-offset-1 ${
                index === currentIndex
                  ? 'bg-white scale-110'
                  : 'bg-white/60 hover:bg-white/80'
              }`}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to image ${index + 1} of ${images.length}`}
              tabIndex={index === currentIndex ? 0 : -1}
            />
          ))}
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Image ${currentIndex + 1} of ${images.length}: ${alt}`}
      </div>
    </div>
  );
};

export default ImageCarousel;