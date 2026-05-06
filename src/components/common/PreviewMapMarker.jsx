import React from 'react';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';
import { MapPin } from 'lucide-react';
import styles from './MapViewport.module.css';

export default function PreviewMapMarker({
  position,
  label,
  onClick,
  bubbleBackground,
  dotColor,
  className = '',
  zIndex = 80,
  active = false,
  title,
}) {
  if (!position) {
    return null;
  }

  const markerClassName = `${styles.marker} ${active ? styles.activeMarker : ''} ${className}`.trim();

  return (
    <CustomOverlayMap position={position} yAnchor={1} zIndex={zIndex}>
      <button
        type="button"
        className={markerClassName}
        title={title || label || '장소'}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
      >
        <div className={styles.markerBubble} style={bubbleBackground ? { background: bubbleBackground } : undefined}>
          <div
            className={styles.markerDot}
            style={{ background: dotColor || '#60a5fa' }}
          />
          <span className={styles.markerLabel}>{label || '장소'}</span>
        </div>
        <MapPin
          size={42}
          fill="rgba(15, 23, 42, 0.92)"
          color="white"
          className={styles.markerPin}
        />
      </button>
    </CustomOverlayMap>
  );
}
