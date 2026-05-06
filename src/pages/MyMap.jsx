import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, User, Heart, MapPin, List as ListIcon, Edit2 } from 'lucide-react';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import PlaceCard from '../components/common/PlaceCard';
import { STATUS_TYPES } from '../constants/status';
import { fetchStoresByIds } from '../lib/stores';
import { fetchPublicInstitutionsByIds } from '../lib/publicInstitutions';
import { mapStoreToPlace, mapPublicToPlace } from '../lib/mappers';
import { buildSharedMapUrl, fetchMyMap, removeMyMapPublic, removeMyMapStore, updateMyMapProfile } from '../lib/myMap';
import { clearAuthSession, getCurrentUser, updateCurrentUser } from '../lib/session';
import styles from './MyMap.module.css';

function getDefaultTitle(user) {
  return user.nickname || user.email?.split('@')[0] || '사용자';
}

export default function MyMap() {
  const navigate = useNavigate();
  const initialUser = getCurrentUser();
  const [myMap, setMyMap] = useState(null);
  const [stores, setStores] = useState([]);
  const [publicInstitutions, setPublicInstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('STORE');
  const [viewMode, setViewMode] = useState('LIST');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [mapTitle, setMapTitle] = useState(`${getDefaultTitle(initialUser)}님의 지도`);
  const [mapDesc, setMapDesc] = useState('내가 다시 보고 싶은 장소를 모아둔 개인 지도입니다.');
  const [mapCenter, setMapCenter] = useState({ lat: 37.5065, lng: 127.0536 });

  const loadMyMap = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchMyMap();
      const [storeItems, publicItems] = await Promise.all([
        fetchStoresByIds(data.stores || []),
        fetchPublicInstitutionsByIds(data.publics || []),
      ]);

      const mappedStores = storeItems.map(mapStoreToPlace);
      const mappedPublics = publicItems.map(mapPublicToPlace);
      const profile = data.mapProfile || {};

      setMyMap(data);
      setStores(mappedStores);
      setPublicInstitutions(mappedPublics);
      setMapTitle(profile.title || `${getDefaultTitle(initialUser)}님의 지도`);
      setMapDesc(profile.description || '내가 다시 보고 싶은 장소를 모아둔 개인 지도입니다.');

      const firstPlace = mappedStores[0] || mappedPublics[0];
      if (firstPlace?.lat && firstPlace?.lng) {
        setMapCenter({ lat: firstPlace.lat, lng: firstPlace.lng });
      }

      updateCurrentUser({
        publicMapUuid: profile.publicMapUuid ?? '',
        isPublicMap: profile.isPublic,
        mapTitle: profile.title || '',
        mapDesc: profile.description || '',
        profileImage: profile.profileImageUrl || null,
      });
    } catch (loadError) {
      setError(loadError.message || '내 지도를 불러오지 못했습니다.');
      setStores([]);
      setPublicInstitutions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyMap();
    // loadMyMap is intentionally run on mount and after explicit mutations only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sync = () => {
      loadMyMap();
    };

    window.addEventListener('authChanged', sync);
    return () => window.removeEventListener('authChanged', sync);
    // loadMyMap is intentionally stable for session refreshes in this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStores = stores.filter((store) => (
    onlyOpen ? store.status === STATUS_TYPES.STORE.OPEN : true
  ));
  const filteredPublics = publicInstitutions;
  const mapItems = activeTab === 'STORE'
    ? filteredStores.map((store) => ({ ...store, type: 'STORE', color: '#10b981' }))
    : filteredPublics.map((place) => ({ ...place, type: 'CONGESTION', color: '#3b82f6' }));

  const handleProfileUpdate = async (payload) => {
    const profile = await updateMyMapProfile(payload);
    setMyMap((current) => ({
      ...(current || {}),
      mapProfile: profile,
    }));
    setMapTitle(profile.title || `${getDefaultTitle(getCurrentUser())}님의 지도`);
    setMapDesc(profile.description || '내가 다시 보고 싶은 장소를 모아둔 개인 지도입니다.');
    updateCurrentUser({
      publicMapUuid: profile.publicMapUuid ?? '',
      isPublicMap: profile.isPublic,
      mapTitle: profile.title || '',
      mapDesc: profile.description || '',
      profileImage: profile.profileImageUrl || null,
    });
  };

  const handleRemovePlace = async (item, type) => {
    try {
      if (type === 'STORE') {
        await removeMyMapStore(item.internalStoreId);
      } else {
        await removeMyMapPublic(item.internalId);
      }
      await loadMyMap();
    } catch (removeError) {
      alert(removeError.message || '내 지도에서 삭제하지 못했습니다.');
    }
  };

  const handleShare = async () => {
    const publicMapUuid = myMap?.mapProfile?.publicMapUuid;
    if (!publicMapUuid) {
      alert('공유 링크를 생성할 수 없습니다.');
      return;
    }

    const url = buildSharedMapUrl(publicMapUuid);
    if (navigator.share) {
      try {
        await navigator.share({ title: mapTitle, text: mapDesc, url });
        return;
      } catch {
        // fall through
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      alert('공유 링크가 복사되었습니다.');
    } catch {
      alert('공유 링크 복사에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const displayTitle = mapTitle || `${getDefaultTitle(getCurrentUser())}님의 지도`;
  const displayDesc = mapDesc || '내가 다시 보고 싶은 장소를 모아둔 개인 지도입니다.';
  const isPublic = Boolean(myMap?.mapProfile?.isPublic);
  const sharedMapUuid = myMap?.mapProfile?.publicMapUuid ?? '';
  const sharedMapUrl = sharedMapUuid ? buildSharedMapUrl(sharedMapUuid) : '';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ChevronLeft size={24} />
          </button>
          <span className={styles.title}>나만의 지도</span>
        </div>
        <div className={styles.headerRight}>
          {isPublic && (
            <button className={styles.shareBtn} onClick={handleShare}>
              <Share2 size={16} /> 공유
            </button>
          )}
          <button className={styles.shareBtn} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.profileCard}>
          <div className={styles.profileTop}>
            <div className={styles.avatar}>
              <User size={24} color="white" />
            </div>

            <div className={styles.userInfo}>
              {isEditingTitle ? (
                <div className={styles.editTitleRow}>
                  <input
                    type="text"
                    value={mapTitle}
                    onChange={(event) => setMapTitle(event.target.value)}
                    className={styles.titleInput}
                  />
                  <button
                    className={styles.saveBtn}
                    onClick={async () => {
                      setIsEditingTitle(false);
                      await handleProfileUpdate({ title: mapTitle });
                    }}
                  >
                    저장
                  </button>
                </div>
              ) : (
                <div className={styles.titleRow}>
                  <h2>{displayTitle}</h2>
                  <Edit2 size={14} className={styles.editIcon} onClick={() => setIsEditingTitle(true)} />
                </div>
              )}

              {isEditingDesc ? (
                <div className={styles.editTitleRow} style={{ marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    value={mapDesc}
                    onChange={(event) => setMapDesc(event.target.value)}
                    className={styles.descInput}
                  />
                  <button
                    className={styles.saveBtn}
                    onClick={async () => {
                      setIsEditingDesc(false);
                      await handleProfileUpdate({ description: mapDesc });
                    }}
                  >
                    저장
                  </button>
                </div>
              ) : (
                <div className={styles.titleRow} style={{ marginTop: '0.25rem' }}>
                  <p className={styles.mapDescText}>{displayDesc}</p>
                  <Edit2 size={12} className={styles.editIcon} onClick={() => setIsEditingDesc(true)} />
                </div>
              )}

            </div>
          </div>

          <div className={styles.toggleSwitch}>
            <span>공개 지도 허용</span>
            <div
              className={`${styles.switch} ${isPublic ? styles.on : ''}`}
              onClick={() => handleProfileUpdate({ isPublic: !isPublic })}
            >
              <div className={styles.switchThumb} />
            </div>
          </div>

          <div className={styles.shareLinkCard}>
            <div className={styles.shareLinkHeader}>
              <div>
                <p className={styles.shareLinkLabel}>공유 링크</p>
                <p className={styles.shareLinkHint}>
                  {isPublic ? '복사해서 다른 사람과 공유할 수 있습니다.' : '공개로 전환하면 공유 링크가 활성화됩니다.'}
                </p>
              </div>
              {isPublic && (
                <button className={styles.shareLinkCopyBtn} onClick={handleShare} disabled={!sharedMapUrl}>
                  링크 복사
                </button>
              )}
            </div>

            <div className={styles.shareLinkRow}>
              <input
                className={styles.shareLinkInput}
                value={sharedMapUrl || '공개 상태에서 링크가 표시됩니다.'}
                readOnly
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className={styles.shareBtn} onClick={() => navigate('/shared')}>
              공개 지도 탐색
            </button>
            <button className={styles.shareBtn} onClick={() => navigate('/favorites')}>
              저장한 장소 보기
            </button>
          </div>
        </div>

        <div className={styles.mainTabs}>
          <button className={`${styles.mainTab} ${activeTab === 'STORE' ? styles.active : ''}`} onClick={() => setActiveTab('STORE')}>
            매장 ({stores.length})
          </button>
          <button className={`${styles.mainTab} ${activeTab === 'PUBLIC' ? styles.active : ''}`} onClick={() => setActiveTab('PUBLIC')}>
            공공기관 ({publicInstitutions.length})
          </button>
        </div>

        {activeTab === 'STORE' && (
          <div className={styles.filterBar}>
            <button
              className={`${styles.filterBtn} ${!onlyOpen ? styles.active : ''}`}
              onClick={() => setOnlyOpen(false)}
            >
              전체
            </button>
            <button
              className={`${styles.filterBtn} ${onlyOpen ? styles.active : ''}`}
              onClick={() => setOnlyOpen(true)}
            >
              영업중만
            </button>
          </div>
        )}

        {isLoading ? (
          <div className={styles.emptyState}>내 지도를 불러오는 중입니다...</div>
        ) : error ? (
          <div className={styles.emptyState}>{error}</div>
        ) : viewMode === 'LIST' ? (
          <div className={styles.placeGrid}>
            {(activeTab === 'STORE' ? filteredStores : filteredPublics).length > 0 ? (
              (activeTab === 'STORE' ? filteredStores : filteredPublics).map((item) => (
                <div key={`${activeTab}-${item.internalStoreId || item.internalId || item.id}`} className={styles.placeCardWrapper}>
                  <PlaceCard place={item} type={activeTab === 'STORE' ? 'STORE' : 'CONGESTION'} showFavorite={false} />
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleRemovePlace(item, activeTab)}
                  >
                    삭제
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                아직 내 지도에 추가한 장소가 없습니다.
              </div>
            )}
          </div>
        ) : (
          <div className={styles.mapContainer}>
            <Map center={mapCenter} style={{ width: '100%', height: '100%', borderRadius: '16px' }} level={5}>
              {mapItems.map((item, index) => {
                const position = item.lat && item.lng
                  ? { lat: item.lat, lng: item.lng }
                  : { lat: 37.5065 + (index * 0.001), lng: 127.0536 + (index * 0.001) };

                return (
                  <CustomOverlayMap key={`${item.type}-${item.internalStoreId || item.internalId || item.id}`} position={position} yAnchor={1}>
                    <div
                      className={styles.markerBaloon}
                      onClick={() => navigate(activeTab === 'STORE' ? `/store/${item.id}` : `/public/${item.id}`)}
                    >
                      <div style={{ width: 6, height: 6, background: item.color, borderRadius: '50%' }} />
                      <span>{item.name}</span>
                    </div>
                  </CustomOverlayMap>
                );
              })}
            </Map>
          </div>
        )}

        <button
          className={styles.viewToggleBtn}
          onClick={() => setViewMode(viewMode === 'LIST' ? 'MAP' : 'LIST')}
        >
          {viewMode === 'LIST' ? '🗺️ 지도 보기' : '📋 리스트 보기'}
        </button>
      </div>

      <div className={styles.bottomNavWrapper}>
        <nav className={styles.bottomNav}>
          <button style={navBtnStyle(false)} onClick={() => navigate('/map')}>
            <MapPin size={24} />
            <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>주변</span>
          </button>
          <button style={navBtnStyle(false)} onClick={() => navigate('/list')}>
            <ListIcon size={24} />
            <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>리스트</span>
          </button>
          <button style={navBtnStyle(false)} onClick={() => navigate('/favorites')}>
            <Heart size={24} />
            <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>저장</span>
          </button>
          <button style={navBtnStyle(true)}>
            <User size={24} />
            <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>마이</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

const navBtnStyle = (isActive) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.4)',
  background: 'none',
  border: 'none',
  outline: 'none',
  fontWeight: isActive ? 700 : 500,
  cursor: 'pointer',
});
