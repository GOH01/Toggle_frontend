import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, User, MapPin, List as ListIcon, Search, Crosshair, Check
} from 'lucide-react';
import toggleLogo from '../assets/logo.png';
import { CATEGORIES } from '../constants/status';
import PlaceCard from '../components/common/PlaceCard';
import { useKakaoPlacesWithLookup } from '../hooks/useKakaoPlacesWithLookup';
import useFavoriteRefreshChannel from '../hooks/useFavoriteRefreshChannel';
import styles from './ListWeb.module.css';

const DEFAULT_CENTER = { lat: 37.5065, lng: 127.0536 };
const LAST_LIST_SEARCH_CENTER_KEY = 'toggle:last-list-search-center';
const LIST_PREVIEW_SIZE = 30;
const SORT_OPTIONS = [
  { value: 'distance', label: '가까운 순', hint: '거리 가까운 순' },
  { value: 'reviews', label: '리뷰 많은 순', hint: '리뷰가 많은 순' },
  { value: 'favorites', label: '찜 많은 순', hint: '찜이 많은 순' },
  { value: 'rating', label: '별점 순', hint: '별점이 높은 순' },
];
const SORT_PRIORITY = ['distance', 'reviews', 'favorites', 'rating'];

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

export default function ListWeb() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [selectedSorts, setSelectedSorts] = useState(['distance']);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCenter, setSearchCenter] = useState(() => readStoredSearchCenter() || DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [favoriteRefreshTick, setFavoriteRefreshTick] = useState(0);

  const { places, isLoading: isPlacesLoading } = useKakaoPlacesWithLookup(
    searchCenter,
    searchQuery,
    activeCategory,
    { radius: 2000, size: LIST_PREVIEW_SIZE },
    favoriteRefreshTick
  );

  const allCategories = ['전체', ...new Set([...CATEGORIES.STORE, ...CATEGORIES.PUBLIC])];

  const filteredPlaces = places;

  const getSortValue = (place, sortKey) => {
    if (sortKey === 'distance') return Number(place.distance ?? Number.MAX_SAFE_INTEGER);
    if (sortKey === 'reviews') return Number(place.reviewCount ?? 0);
    if (sortKey === 'favorites') return Number(place.favorites ?? 0);
    if (sortKey === 'rating') return Number(place.rating ?? 0);
    return 0;
  };

  const activeSorts = SORT_PRIORITY.filter((sortKey) => selectedSorts.includes(sortKey));

  const sortedPlaces = activeSorts.length === 0
    ? filteredPlaces
    : [...filteredPlaces].sort((a, b) => {
      for (const sortKey of activeSorts) {
        const comparison = sortKey === 'distance'
          ? getSortValue(a, sortKey) - getSortValue(b, sortKey)
          : getSortValue(b, sortKey) - getSortValue(a, sortKey);

        if (comparison !== 0) {
          return comparison;
        }
      }

      return getSortValue(a, 'distance') - getSortValue(b, 'distance');
    });

  const toggleSortOption = (value) => {
    setSelectedSorts((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return next.length > 0 ? next : [];
    });
  };

  const handleSearchNearCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSearchCenter(nextCenter);
        persistSearchCenter(nextCenter);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        alert('현위치를 가져올 수 없습니다. 권한을 확인해주세요.');
      }
    );
  };

  useFavoriteRefreshChannel(() => {
    setFavoriteRefreshTick((current) => current + 1);
  });

  return (
    <div className={styles.webContainer}>
      {/* 1. Header */}
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
              placeholder="장소 이름, 주소 검색" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <nav className={styles.navLinks}>
          <button className={styles.navBtn} onClick={() => navigate('/loginweb')}>점주 로그인</button>
          <button className={styles.iconBtn} onClick={() => navigate('/favoritesweb')}><Heart size={20} /></button>
          <button className={styles.iconBtn} onClick={() => navigate('/my-mapweb')}><User size={20} /></button>
        </nav>
      </header>

      {/* 2. Body */}
      <div className={styles.webBody}>
        {/* Left Sidebar Filters */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sectionTitle}>카테고리</h3>
            <div className={styles.categoryList}>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  className={`${styles.categoryItem} ${activeCategory === cat ? styles.active : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sectionTitle}>정렬 기준</h3>
            <div className={styles.sortList} role="group" aria-label="정렬 기준">
              {SORT_OPTIONS.map((option) => {
                const isActive = selectedSorts.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.sortOption} ${isActive ? styles.active : ''}`}
                    onClick={() => toggleSortOption(option.value)}
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
          </div>
        </aside>

        {/* Right Main Content (Grid Grid) */}
        <main className={styles.contentArea}>
          <div className={styles.gridWrapper}>
            <div className={styles.contentHeader}>
              <div className={styles.summaryText}>
                총 <strong className={styles.countText}>{sortedPlaces.length}</strong>개의 장소
              </div>
              <button
                type="button"
                className={styles.locationSearchBtn}
                onClick={handleSearchNearCurrentLocation}
                disabled={isLocating}
              >
                <Crosshair size={16} />
                <span>{isLocating ? '위치 확인 중' : '현위치로 다시 검색'}</span>
              </button>
            </div>

            {isLocating || isPlacesLoading ? (
              <div className={styles.emptyState}>장소를 찾는 중입니다...</div>
            ) : sortedPlaces.length > 0 ? (
              <div className={styles.gridContainer}>
                {sortedPlaces.map(place => (
                  <PlaceCard 
                    key={`${place.objType}-${place.id}`} 
                    place={place} 
                    type={place.objType} 
                    isWeb={true} 
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                검색 결과가 없습니다.
              </div>
            )}
          </div>

          {/* 3. Footer Navigation Bar */}
          <div className={styles.webBottomNav}>
            <div className={styles.navTabs}>
              <button className={styles.webNavBtn} onClick={() => navigate('/mapweb')}>
                <MapPin size={22} />
                <span>주변</span>
              </button>
              <button className={`${styles.webNavBtn} ${styles.active}`} onClick={() => navigate('/listweb')}>
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
