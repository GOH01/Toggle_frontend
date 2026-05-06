import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Lock, Map as MapIcon, Search, User } from 'lucide-react';
import PlaceCard from '../components/common/PlaceCard';
import MapViewport from '../components/common/MapViewport';
import { useAuthSession } from '../hooks/useAuthSession';
import { fetchStoresByIds } from '../lib/stores';
import { fetchPublicInstitutionsByIds } from '../lib/publicInstitutions';
import { mapStoreToPlace, mapPublicToPlace } from '../lib/mappers';
import {
  buildSharedMapUrl,
  fetchPublicMap,
  searchPublicMaps,
} from '../lib/myMap';
import {
  normalizeSharedMapSearchResults,
  normalizeSharedMapSummary,
} from '../lib/sharedMap';
import styles from './SharedMap.module.css';

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 30;
const GENERIC_NOT_FOUND_MESSAGE = '존재하지 않거나 비공개 설정된 지도입니다.';

function buildSharedPlaces(stores = [], publics = []) {
  return [
    ...stores.map(mapStoreToPlace).filter(Boolean).map((item) => ({ ...item, type: 'STORE' })),
    ...publics.map(mapPublicToPlace).filter(Boolean).map((item) => ({ ...item, type: 'CONGESTION' })),
  ];
}

function getInitialSearchHint() {
  return '닉네임으로 공개 지도를 검색해 보세요.';
}

function getSearchErrorMessage(length) {
  if (!length) {
    return '닉네임을 입력해 주세요.';
  }

  if (length < MIN_SEARCH_LENGTH) {
    return '닉네임은 2자 이상 입력해 주세요.';
  }

  if (length > MAX_SEARCH_LENGTH) {
    return '닉네임은 30자 이하로 입력해 주세요.';
  }

  return '';
}

export default function SharedMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicMapUuid } = useParams();
  const auth = useAuthSession();
  const isWeb = location.pathname.startsWith('/sharedweb');
  const sharedBasePath = isWeb ? '/sharedweb' : '/shared';
  const loginPath = isWeb ? '/loginweb' : '/login';
  const isDetailMode = Boolean(publicMapUuid);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchNotice, setSearchNotice] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [sharedMap, setSharedMap] = useState(null);
  const [sharedPlaces, setSharedPlaces] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5065, lng: 127.0536 });
  const [activePlaceKey, setActivePlaceKey] = useState('');
  const [detailError, setDetailError] = useState('');
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const sharedMapUrl = publicMapUuid ? buildSharedMapUrl(publicMapUuid, isWeb) : '';

  useEffect(() => {
    let isCancelled = false;

    if (!publicMapUuid) {
      setSharedMap(null);
      setSharedPlaces([]);
      setMapCenter({ lat: 37.5065, lng: 127.0536 });
      setActivePlaceKey('');
      setDetailError('');
      setIsDetailLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    const loadSharedMap = async () => {
      setIsDetailLoading(true);
      setDetailError('');

      try {
        const data = normalizeSharedMapSummary(await fetchPublicMap(publicMapUuid));
        const [stores, publics] = await Promise.all([
          fetchStoresByIds(data.stores || []),
          fetchPublicInstitutionsByIds(data.publics || []),
        ]);

        if (isCancelled) {
          return;
        }

        const loadedPlaces = buildSharedPlaces(stores, publics);
        const firstPlace = loadedPlaces[0];
        setSharedMap(data);
        setSharedPlaces(loadedPlaces);
        if (firstPlace?.lat && firstPlace?.lng) {
          setMapCenter({ lat: firstPlace.lat, lng: firstPlace.lng });
          setActivePlaceKey(`${firstPlace.type}-${firstPlace.internalStoreId || firstPlace.internalId || firstPlace.id}`);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setSharedMap(null);
        setSharedPlaces([]);
        setActivePlaceKey('');
        setDetailError(error?.status === 404 || error?.status === 403 ? GENERIC_NOT_FOUND_MESSAGE : (error?.message || '공개 지도를 불러오지 못했습니다.'));
      } finally {
        if (!isCancelled) {
          setIsDetailLoading(false);
        }
      }
    };

    loadSharedMap();

    return () => {
      isCancelled = true;
    };
  }, [publicMapUuid]);

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!auth.isLoggedIn) {
      setSearchNotice('로그인 후 공개 지도를 검색해 주세요.');
      return;
    }

    const normalizedTerm = searchTerm.trim();
    const validationMessage = getSearchErrorMessage(normalizedTerm.length);

    if (validationMessage) {
      setSearchNotice(validationMessage);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    setSearchNotice('');

    try {
      const results = normalizeSharedMapSearchResults(await searchPublicMaps(normalizedTerm));
      setSearchResults(results);
      if (isDetailMode) {
        navigate(sharedBasePath, { replace: true });
      }

      if (!results.length) {
        setSearchNotice('검색 결과가 없습니다.');
      }
    } catch (error) {
      setSearchResults([]);
      setSearchNotice(error?.status === 401 ? '로그인 후 공개 지도를 검색해 주세요.' : (error?.message || '공개 지도 검색에 실패했습니다.'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchFromDetail = async () => {
    if (isDetailMode) {
      navigate(sharedBasePath, { replace: true });
    }
  };

  const handleOpenDetail = (nextPublicMapUuid) => {
    navigate(`${sharedBasePath}/${encodeURIComponent(nextPublicMapUuid)}`);
  };

  const handleFocusPlace = (place) => {
    if (!place) {
      return;
    }

    const placeKey = `${place.type}-${place.internalStoreId || place.internalId || place.id}`;
    setActivePlaceKey(placeKey);

    if (place.lat && place.lng) {
      setMapCenter({ lat: place.lat, lng: place.lng });
    }
  };

  const handleCopyLink = async () => {
    if (!sharedMapUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sharedMapUrl);
      alert('공유 링크가 복사되었습니다.');
    } catch {
      alert('공유 링크 복사에 실패했습니다.');
    }
  };

  const handleBack = () => {
    if (isDetailMode) {
      navigate(sharedBasePath, { replace: true });
      return;
    }

    navigate(-1);
  };

  const searchHasValidationError = Boolean(searchNotice && !hasSearched);
  const searchInputLength = searchTerm.trim().length;
  const canSearch = auth.isLoggedIn && !isSearching && searchInputLength >= MIN_SEARCH_LENGTH && searchInputLength <= MAX_SEARCH_LENGTH;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <button className={styles.backBtn} onClick={handleBack} aria-label="뒤로가기">
            <ChevronLeft size={24} />
          </button>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>공개 지도</p>
            <h1 className={styles.title}>{isDetailMode ? '지도 상세 보기' : '닉네임 검색'}</h1>
            <p className={styles.subTitle}>
              {isDetailMode
                ? '공개된 지도만 볼 수 있는 보기 전용 화면입니다.'
                : '닉네임으로 공개 지도를 찾아볼 수 있습니다.'}
            </p>
          </div>
          {isDetailMode && (
            <button className={styles.copyLinkButton} onClick={handleCopyLink}>
              <Copy size={16} />
              링크 복사
            </button>
          )}
        </div>
      </header>

      <main className={styles.shell}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>검색</p>
              <h2 className={styles.panelTitle}>닉네임으로 공개 지도 찾기</h2>
              <p className={styles.panelCopy}>
                공개 상태인 지도만 검색됩니다.
              </p>
            </div>

            {auth.isLoggedIn ? (
              <span className={styles.statusChip}>로그인됨</span>
            ) : (
              <button className={styles.loginButton} onClick={() => navigate(loginPath)}>
                로그인
              </button>
            )}
          </div>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="닉네임을 입력하세요"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setSearchNotice('');
              }}
              maxLength={MAX_SEARCH_LENGTH}
              disabled={!auth.isLoggedIn || isSearching}
            />
            <button type="submit" className={styles.searchButton} disabled={!canSearch}>
              검색
            </button>
          </form>

          {searchNotice && (
            <div className={`${styles.notice} ${searchHasValidationError ? styles.noticeWarning : ''}`}>
              <Lock size={14} />
              <span>{searchNotice}</span>
            </div>
          )}

          {!auth.isLoggedIn ? (
            <div className={styles.emptyState}>
              <Lock size={36} />
              <p>로그인 후 공개 지도를 검색할 수 있습니다.</p>
              <button className={styles.emptyAction} onClick={() => navigate(loginPath)}>
                로그인하기
              </button>
            </div>
          ) : isSearching ? (
            <div className={styles.emptyState}>
              <Search size={36} />
              <p>검색 중...</p>
            </div>
          ) : hasSearched && searchResults.length > 0 ? (
            <div className={styles.resultList}>
              <div className={styles.resultHeader}>
                <span>검색 결과</span>
                <strong>{searchResults.length}개</strong>
              </div>
              {searchResults.map((result) => (
                <article
                  key={result.publicMapUuid}
                  className={styles.resultCard}
                >
                  <div
                    className={styles.resultAvatar}
                    style={result.profileImageUrl ? { backgroundImage: `url(${result.profileImageUrl})` } : undefined}
                  >
                    {!result.profileImageUrl && <User size={20} />}
                  </div>
                  <div className={styles.resultBody}>
                    <p className={styles.resultNickname}>{result.nickname || '닉네임 없음'}</p>
                    <p className={styles.resultTitle}>{result.title || `${result.nickname || '사용자'}님의 지도`}</p>
                    <p className={styles.resultDescription}>
                      {result.description || '지도 설명이 없습니다.'}
                    </p>
                    <div className={styles.resultMetaRow}>
                      <span className={styles.resultMetaChip}>
                        저장 장소 {result.savedPlaceCount ?? 0}개
                      </span>
                    </div>
                  </div>
                  <button type="button" className={styles.resultActionButton} onClick={() => handleOpenDetail(result.publicMapUuid)}>
                    <MapIcon size={16} />
                    공개 지도 열기
                  </button>
                </article>
              ))}
            </div>
          ) : hasSearched ? (
            <div className={styles.emptyState}>
              <Search size={36} />
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Search size={36} />
              <p>{getInitialSearchHint()}</p>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          {isDetailMode ? (
            isDetailLoading ? (
              <div className={styles.emptyState}>
                <MapIcon size={36} />
                <p>공개 지도를 불러오는 중입니다...</p>
              </div>
            ) : detailError ? (
              <div className={styles.emptyState}>
                <User size={40} />
                <p>{detailError}</p>
              </div>
            ) : sharedMap ? (
              <>
                <div className={styles.profileCard}>
                  <div
                    className={styles.profileAvatar}
                    style={sharedMap.profileImageUrl ? { backgroundImage: `url(${sharedMap.profileImageUrl})` } : undefined}
                  >
                    {!sharedMap.profileImageUrl && <User size={24} />}
                  </div>
                  <div className={styles.profileBody}>
                    <p className={styles.profileNickname}>{sharedMap.nickname || '닉네임 없음'}</p>
                    <h3 className={styles.profileTitle}>{sharedMap.title || `${sharedMap.nickname || '사용자'}님의 지도`}</h3>
                    {sharedMap.description && <p className={styles.profileDescription}>{sharedMap.description}</p>}
                  </div>
                </div>

                <div className={styles.detailMeta}>
                  <span className={styles.detailBadge}>보기 전용</span>
                  <span className={styles.detailBadge}>저장 장소 {sharedPlaces.length}개</span>
                </div>

                <div className={styles.mapStage}>
                  <div className={styles.mapStageHeader}>
                    <div>
                      <h2>지도 보기</h2>
                      <p>저장한 장소가 지도 위에 표시됩니다.</p>
                    </div>
                    <span className={styles.mapStageChip}>공개 지도</span>
                  </div>
                  <MapViewport
                    center={mapCenter}
                    items={sharedPlaces.map((place) => ({
                      key: `${place.type}-${place.internalStoreId || place.internalId || place.id}`,
                      label: place.name,
                      lat: place.lat,
                      lng: place.lng,
                      color: place.type === 'STORE' ? '#10b981' : '#3b82f6',
                      rawPlace: place,
                    }))}
                    activeItemKey={activePlaceKey}
                    onItemClick={(item) => handleFocusPlace(item.rawPlace)}
                    level={5}
                    className={styles.mapViewport}
                    loadingMessage="카카오 지도를 불러오는 중입니다. 잠시만 기다려 주세요."
                  />
                </div>

                <div className={styles.detailListHeader}>
                  <h2>공개된 저장 장소</h2>
                  <button className={styles.backToSearchButton} onClick={handleSearchFromDetail}>
                    검색으로 돌아가기
                  </button>
                </div>

                <div className={styles.placeGrid}>
                  {sharedPlaces.length > 0 ? (
                    sharedPlaces.map((place) => (
                      <PlaceCard
                        key={`${place.type}-${place.internalStoreId || place.internalId || place.id}`}
                        place={place}
                        type={place.type}
                        showFavorite={false}
                        onClick={() => handleFocusPlace(place)}
                      />
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <MapIcon size={36} />
                      <p>공개된 장소가 없습니다.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <MapIcon size={42} />
                <p>공개 지도를 열면 여기에서 상세 정보를 볼 수 있습니다.</p>
              </div>
            )
          ) : (
            <div className={styles.emptyState}>
              <MapIcon size={42} />
              <p>닉네임을 검색하면 공개 지도가 여기에 표시됩니다.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
