import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, User, MapPin, List as ListIcon, Share2, Crosshair, Edit2,
} from 'lucide-react';
import toggleLogo from '../assets/logo.png';
import PlaceCard from '../components/common/PlaceCard';
import MapViewport from '../components/common/MapViewport';
import { STATUS_TYPES } from '../constants/status';
import { clearAuthSession, getCurrentUser, updateCurrentUser } from '../lib/session';
import { fetchStoresByIds } from '../lib/stores';
import { fetchPublicInstitutionsByIds } from '../lib/publicInstitutions';
import { mapStoreToPlace, mapPublicToPlace } from '../lib/mappers';
import { buildSharedMapUrl, fetchMyMap, removeMyMapPublic, removeMyMapStore, updateMyMapProfile } from '../lib/myMap';
import useFavoriteRefreshChannel from '../hooks/useFavoriteRefreshChannel';
import styles from './MyMapWeb.module.css';

function getDefaultTitle(user) {
  return user.nickname || user.email?.split('@')[0] || '사용자';
}

export default function MyMapWeb() {
  const navigate = useNavigate();
  const initialUser = getCurrentUser();
  const [myMap, setMyMap] = useState(null);
  const [stores, setStores] = useState([]);
  const [publicInstitutions, setPublicInstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('STORE');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5065, lng: 127.0536 });
  const [myLocation, setMyLocation] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [mapTitle, setMapTitle] = useState(`${getDefaultTitle(initialUser)}님의 지도`);
  const [mapDesc, setMapDesc] = useState('즐겨찾기에서 골라 저장한 장소만 따로 모아두는 컬렉션입니다.');

  const loadMyMap = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchMyMap();
      const [storeResult, publicResult] = await Promise.allSettled([
        fetchStoresByIds(data.stores || []),
        fetchPublicInstitutionsByIds(data.publics || []),
      ]);
      const mappedStores = storeResult.status === 'fulfilled'
        ? storeResult.value.map(mapStoreToPlace)
        : null;
      const mappedPublics = publicResult.status === 'fulfilled'
        ? publicResult.value.map(mapPublicToPlace)
        : null;
      const profile = data.mapProfile || {};

      setMyMap(data);
      if (mappedStores) {
        setStores(mappedStores);
      }
      if (mappedPublics) {
        setPublicInstitutions(mappedPublics);
      }
      setMapTitle(profile.title || `${getDefaultTitle(initialUser)}님의 지도`);
      setMapDesc(profile.description || '즐겨찾기에서 골라 저장한 장소만 따로 모아두는 컬렉션입니다.');

      const firstPlace = mappedStores?.[0] || mappedPublics?.[0];
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
      if (storeResult.status === 'rejected' && publicResult.status === 'rejected') {
        setError('내 지도를 불러오지 못했습니다.');
      } else if (storeResult.status === 'rejected' || publicResult.status === 'rejected') {
        setError('일부 장소를 불러오지 못했습니다.');
      }
    } catch (loadError) {
      setError(loadError.message || '내 지도를 불러오지 못했습니다.');
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

  useFavoriteRefreshChannel(() => {
    loadMyMap();
  });

  const filteredStores = stores.filter((store) => (
    onlyOpen ? store.status === STATUS_TYPES.STORE.OPEN : true
  ));
  const filteredPublics = publicInstitutions;
  const allFilteredItems = activeTab === 'STORE'
    ? filteredStores.map((store) => ({ ...store, type: 'STORE', color: '#10b981' }))
    : filteredPublics.map((place) => ({ ...place, type: 'CONGESTION', color: '#3b82f6' }));

  const handleProfileUpdate = async (payload) => {
    const profile = await updateMyMapProfile(payload);
    setMyMap((current) => ({
      ...(current || {}),
      mapProfile: profile,
    }));
    setMapTitle(profile.title || `${getDefaultTitle(getCurrentUser())}님의 지도`);
    setMapDesc(profile.description || '즐겨찾기에서 골라 저장한 장소만 따로 모아두는 컬렉션입니다.');
    updateCurrentUser({
      publicMapUuid: profile.publicMapUuid ?? '',
      isPublicMap: profile.isPublic,
      mapTitle: profile.title || '',
      mapDesc: profile.description || '',
      profileImage: profile.profileImageUrl || null,
    });
  };

  const handleRemovePlace = async (item) => {
    try {
      if (item.type === 'STORE') {
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
    const url = buildSharedMapUrl(publicMapUuid, true);
    try {
      await navigator.clipboard.writeText(url);
      alert('지도 링크가 복사되었습니다.');
    } catch {
      alert('지도 링크 복사에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/loginweb');
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert('현위치를 가져올 수 없습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMapCenter(location);
        setMyLocation(location);
      },
      () => alert('현위치를 가져올 수 없습니다.'),
    );
  };

  const isPublic = Boolean(myMap?.mapProfile?.isPublic);
  const sharedMapUuid = myMap?.mapProfile?.publicMapUuid ?? '';
  const sharedMapUrl = sharedMapUuid ? buildSharedMapUrl(sharedMapUuid, true) : '';

  return (
    <div className={styles.webContainer}>
      <header className={styles.webHeader}>
        <div className={styles.logoGroup} onClick={() => navigate('/mapweb')}>
          <img src={toggleLogo} alt="Toggle logo" className={styles.logoMark} />
          <span className={styles.logoText}>Toggle</span>
        </div>

        <button className={styles.headerSearchButton} onClick={() => navigate('/sharedweb')} type="button">
          <Share2 size={18} />
          <span>공개 지도 탐색</span>
        </button>

        <nav className={styles.navLinks}>
          <button className={styles.navBtn} onClick={handleLogout}>로그아웃</button>
          <button className={styles.iconBtn} onClick={() => navigate('/favoritesweb')}><Heart size={20} /></button>
          <button className={`${styles.iconBtn} ${styles.active}`} onClick={() => navigate('/my-mapweb')}><User size={20} /></button>
        </nav>
      </header>

      <div className={styles.webBody}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.profileCard}>
              <div className={styles.profileTop}>
                <div className={styles.avatar}>
                  <User size={28} color="white" />
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
                      <h2>{mapTitle}</h2>
                      <Edit2 size={14} className={styles.editIcon} onClick={() => setIsEditingTitle(true)} />
                    </div>
                  )}

                  {isEditingDesc ? (
                    <div className={styles.editTitleRow}>
                      <input
                        type="text"
                        value={mapDesc}
                        onChange={(event) => setMapDesc(event.target.value)}
                        className={styles.titleInput}
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
                    <div className={styles.titleRow}>
                      <p>{mapDesc}</p>
                      <Edit2 size={14} className={styles.editIcon} onClick={() => setIsEditingDesc(true)} />
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

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {isPublic && (
                <button className={styles.shareBtn} onClick={handleShare}>
                  <Share2 size={16} /> 링크 복사
                </button>
              )}
              <button className={styles.shareBtn} onClick={() => navigate('/sharedweb')}>
                공개 지도 탐색
              </button>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <strong>{stores.length + publicInstitutions.length}</strong>
                <span>내 지도 장소</span>
              </div>
              <div className={styles.statBox}>
                <strong>{stores.length}</strong>
                <span>저장한 매장</span>
              </div>
            </div>
          </div>

          <div className={styles.mainTabs}>
            <button className={`${styles.mainTab} ${activeTab === 'STORE' ? styles.active : ''}`} onClick={() => setActiveTab('STORE')}>매장 ({stores.length})</button>
            <button className={`${styles.mainTab} ${activeTab === 'PUBLIC' ? styles.active : ''}`} onClick={() => setActiveTab('PUBLIC')}>공공기관 ({publicInstitutions.length})</button>
          </div>

          {activeTab === 'STORE' && (
            <div className={styles.filterBar}>
              <button className={`${styles.filterBtn} ${!onlyOpen ? styles.active : ''}`} onClick={() => setOnlyOpen(false)}>전체</button>
              <button className={`${styles.filterBtn} ${onlyOpen ? styles.active : ''}`} onClick={() => setOnlyOpen(true)}>영업중만</button>
            </div>
          )}

          <div className={styles.listContainer}>
            {isLoading && <div className={styles.emptyState}>내 지도를 불러오는 중입니다.</div>}
            {!isLoading && error && <div className={styles.emptyState}>{error}</div>}
            {!isLoading && !error && allFilteredItems.length === 0 && (
              <div className={styles.emptyState}>아직 내 지도에 저장한 장소가 없습니다.</div>
            )}

            {!isLoading && !error && allFilteredItems.length > 0 && (
              <div className={styles.cardsWrapper}>
                {allFilteredItems.map((item) => {
                  const detailPath = item.type === 'STORE' ? `/storeweb/${item.id}` : `/publicweb/${item.id}`;
                  return (
                    <div key={`${item.type}-${item.internalStoreId || item.internalId || item.id}`} className={styles.cardItem} style={{ position: 'relative' }}>
                      <PlaceCard place={item} type={item.type} isWeb />
                      <div className={styles.cardActions}>
                        <button
                          className={styles.secondaryActionBtn}
                          onClick={() => {
                            if (item.lat && item.lng) {
                              setMapCenter({ lat: item.lat, lng: item.lng });
                            }
                          }}
                        >
                          지도에서 보기
                        </button>
                        <button className={styles.secondaryActionBtn} onClick={() => navigate(detailPath)}>
                          상세 보기
                        </button>
                        <button className={styles.dangerActionBtn} onClick={() => handleRemovePlace(item)}>
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className={styles.contentArea}>
          <main className={styles.mapArea}>
            <MapViewport
              center={mapCenter}
              items={allFilteredItems.map((item, index) => ({
                key: `marker-${item.type}-${item.internalStoreId || item.internalId || item.id || index}`,
                label: item.name,
                lat: item.lat,
                lng: item.lng,
                color: item.color,
                rawPlace: item,
              }))}
              onItemClick={(item) => {
                const place = item.rawPlace;
                if (!place) {
                  return;
                }

                if (place?.lat && place?.lng) {
                  setMapCenter({ lat: place.lat, lng: place.lng });
                }
                navigate(place.type === 'STORE' ? `/storeweb/${place.id}` : `/publicweb/${place.id}`);
              }}
              level={4}
              showMyLocation={Boolean(myLocation)}
              myLocation={myLocation}
              loadingMessage="카카오 지도를 불러오는 중입니다. 잠시만 기다려 주세요."
            />

            <button className={styles.myLocationBtn} onClick={handleMyLocation}>
              <Crosshair size={24} />
            </button>
          </main>

          <div className={styles.webBottomNav}>
            <div className={styles.navTabs}>
              <button className={styles.webNavBtn} onClick={() => navigate('/mapweb')}>
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
              <button className={`${styles.webNavBtn} ${styles.active}`} onClick={() => navigate('/my-mapweb')}>
                <User size={22} />
                <span>마이</span>
              </button>
            </div>
            <div className={styles.webFooter}>
              <span>&copy; 2026 Toggle. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
