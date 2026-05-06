import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { Crosshair, Heart, List as ListIcon, MapPin, Search, User } from 'lucide-react';
import toggleLogo from '../assets/logo.png';
import LoginModal from '../components/common/LoginModal';
import StoreTabbedDetail from '../components/store/StoreTabbedDetail';
import {
  addFavoriteStore,
  getUnregisteredStoreBlockMessage,
  isUnregisteredStorePlace,
  removeFavoriteStore,
} from '../lib/favorites';
import { clearAuthSession, getCurrentUser, isFavoritePlace, isLoggedIn as getIsLoggedIn } from '../lib/session';
import { getStoreOperatingInfoByCandidates } from '../lib/storeRuntime';
import { useStoreLookupByExternalPlaceId } from '../hooks/useStoreLookupByExternalPlaceId';
import { mapStoreToPlace } from '../lib/mappers';
import styles from './StoreWeb.module.css';

export default function StoreWeb() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => (store ? isFavoritePlace('STORE', store) : false));
  const [isFavoriteSubmitting, setIsFavoriteSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => getIsLoggedIn());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [reviewSummaryOverride, setReviewSummaryOverride] = useState(null);

  const [mapCenter, setMapCenter] = useState({ lat: 37.5065, lng: 127.0536 });
  const [myLocation, setMyLocation] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [searchMarkers, setSearchMarkers] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (store && store.lat && store.lng) {
      setMapCenter({ lat: store.lat, lng: store.lng });
    } else {
      setMapCenter({ lat: 37.5065, lng: 127.0536 });
    }
  }, [store]);

  useEffect(() => {
    const syncFavoriteState = () => {
      if (store) {
        setIsFavorite(isFavoritePlace('STORE', store));
      }
    };

    syncFavoriteState();
    window.addEventListener('favoritesChanged', syncFavoriteState);
    return () => window.removeEventListener('favoritesChanged', syncFavoriteState);
  }, [store]);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(getIsLoggedIn());
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener('authChanged', syncAuthState);
    return () => window.removeEventListener('authChanged', syncAuthState);
  }, []);

  useEffect(() => {
    setReviewSummaryOverride(null);
  }, [store?.id]);

  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        const ps = new window.kakao.maps.services.Places();
        const center = myLocation || mapCenter;
        const searchOptions = {
          size: 5,
          location: new window.kakao.maps.LatLng(center.lat, center.lng),
          sort: window.kakao.maps.services.SortBy.DISTANCE,
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

  const handleSelectPlace = (placeData) => {
    const pos = { lat: Number(placeData.y), lng: Number(placeData.x) };
    setMapCenter(pos);
    setSelectedPlace({
      id: placeData.id,
      position: pos,
      title: placeData.place_name,
      status: '검색위치',
      color: '#3b82f6',
    });
    setKeyword(placeData.place_name);
    setIsDropdownOpen(false);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && keyword.trim()) {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        alert('카카오 지도 설정이 로드되지 않았습니다.');
        return;
      }

      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(keyword, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
          const bounds = new window.kakao.maps.LatLngBounds();
          const markers = [];

          for (let i = 0; i < data.length; i += 1) {
            markers.push({
              position: { lat: Number(data[i].y), lng: Number(data[i].x) },
              title: data[i].place_name,
              id: data[i].id,
            });
            bounds.extend(new window.kakao.maps.LatLng(data[i].y, data[i].x));
          }

          setSearchMarkers(markers);
          handleSelectPlace(data[0]);
        } else {
          alert('검색 결과가 존재하지 않습니다.');
        }
      });
    }
  };

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMapCenter(loc);
          setMyLocation(loc);
        },
        () => {
          alert('현위치를 가져올 수 없습니다. 권한을 확인해주세요.');
        },
      );
    } else {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/loginweb');
  };

  const reviewSummary = reviewSummaryOverride || {
    averageRating: store?.reviewAverageRating ?? store?.rating ?? null,
    reviewCount: store?.reviewCount ?? 0,
  };

  const handleReviewSummaryChange = (nextSummary) => {
    setReviewSummaryOverride(nextSummary || null);
  };

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

  if (isLookupLoading) return <div>상태를 불러오는 중입니다...</div>;
  if (!store || !store.name) return <div>장소 정보를 찾을 수 없습니다.</div>;

  return (
    <div className={styles.webContainer}>
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
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleSearch}
              onFocus={() => { if (suggestions.length > 0) setIsDropdownOpen(true); }}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            />
          </div>

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
                        {distanceText && <span style={{ color: 'var(--color-primary)', fontWeight: 600, marginRight: '4px' }}>{distanceText} ·</span>}
                        {item.address_name}
                      </span>
                    </div>
                  </li>
                );
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

      <div className={styles.webBody}>
        <aside className={styles.sidebar}>
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
        </aside>

        <div className={styles.contentArea}>
          <main className={styles.mapArea}>
            <Map center={mapCenter} style={{ width: '100%', height: '100%', borderRadius: '16px' }} level={4}>
              {searchMarkers.length === 0 && !selectedPlace && (
                <CustomOverlayMap position={mapCenter} yAnchor={1} zIndex={100}>
                  <div className={styles.markerPlaceholder}>
                    <div className={styles.markerBaloon} style={{ cursor: 'default' }}>
                      <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }} />
                      <span style={{ color: '#10b981' }}>
                        {store.status === 'OPEN' || store.status === '영업중' ? '영업중' : store.status}
                      </span>
                    </div>
                    <MapPin size={42} fill="rgba(15,23,42,0.9)" color="white" className={styles.markerPin} />
                  </div>
                </CustomOverlayMap>
              )}

              {searchMarkers.map((marker) => (
                <MapMarker
                  key={`search-${marker.id}`}
                  position={marker.position}
                  title={marker.title}
                  image={{
                    src: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
                    size: { width: 24, height: 35 },
                  }}
                  onClick={() => {
                    setSelectedPlace({
                      id: marker.id,
                      position: marker.position,
                      title: marker.title,
                      status: '검색결과',
                      color: '#f59e0b',
                    });
                    setMapCenter(marker.position);
                  }}
                />
              ))}

              {selectedPlace && (
                <CustomOverlayMap position={selectedPlace.position} yAnchor={1} zIndex={100}>
                  <div className={styles.markerPlaceholder}>
                    <div
                      className={styles.markerBaloon}
                      onClick={() => navigate(selectedPlace.status === '검색결과' ? `/publicweb/${selectedPlace.id}` : `/storeweb/${selectedPlace.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ width: 8, height: 8, background: selectedPlace.color, borderRadius: '50%' }} />
                      <span style={{ color: selectedPlace.color }}>{selectedPlace.status}</span>
                      <span style={{ color: 'var(--color-primary)', marginLeft: '0.25rem', fontWeight: 800 }}>&rsaquo;</span>
                    </div>
                    <MapPin size={42} fill="rgba(15,23,42,0.9)" color="white" className={styles.markerPin} />
                  </div>
                </CustomOverlayMap>
              )}

              {myLocation && (
                <CustomOverlayMap position={myLocation} zIndex={50}>
                  <div className={styles.myLocationMarker}>
                    <div className={styles.myLocationCore} />
                    <div className={styles.myLocationPulse} />
                  </div>
                </CustomOverlayMap>
              )}
            </Map>

            <button className={styles.myLocationBtn} onClick={handleMyLocation}>
              <Crosshair size={24} />
            </button>
          </main>

          <div className={styles.webBottomNav}>
            <div className={styles.navTabs}>
              <button className={`${styles.webNavBtn} ${styles.active}`} onClick={() => navigate('/mapweb')}>
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

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="찜하기 및 저장 기능은 로그인 후 이용하실 수 있습니다."
      />
    </div>
  );
}
