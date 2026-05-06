import { STATUS_TYPES } from '../constants/status';
import {
  normalizeSearchCategory,
  normalizeUiCategory,
  resolveDisplayCategory,
} from './placeCategories';
import { resolveStoreMenuAccess } from './storeContracts';

/**
 * 백엔드 스토어 DTO를 프론트엔드 장소 객체로 변환하는 통합 매퍼
 */
export function mapStoreToPlace(item) {
  if (!item) return null;

  const menuAccess = resolveStoreMenuAccess(item);
  const isVerifiedStore = menuAccess.isRegisteredStore;
  const storeStatus = !isVerifiedStore
    ? STATUS_TYPES.STORE.UNREGISTERED
    : (menuAccess.isInactive ? STATUS_TYPES.STORE.CLOSED : (item.liveBusinessStatus || item.businessStatus));

  return {
    id: String(item.externalPlaceId || item.storeId),
    internalStoreId: item.storeId,
    name: item.name,
    category: resolveDisplayCategory({ category: item.categoryName || '매장' }),
    searchCategory: normalizeSearchCategory({ category: item.categoryName || '매장' }),
    normalizedCategory: normalizeUiCategory({ category: item.categoryName || '매장' }),
    address: item.address,
    roadAddress: item.roadAddress,
    jibunAddress: item.jibunAddress,
    contact: item.phone || '전화번호 정보 없음',
    status: storeStatus,
    lastStatusUpdate: '서버 반영',
    businessHours: item.openTime && item.closeTime ? `${item.openTime} - ${item.closeTime}` : '영업시간 정보 없음',
    hasBreakTime: Boolean(item.breakStart),
    breakTime: item.breakStart && item.breakEnd ? `${item.breakStart} - ${item.breakEnd}` : null,
    reviewAverageRating: item.reviewAverageRating ?? item.rating ?? null,
    reviewCount: item.reviewCount ?? 0,
    favorites: item.favoriteCount ?? item.favorites ?? 0,
    favoriteCountAvailable: isVerifiedStore,
    rating: item.reviewAverageRating ?? item.rating ?? null,
    images: item.imageUrls || [],
    ownerNotice: item.ownerNotice || '',
    ownerImages: item.imageUrls || [],
    lat: Number(item.latitude ?? 37.5665),
    lng: Number(item.longitude ?? 126.9780),
    objType: 'STORE',
    verified: item.verified,
    verifiedAt: item.verifiedAt,
    menuEligible: menuAccess.menuEligible,
    menuEditable: menuAccess.menuEditable,
    menuEligibilityReason: menuAccess.menuEligibilityReason,
    menuCategorySupported: menuAccess.categorySupported,
    menuCategoryName: menuAccess.categoryName,
    operationalState: menuAccess.operationalState,
    closureRequestStatus: menuAccess.closureRequestStatus,
    closureRequestReason: item.closureRequestReason || item.requestReason || '',
    closureRequestReviewedAt: item.closureRequestReviewedAt || item.reviewedAt || null,
    closureRequestReviewedBy: item.closureRequestReviewedBy || item.reviewedBy || '',
    closureRequestedAt: item.closureRequestedAt || item.requestedAt || null,
    deletedAt: item.deletedAt || null,
  };
}

export function getPreviewMarkerTheme(item, { isFavorited = false } = {}) {
  const isUnregistered = item?.status === STATUS_TYPES.STORE.UNREGISTERED;
  const isPublic = item?.objType === 'PUBLIC';

  if (isUnregistered) {
    return {
      bubbleBackground: 'rgba(71, 85, 105, 0.92)',
      dotColor: '#cbd5e1',
    };
  }

  if (isFavorited) {
    return {
      bubbleBackground: 'linear-gradient(135deg, #ef4444, #f43f5e)',
      dotColor: '#ffffff',
    };
  }

  return {
    bubbleBackground: isPublic
      ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
      : 'linear-gradient(135deg, #10b981, #059669)',
    dotColor: isPublic ? '#bfdbfe' : '#d1fae5',
  };
}

/**
 * 백엔드 공공기관 DTO를 프론트엔드 장소 객체로 변환하는 통합 매퍼
 */
export function mapPublicToPlace(item) {
  if (!item) return null;

  return {
    ...item,
    id: item.externalPlaceId,
    internalId: item.id,
    name: item.name,
    category: '공공기관',
    searchCategory: '공공기관',
    normalizedCategory: '공공기관',
    address: item.address || '주소 정보 없음',
    status: item.congestionLevel,
    lastStatusUpdate: '서버 반영',
    businessHours: item.operatingHours || '정보 없음',
    estimatedWaitTime: item.waitTime ? `${item.waitTime}분` : '0분',
    favorites: 0,
    favoriteCountAvailable: false,
    reviewCount: 0,
    rating: null,
    lat: Number(item.latitude ?? 37.5665),
    lng: Number(item.longitude ?? 126.9780),
    objType: 'PUBLIC',
    // UI 호환성을 위한 목업 데이터 (필요 시 백엔드 확장)
    hourlyCongestion: [
      { time: '09시', level: 20 }, { time: '11시', level: 45 }, { time: '13시', level: 85 }, 
      { time: '15시', level: 60 }, { time: '17시', level: 30 }, { time: '19시', level: 15 }
    ]
  };
}

/**
 * 카카오 검색 데이터와 백엔드 조회 데이터를 병합하여 미리보기 객체 생성
 */
export function createMergedPreviewPlace(kakaoData, matchedStore, matchedPublic, isLookupLoading = false) {
  if (isLookupLoading) {
    return {
      id: kakaoData.id || `kakao-${kakaoData.y}-${kakaoData.x}`,
      name: kakaoData.place_name,
      status: STATUS_TYPES.STORE.LOOKUP_PENDING,
      lastStatusUpdate: '상태 조회 중',
      lat: Number(kakaoData.y),
      lng: Number(kakaoData.x),
      favorites: 0,
      favoriteCountAvailable: false,
      reviewCount: 0,
      rating: null,
    };
  }

  if (matchedStore) {
    const place = mapStoreToPlace(matchedStore);
    const searchCategory = normalizeSearchCategory(kakaoData);
    return {
      ...place,
      searchCategory,
      normalizedCategory: searchCategory,
      // 카카오에서 온 최신 명칭/주소 우선순위 부여 가능 (필요 시)
      distance: kakaoData.distance ? Number(kakaoData.distance) : 0,
      originalData: kakaoData
    };
  }

  if (matchedPublic) {
    const place = mapPublicToPlace(matchedPublic);
    return {
      ...place,
      searchCategory: '공공기관',
      normalizedCategory: '공공기관',
      distance: kakaoData.distance ? Number(kakaoData.distance) : 0,
      originalData: kakaoData
    };
  }

  // 매칭되는 데이터가 없는 경우 (Toggle 미등록)
  return {
    id: kakaoData.id || `kakao-${kakaoData.y}-${kakaoData.x}`,
    name: kakaoData.place_name,
    category: resolveDisplayCategory(kakaoData),
    searchCategory: normalizeSearchCategory(kakaoData),
    normalizedCategory: normalizeUiCategory(kakaoData),
    rawCategoryName: kakaoData.category_name || '',
    address: kakaoData.road_address_name || kakaoData.address_name,
    contact: kakaoData.phone || '전화번호 미제공',
    status: STATUS_TYPES.STORE.UNREGISTERED,
    lastStatusUpdate: 'Toggle 미등록',
    lat: Number(kakaoData.y),
    lng: Number(kakaoData.x),
    objType: 'STORE',
    distance: kakaoData.distance ? Number(kakaoData.distance) : 0,
    favorites: 0,
    favoriteCountAvailable: false,
    reviewCount: 0,
    rating: null,
    originalData: kakaoData
  };
}
