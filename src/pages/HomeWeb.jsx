import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { 
  Search, Crosshair, Heart, User, MapPin, List as ListIcon, ChevronDown, Check, X
} from 'lucide-react';
import toggleLogo from '../assets/logo.png';
import { CATEGORIES, STATUS_TYPES, normalizeStoreStatus } from '../constants/status';
import PlaceCard from '../components/common/PlaceCard';
import StoreMenuPanel from '../components/menus/StoreMenuPanel';
import PreviewMapMarker from '../components/common/PreviewMapMarker';
import { clearAuthSession, getCurrentUser, isLoggedIn as getIsLoggedIn } from '../lib/session';
import { useStoreLookupByExternalPlaceId } from '../hooks/useStoreLookupByExternalPlaceId';
import { useKakaoPlacesWithLookup } from '../hooks/useKakaoPlacesWithLookup';
import useFavoriteRefreshChannel from '../hooks/useFavoriteRefreshChannel';
import { createMergedPreviewPlace, getPreviewMarkerTheme } from '../lib/mappers';
import styles from './HomeWeb.module.css';

const DEFAULT_CENTER = { lat: 37.5065, lng: 127.0536 };
const LAST_LIST_SEARCH_CENTER_KEY = 'toggle:last-list-search-center';
const MAP_PREVIEW_SIZE = 15;
const MAP_SORT_OPTIONS = [
  { value: 'open', label: '영업중만', hint: '영업 중인 매장만 보기' },
  { value: 'rating', label: '별점 높은 순', hint: '별점이 높은 순' },
  { value: 'reviews', label: '리뷰 많은 순', hint: '리뷰가 많은 순' },
  { value: 'favorites', label: '찜 많은 순', hint: '찜이 많은 순' },
];
const MAP_SORT_PRIORITY = ['rating', 'reviews', 'favorites'];

function readStoredSearchCenter() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(LAST_LIST_SEARCH_CENTER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lng !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistSearchCenter(center) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_LIST_SEARCH_CENTER_KEY, JSON.stringify(center));
}

function hasStoredSearchCenter() {
  return Boolean(readStoredSearchCenter());
}

export default function HomeWeb() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [selectedSorts, setSelectedSorts] = useState([]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [favoriteRefreshTick, setFavoriteRefreshTick] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(() => getIsLoggedIn());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const sortDropdownRef = useRef(null);
  
  // Map control states
  const [mapCenter, setMapCenter] = useState(() => readStoredSearchCenter() || DEFAULT_CENTER);
  const [searchCenter, setSearchCenter] = useState(() => readStoredSearchCenter() || DEFAULT_CENTER); // 별도 관리 되는 탐색 기준 위치
  const [isMapDragged, setIsMapDragged] = useState(false); // 현 지도에서 검색 노출용
  const [keyword, setKeyword] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const selectedExternalPlaceId = selectedPlace?.originalData?.id;
  const { storeMatch: selectedPlaceStoreMatch, isLoading: isSelectedPlaceLookupLoading } =
    useStoreLookupByExternalPlaceId(selectedExternalPlaceId);

  // Search Suggestions State
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(getIsLoggedIn());
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener('authChanged', syncAuthState);
    return () => window.removeEventListener('authChanged', syncAuthState);
  }, []);

  useFavoriteRefreshChannel(() => {
    setFavoriteRefreshTick((current) => current + 1);
  });

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // 마운트 시 내 위치 자동 동기화
  useEffect(() => {
    if (!hasStoredSearchCenter()) {
      handleMyLocation({ syncSearchCenter: true, persist: true });
    }
  }, []);

  // 실시간 연관 검색어 (디바운스 처리)
  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        const ps = new window.kakao.maps.services.Places();
        
        const center = myLocation || searchCenter || mapCenter;
        const searchOptions = {
          size: 5,
          location: new window.kakao.maps.LatLng(center.lat, center.lng),
          sort: window.kakao.maps.services.SortBy.DISTANCE 
        };

        ps.keywordSearch(keyword, (data, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            setSuggestions(data);
            setIsDropdownOpen(true);
          } else {
            setSuggestions([]);
            setIsDropdownOpen(false);
          }
        }, searchOptions);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // 장소 클릭 처리 공통함수
  const handleSelectPlace = (placeData) => {
    const pos = { lat: Number(placeData.y), lng: Number(placeData.x) };
    setMapCenter(pos);
    setCommittedQuery(placeData.place_name);
    setSelectedPlace({
      position: pos,
      title: placeData.place_name,
      status: '검색위치',
      color: '#3b82f6',
      originalData: placeData
    });
    setKeyword(placeData.place_name);
    setIsDropdownOpen(false);
  };

  // 카카오 장소 검색 API 호출 (엔터)
  const handleSearch = (e) => {
    if (e.key === 'Enter' && keyword.trim()) {
      const baseCenter = myLocation || searchCenter;
      if (baseCenter) {
        setMapCenter(baseCenter);
        setSearchCenter(baseCenter);
        persistSearchCenter(baseCenter);
      }
      setCommittedQuery(keyword.trim());
      setSelectedPlace(null);
      setSearchMarkers([]);
      setIsDropdownOpen(false);
    }
  };

  // HTML5 현위치 기능
  const handleMyLocation = ({ syncSearchCenter = false, persist = false } = {}) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMapCenter(loc);
          if (syncSearchCenter) {
            setSearchCenter(loc);
          }
          if (persist) {
            persistSearchCenter(loc);
          }
          setIsMapDragged(false);
          setMyLocation(loc);
        },
        () => {
          alert('현위치를 가져올 수 없습니다. 권한을 확인해주세요.');
        }
      );
    } else {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
    }
  };

  // Preview data for list
  const { places: nearbyPlaces } = useKakaoPlacesWithLookup(searchCenter, committedQuery, activeCategory, { radius: 2000, size: MAP_PREVIEW_SIZE }, favoriteRefreshTick);

  let rawPreviewItems = nearbyPlaces;

  // 선택된 카카오 검색 장소가 있다면 최상단에 주입
  if (selectedPlace && selectedPlace.originalData) {
    const kakaoData = selectedPlace.originalData;
    const mappedPlace = createMergedPreviewPlace(
      kakaoData,
      selectedPlaceStoreMatch,
      null, // matchedPublic
      isSelectedPlaceLookupLoading
    );
    rawPreviewItems = [mappedPlace, ...rawPreviewItems.filter(item => item.id !== mappedPlace.id)];
  }

  const filteredPreviewItems = rawPreviewItems.filter((item) => {
    if (!selectedSorts.includes('open')) {
      return true;
    }

    return item.objType === 'STORE' && normalizeStoreStatus(item.status) === STATUS_TYPES.STORE.OPEN;
  });

  const sortValue = (place, key) => {
    if (key === 'rating') {
      return Number(place.rating ?? place.reviewAverageRating ?? 0);
    }

    if (key === 'reviews') {
      return Number(place.reviewCount ?? 0);
    }

    if (key === 'favorites') {
      return Number(place.favorites ?? 0);
    }

    return Number(place.distance ?? Number.MAX_SAFE_INTEGER);
  };

  const activeSorts = MAP_SORT_PRIORITY.filter((key) => selectedSorts.includes(key));

  const sortedPreviewItems = activeSorts.length === 0
    ? filteredPreviewItems
    : [...filteredPreviewItems].sort((a, b) => {
      for (const key of activeSorts) {
        const difference = sortValue(b, key) - sortValue(a, key);
        if (difference !== 0) {
          return difference;
        }
      }

      return sortValue(a, 'distance') - sortValue(b, 'distance');
    });

  const selectedSortLabel = (() => {
    const selectedLabels = MAP_SORT_OPTIONS
      .filter((option) => selectedSorts.includes(option.value))
      .map((option) => option.label);

    return selectedLabels.length > 0 ? selectedLabels.join(', ') : '기본순';
  })();

  const handleSortSelect = (value) => {
    setSelectedSorts((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return next;
    });
  };

  const previewItems = sortedPreviewItems.slice(0, MAP_PREVIEW_SIZE); // Kakao/백엔드 상한에 맞춰 15개까지 표시

  const handleLogout = () => {
    clearAuthSession();
    navigate('/loginweb');
  };

  const handleClearSearch = () => {
    const nextCenter = mapCenter || searchCenter || DEFAULT_CENTER;
    setKeyword('');
    setCommittedQuery('');
    setSelectedPlace(null);
    setSearchMarkers([]);
    setSuggestions([]);
    setIsDropdownOpen(false);
    setActiveCategory('전체');
    setSearchCenter(nextCenter);
    persistSearchCenter(nextCenter);
    setIsMapDragged(false);
  };

  return (
    <div className={styles.webContainer}>
      {/* 웹 전용 글로벌 헤더 */}
      <header className={styles.webHeader}>
        <div className={styles.logoGroup} onClick={() => navigate('/mapweb')}>
          <img src={toggleLogo} alt="Toggle logo" className={styles.logoMark} />
          <span className={styles.logoText}>Toggle</span>
        </div>
        
        <div className={styles.searchContainer}>
          <div className={styles.headerSearch}>
            <Search size={18} color="rgba(255,255,255,0.5)" />
            <input 
              type="text" 
              placeholder="장소, 주소 검색" 
              className={styles.headerInput}
              value={keyword}
              onChange={(e) => {
                const nextValue = e.target.value;
                setKeyword(nextValue);
                if (!nextValue.trim()) {
                  setCommittedQuery('');
                  setSelectedPlace(null);
                  setSearchMarkers([]);
                }
              }}
              onKeyDown={handleSearch}
              onFocus={() => { if(suggestions.length > 0) setIsDropdownOpen(true); }}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            />
            {(keyword || committedQuery) && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={handleClearSearch}
                aria-label="검색어 지우기"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* 연관 검색어 드롭다운 */}
          {isDropdownOpen && suggestions.length > 0 && (
            <ul className={styles.suggestionList}>
              {suggestions.map((item) => {
                let distanceText = '';
                if (item.distance) {
                  const d = parseInt(item.distance, 10);
                  distanceText = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
                }
                return (
                  <li 
                    key={item.id} 
                    className={styles.suggestionItem}
                    onClick={() => handleSelectPlace(item)}
                  >
                    <MapPin size={16} color="var(--color-primary)" className={styles.suggestionIcon} />
                    <div className={styles.suggestionText}>
                      <span className={styles.suggestionName}>{item.place_name}</span>
                      <span className={styles.suggestionAddress}>
                        {distanceText && <span style={{color: 'var(--color-primary)', fontWeight: 600, marginRight: '4px'}}>{distanceText} ·</span>}
                        {item.address_name}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <nav className={styles.navLinks}>
          {isLoggedIn ? (
            <button className={styles.navBtn} onClick={handleLogout}>로그아웃</button>
          ) : (
            <button className={styles.navBtn} onClick={() => navigate('/loginweb')}>로그인</button>
          )}
          <button className={styles.iconBtn} onClick={() => navigate(isLoggedIn ? '/favoritesweb' : '/loginweb')}>
            <Heart size={20} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => navigate(isLoggedIn ? '/my-mapweb' : '/loginweb')}
            title={currentUser.email || '마이페이지'}
          >
            <User size={20} />
          </button>
        </nav>
      </header>

      {/* 메인 2단 레이아웃 (좌 사이드바, 우 지도) */}
      <div className={styles.webBody}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.filterScroll}>
              {['전체', ...CATEGORIES.STORE, ...CATEGORIES.PUBLIC].map(cat => (
                <button 
                  key={cat}
                  className={`${styles.filterChip} ${activeCategory === cat ? styles.active : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.listContainer}>
            <div className={styles.listHeader}>
              <h3 className={styles.listTitle}>{committedQuery ? `"${committedQuery}" 검색 결과` : '주변 추천 장소'}</h3>
              <div className={styles.listMetaRow}>
                <span className={styles.listCount}>{previewItems.length}개</span>
                <div className={styles.sortDropdown} ref={sortDropdownRef}>
                  <button
                    type="button"
                    className={styles.sortTrigger}
                    onClick={() => setIsSortMenuOpen((current) => !current)}
                    aria-haspopup="listbox"
                    aria-expanded={isSortMenuOpen}
                    aria-label={`정렬 기준: ${selectedSortLabel}`}
                  >
                    <span className={styles.sortTriggerLabel}>정렬 기준</span>
                    <span className={styles.sortTriggerValue}>: {selectedSortLabel}</span>
                    <ChevronDown size={16} className={`${styles.sortTriggerIcon} ${isSortMenuOpen ? styles.sortTriggerIconOpen : ''}`} />
                  </button>

                  {isSortMenuOpen && (
                    <div className={styles.sortMenu} role="listbox" aria-label="정렬 기준 선택">
                      {MAP_SORT_OPTIONS.map((option) => {
                        const isActive = selectedSorts.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`${styles.sortMenuItem} ${isActive ? styles.sortMenuItemActive : ''}`}
                            onClick={() => handleSortSelect(option.value)}
                            aria-selected={isActive}
                            aria-pressed={isActive}
                          >
                            <span className={styles.sortOptionText}>
                              <span className={styles.sortOptionLabel}>{option.label}</span>
                              <span className={styles.sortOptionHint}>{option.hint}</span>
                            </span>
                            <span className={styles.sortOptionCheck} aria-hidden="true">
                              {isActive ? <Check size={14} /> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {selectedPlace && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  borderRadius: '1.1rem',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                  background: 'rgba(15, 23, 42, 0.35)',
                  display: 'grid',
                  gap: '0.9rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 800 }}>메뉴</h4>
                    <p style={{ margin: '0.25rem 0 0', color: 'rgba(226, 232, 240, 0.72)', fontSize: '0.85rem' }}>
                      선택한 매장의 메뉴를 바로 확인할 수 있습니다.
                    </p>
                  </div>
                </div>
                {selectedPlaceStoreMatch ? (
                  <StoreMenuPanel
                    store={selectedPlaceStoreMatch}
                    storeId={selectedPlaceStoreMatch.storeId}
                    storeName={selectedPlaceStoreMatch.name}
                    categoryName={selectedPlaceStoreMatch.categoryName}
                    mode="read"
                    compact
                  />
                ) : (
                  <p style={{ margin: 0, color: 'rgba(226, 232, 240, 0.8)', fontSize: '0.92rem' }}>
                    등록된 매장을 선택하면 메뉴가 표시됩니다.
                  </p>
                )}
              </div>
            )}
            <div className={styles.cardsWrapper}>
              {previewItems.map(item => (
                <PlaceCard 
                  key={item.id} 
                  place={item} 
                  type={item.objType === 'PUBLIC' ? 'CONGESTION' : 'STORE'} 
                  isWeb={true}
                  onClick={() => {
                    const detailPath = item.objType === 'PUBLIC' ? `/publicweb/${item.id}` : `/storeweb/${item.id}`;
                    navigate(detailPath, { state: { placePreview: item } });
                  }}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* 우측 메인 컨텐츠 영역 (지도 + 하단 네비게이션) */}
        <div className={styles.contentArea}>
          <main className={styles.mapArea} style={{ position: 'relative' }}>
            {isMapDragged && (
              <div className={styles.mapSearchButtonWrap}>
                <button
                  type="button"
                  className={styles.mapSearchButton}
                  onClick={() => {
                    setSearchCenter(mapCenter);
                    persistSearchCenter(mapCenter);
                    setIsMapDragged(false);
                  }}
                >
                  <Search size={16} />
                  현 지도에서 검색
                </button>
              </div>
            )}

            <Map
              center={mapCenter}
              style={{ width: '100%', height: '100%', borderRadius: '16px' }}
              level={4}
              onDragEnd={(map) => {
                const latlng = map.getCenter();
                setMapCenter({
                  lat: latlng.getLat(),
                  lng: latlng.getLng(),
                });
                setIsMapDragged(true);
              }}
            >
              {/* 리스트 매칭 마커 */}
              {previewItems.map((item) => {
                if (!item.lat || !item.lng) return null;
                const markerTheme = getPreviewMarkerTheme(item);
                const markerStatus = item.status === 'OPEN' || item.status === '영업중'
                  ? '영업중'
                  : item.status;

                return (
                  <PreviewMapMarker
                    key={`preview-${item.id}`}
                    position={{ lat: item.lat, lng: item.lng }}
                    title={item.name}
                    label={item.name}
                    zIndex={10}
                    bubbleBackground={markerTheme.bubbleBackground}
                    dotColor={markerTheme.dotColor}
                    onClick={() => {
                      setSelectedPlace({
                        id: item.id,
                        position: { lat: item.lat, lng: item.lng },
                        title: item.name,
                        status: markerStatus,
                        color: item.objType === 'PUBLIC' ? '#3b82f6' : '#10b981',
                        originalData: item.originalData
                      });
                      setMapCenter({ lat: item.lat, lng: item.lng });
                    }}
                  />
                );
              })}
              
              {/* 검색 결과 마커 */}
              {searchMarkers.map((marker) => (
                <MapMarker 
                  key={`search-${marker.id}`}
                  position={marker.position}
                  title={marker.title}
                  image={{
                    src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
                    size: { width: 24, height: 35 }
                  }}
                  onClick={() => {
                    setSelectedPlace({
                      id: marker.id,
                      position: marker.position,
                      title: marker.title,
                      status: '검색결과',
                      color: '#f59e0b'
                    });
                    setMapCenter(marker.position);
                  }}
                />
              ))}

              {/* 내 위치 마커 */}
              {myLocation && (
                <CustomOverlayMap position={myLocation} zIndex={50}>
                  <div className={styles.myLocationMarker}>
                    <div className={styles.myLocationCore} />
                    <div className={styles.myLocationPulse} />
                  </div>
                </CustomOverlayMap>
              )}

              {/* 스마트 핀 */}
              {selectedPlace && (
                <CustomOverlayMap position={selectedPlace.position} yAnchor={1} zIndex={100}>
                  <div className={styles.markerPlaceholder}>
                    <div 
                      className={styles.markerBaloon} 
                      onClick={() => navigate(
                        selectedPlace.status === '검색결과' ? `/publicweb/${selectedPlace.id}` : `/storeweb/${selectedPlace.id}`, 
                        { state: { placePreview: selectedPlace.originalData || selectedPlace } }
                      )}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{width: 8, height: 8, background: selectedPlace.color, borderRadius: '50%'}} /> 
                      <span style={{color: selectedPlace.color}}>{selectedPlace.status}</span>
                      <span style={{ color: 'var(--color-primary)', marginLeft: '0.25rem', fontWeight: 800 }}>&rsaquo;</span>
                    </div>
                    <MapPin size={42} fill="rgba(15,23,42,0.9)" color="white" className={styles.markerPin} />
                  </div>
                </CustomOverlayMap>
              )}
            </Map>

            <button className={styles.myLocationBtn} onClick={() => handleMyLocation()}>
              <Crosshair size={24} />
            </button>
          </main>

          {/* 데스크탑 맵 하단 네비게이션 & 푸터 (지도 바깥의 하얀 여백 영역) */}
          <div className={styles.webBottomNav}>
            <div className={styles.navTabs}>
              <button className={`${styles.webNavBtn} ${styles.active}`}>
                <MapPin size={22} />
                <span>주변</span>
              </button>
              <button className={styles.webNavBtn} onClick={() => navigate('/listweb')}>
                <ListIcon size={22} />
                <span>리스트</span>
              </button>
              <button className={styles.webNavBtn} onClick={() => navigate('/favoritesweb')}>
                <Heart size={22} />
                <span>저장</span>
              </button>
              <button className={styles.webNavBtn} onClick={() => navigate('/my-mapweb')}>
                <User size={22} />
                <span>마이</span>
              </button>
            </div>
            <div className={styles.webFooter}>
              <span>&copy; 2026 Toggle. All rights reserved.</span>
              <div className={styles.footerLinks}>
                <a href="#">이용약관</a>
                <a href="#">개인정보처리방침</a>
                <a href="#">고객센터</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
