import React, { useEffect, useState } from 'react';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { MapPin } from 'lucide-react';
import styles from './MapViewport.module.css';

const DEFAULT_CENTER = { lat: 37.5065, lng: 127.0536 };

function normalizePosition(item, index) {
  if (item?.position?.lat && item?.position?.lng) {
    return item.position;
  }

  if (item?.lat && item?.lng) {
    return { lat: item.lat, lng: item.lng };
  }

  return {
    lat: DEFAULT_CENTER.lat + (index * 0.0012),
    lng: DEFAULT_CENTER.lng + (index * 0.0012),
  };
}

export default function MapViewport({
  center = DEFAULT_CENTER,
  items = [],
  level = 4,
  className = '',
  activeItemKey = '',
  onItemClick,
  showMyLocation = false,
  myLocation = null,
  loadingMessage = '카카오 지도를 불러오는 중입니다...',
}) {
  const [isKakaoReady, setIsKakaoReady] = useState(() => (
    typeof window !== 'undefined' && Boolean(window.kakao?.maps)
  ));

  useEffect(() => {
    if (isKakaoReady) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (window.kakao?.maps) {
        setIsKakaoReady(true);
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [isKakaoReady]);

  if (!isKakaoReady) {
    return (
      <div className={`${styles.fallback} ${className}`.trim()}>
        <MapPin size={28} className={styles.fallbackIcon} />
        <p className={styles.fallbackText}>{loadingMessage}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.viewport} ${className}`.trim()}>
      <Map center={center} style={{ width: '100%', height: '100%' }} level={level}>
        {items.map((item, index) => {
          const position = normalizePosition(item, index);
          const isActive = activeItemKey && item.key === activeItemKey;

          return (
            <CustomOverlayMap key={item.key || `${item.label || 'item'}-${index}`} position={position} yAnchor={1} zIndex={isActive ? 120 : 80}>
              <button
                type="button"
                className={`${styles.marker} ${isActive ? styles.activeMarker : ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onItemClick?.(item, position);
                }}
              >
                <div className={styles.markerBubble}>
                  <div
                    className={styles.markerDot}
                    style={{ background: item.color || '#60a5fa' }}
                  />
                  <span className={styles.markerLabel}>{item.label || '장소'}</span>
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
        })}

        {showMyLocation && myLocation && (
          <CustomOverlayMap position={myLocation} zIndex={60}>
            <div className={styles.myLocationMarker}>
              <div className={styles.myLocationCore} />
              <div className={styles.myLocationPulse} />
            </div>
          </CustomOverlayMap>
        )}
      </Map>
    </div>
  );
}
