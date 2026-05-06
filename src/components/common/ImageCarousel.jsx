import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import styles from './ImageCarousel.module.css';

export default function ImageCarousel({ images = [], alt = 'store image' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <ImageIcon size={48} color="rgba(255,255,255,0.5)" />
        <span>No image available</span>
      </div>
    );
  }

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe || isRightSwipe) console.log('swipe', isLeftSwipe ? 'left' : 'right');
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div 
      className={styles.carouselWrapper}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div 
        className={styles.carouselInner} 
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((src, idx) => (
          <div className={styles.slide} key={idx}>
            <img src={src} alt={`${alt} ${idx + 1}`} className={styles.image} />
            <div className={styles.overlay} />
          </div>
        ))}
      </div>
      
      {images.length > 1 && (
        <>
          <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
            <ChevronLeft size={24} />
          </button>
          <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={(e) => { e.stopPropagation(); handleNext(); }}>
            <ChevronRight size={24} />
          </button>
          <div className={styles.indicatorContainer}>
            {images.map((_, idx) => (
              <div 
                key={idx} 
                className={`${styles.indicator} ${idx === currentIndex ? styles.active : ''}`}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
