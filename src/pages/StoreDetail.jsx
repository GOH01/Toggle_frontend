import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Map, MapMarker } from 'react-kakao-maps-sdk';
import LoginModal from '../components/common/LoginModal';
import StoreTabbedDetail from '../components/store/StoreTabbedDetail';
import {
  addFavoriteStore,
  getUnregisteredStoreBlockMessage,
  isUnregisteredStorePlace,
  removeFavoriteStore,
} from '../lib/favorites';
import { isFavoritePlace, isLoggedIn as getIsLoggedIn } from '../lib/session';
import { getStoreOperatingInfoByCandidates } from '../lib/storeRuntime';
import { useStoreLookupByExternalPlaceId } from '../hooks/useStoreLookupByExternalPlaceId';
import { mapStoreToPlace } from '../lib/mappers';
import styles from './StoreDetail.module.css';

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavoriteSubmitting, setIsFavoriteSubmitting] = useState(false);
  const isLoggedIn = getIsLoggedIn();
  const previewStore = location.state?.placePreview || null;
  const { storeMatch, isLoading: isLookupLoading } = useStoreLookupByExternalPlaceId(id);

  const baseStore = useMemo(
    () => (storeMatch ? mapStoreToPlace(storeMatch) : previewStore),
    [storeMatch, previewStore],
  );
  const runtimeStoreId = baseStore?.internalStoreId ?? baseStore?.id ?? id;
  const operatingInfo = getStoreOperatingInfoByCandidates([runtimeStoreId, id]);

  const mergedStore = useMemo(() => {
    if (!baseStore) return null;

    return {
      ...baseStore,
      businessHours: operatingInfo ? `${operatingInfo.openTime} - ${operatingInfo.closeTime}` : baseStore.businessHours,
      hasBreakTime: operatingInfo ? true : baseStore.hasBreakTime,
      breakTime: operatingInfo ? `${operatingInfo.breakStart} - ${operatingInfo.breakEnd}` : baseStore.breakTime,
    };
  }, [baseStore, operatingInfo]);

  const store = mergedStore;
  const isRegisteredStore = !isUnregisteredStorePlace(store);
  const [isFavorite, setIsFavorite] = useState(() => (mergedStore ? isFavoritePlace('STORE', mergedStore) : false));
  const [reviewSummaryOverride, setReviewSummaryOverride] = useState(null);

  const [sheetHeight, setSheetHeight] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(null);
  const [startHeight, setStartHeight] = useState(null);

  const handleDragStart = useCallback((e) => {
    const y = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    setDragStartY(y);
    setStartHeight(sheetHeight);
    setIsDragging(true);
  }, [sheetHeight]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging || dragStartY === null) return;
    const y = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const deltaY = y - dragStartY;
    const deltaVh = (deltaY / window.innerHeight) * 100;

    let newHeight = startHeight - deltaVh;
    if (newHeight > 85) newHeight = 85;
    if (newHeight < 25) newHeight = 25;

    setSheetHeight(newHeight);
  }, [dragStartY, isDragging, startHeight]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStartY(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [handleDragEnd, handleDragMove, isDragging]);

  const reviewSummary = reviewSummaryOverride || {
    averageRating: store?.reviewAverageRating ?? store?.rating ?? null,
    reviewCount: store?.reviewCount ?? 0,
  };

  useEffect(() => {
    setReviewSummaryOverride(null);
  }, [store?.id]);

  useEffect(() => {
    const syncFavoriteState = () => {
      if (mergedStore) {
        setIsFavorite(isFavoritePlace('STORE', mergedStore));
      }
    };

    syncFavoriteState();
    window.addEventListener('favoritesChanged', syncFavoriteState);
    return () => window.removeEventListener('favoritesChanged', syncFavoriteState);
  }, [mergedStore]);

  const handleDirections = () => {
    if (store && store.lat && store.lng) {
      window.open(`https://map.kakao.com/link/to/${store.name},${store.lat},${store.lng}`, '_blank');
    } else {
      alert('위치 정보가 없습니다.');
    }
  };

  const handleShare = () => {
    if (!store) return;
    const shareData = {
      title: store.name,
      text: `[Toggle] ${store.name} (${store.category}) 현재 상태를 확인해 보세요!`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('주소가 클립보드에 복사되었습니다! 친구에게 공유해 보세요. 📋');
    }
  };

  const handleFavoriteClick = async () => {
    if (!isRegisteredStore) {
      alert(getUnregisteredStoreBlockMessage('favorite'));
      return;
    }

    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    if (isFavoriteSubmitting || !store) {
      return;
    }

    setIsFavoriteSubmitting(true);

    try {
      if (isFavorite) {
        await removeFavoriteStore(store);
        setIsFavorite(false);
      } else {
        await addFavoriteStore(store);
        setIsFavorite(true);
      }
    } catch (error) {
      alert(error.message || '즐겨찾기 처리 중 오류가 발생했습니다.');
    } finally {
      setIsFavoriteSubmitting(false);
    }
  };

  const handleReviewSummaryChange = (nextSummary) => {
    setReviewSummaryOverride(nextSummary || null);
  };

  if (isLookupLoading) return <div>상태를 불러오는 중입니다...</div>;
  if (!store || !store.name) return <div>장소 정보를 찾을 수 없습니다.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.coverArea}>
        <Map center={{ lat: store.lat, lng: store.lng }} style={{ width: '100%', height: '100%' }} level={3}>
          <MapMarker position={{ lat: store.lat, lng: store.lng }} />
        </Map>
      </div>

      <div
        className={styles.contentSheet}
        style={{
          height: `${sheetHeight}dvh`,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className={styles.dragWrapper}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className={styles.dragHandle} />
        </div>

        <div className={styles.scrollArea}>
          <StoreTabbedDetail
            key={store.id}
            store={store}
            runtimeStoreId={runtimeStoreId}
            summary={reviewSummary}
            onSummaryChange={handleReviewSummaryChange}
            isRegisteredStore={isRegisteredStore}
            isFavorite={isFavorite}
            isFavoriteSubmitting={isFavoriteSubmitting}
            onBack={() => navigate(-1)}
            onDirections={handleDirections}
            onShare={handleShare}
            onFavoriteClick={handleFavoriteClick}
          />
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="찜하기 및 저장 기능은 로그인 후 이용하실 수 있습니다."
      />
    </div>
  );
}
