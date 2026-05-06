import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { 
  Search, Crosshair, Heart, User, MapPin, List as ListIcon,
  ChevronLeft, Clock, BarChart2, Share2, Navigation, AlertCircle
} from 'lucide-react';
import toggleLogo from '../assets/logo.png';
import StatusBadge from '../components/common/StatusBadge';
import { clearAuthSession, getCurrentUser, isLoggedIn as getIsLoggedIn } from '../lib/session';
import { lookupPublicInstitutions } from '../lib/publicInstitutions';
import styles from './PublicWeb.module.css';

export default function PublicWeb() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => getIsLoggedIn());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [place, setPlace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Map control states
  const [mapCenter, setMapCenter] = useState({ lat: 37.5065, lng: 127.0536 });

  // Search State
  const [keyword, setKeyword] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 스크롤 상태
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(getIsLoggedIn());
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener('authChanged', syncAuthState);
    return () => window.removeEventListener('authChanged', syncAuthState);
  }, []);

  useEffect(() => {
    const fetchPlace = async () => {
      setIsLoading(true);
      try {
        const results = await lookupPublicInstitutions('KAKAO', [id]);
        if (results.length > 0) {
          const p = results[0];
          const mappedPlace = {
            ...p,
            id: p.externalPlaceId,
            status: p.congestionLevel,
            category: '공공기관', 
            address: p.address || '주소 정보 없음', 
            businessHours: p.operatingHours || '정보 없음',
            estimatedWaitTime: `${p.waitTime || 0}분`,
            lastStatusUpdate: '서버 반영',
            lat: p.latitude || 37.5065,
            lng: p.longitude || 127.0536,
            hourlyCongestion: [
              { time: '09시', level: 20 }, { time: '11시', level: 45 }, { time: '13시', level: 85 }, 
              { time: '15시', level: 60 }, { time: '17시', level: 30 }, { time: '19시', level: 15 }
            ]
          };
          setPlace(mappedPlace);
          setMapCenter({ lat: mappedPlace.lat, lng: mappedPlace.lng });
        }
      } catch (err) {
        console.error('Failed to fetch public institution:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlace();
  }, [id]);

  const handleDirections = () => {
    if (place && place.lat && place.lng) {
      window.open(`https://map.kakao.com/link/to/${place.name},${place.lat},${place.lng}`, '_blank');
    } else {
      alert('위치 정보가 없습니다.');
    }
  };

  const handleShare = () => {
    const shareData = {
      title: place?.name,
      text: `[Toggle] ${place?.name} (${place?.category}) 현재 혼잡도를 확인해 보세요!`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('주소가 클립보드에 복사되었습니다! 친구에게 공유해 보세요. 📋');
    }
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop > 100) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };

  // 실시간 연관 검색어 (디바운스)
  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(keyword, (data, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            setSuggestions(data);
            setIsDropdownOpen(true);
          }
        }, { location: new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng) });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSelectPlace = (placeData) => {
    const pos = { lat: Number(placeData.y), lng: Number(placeData.x) };
    setMapCenter(pos);
    setSelectedPlace({ id: placeData.id, position: pos, title: placeData.place_name });
    setKeyword(placeData.place_name);
    setIsDropdownOpen(false);
  };

  const renderEmptyState = (message) => (
    <div className={styles.webContainer}>
      <header className={styles.webHeader}>
        <div className={styles.logoGroup} onClick={() => navigate('/mapweb')}>
          <img src={toggleLogo} alt="Toggle logo" className={styles.logoMark} />
          <span className={styles.logoText}>Toggle</span>
        </div>
        
        <nav className={styles.navLinks}>
          <button className={styles.iconBtn} onClick={() => navigate('/favoritesweb')}><Heart size={20} /></button>
          <button className={styles.iconBtn} onClick={() => navigate('/my-mapweb')}><User size={20} /></button>
        </nav>
      </header>

      <div className={styles.webBody}>
        <aside className={styles.sidebar} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
            <AlertCircle size={48} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{message}</span>
            <button 
              onClick={() => navigate('/mapweb')}
              style={{
                marginTop: '1rem',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              지도로 돌아가기
            </button>
          </div>
        </aside>

        <div className={styles.contentArea}>
          <main className={styles.mapArea}>
            <Map center={{ lat: 37.5065, lng: 127.0536 }} style={{ width: '100%', height: '100%', borderRadius: '16px' }} level={4} />
          </main>
        </div>
      </div>
    </div>
  );

  if (isLoading) return <div className={styles.webContainer}><div className={styles.webBody} style={{justifyContent:'center', alignItems:'center', color:'white'}}>데이터를 불러오는 중입니다...</div></div>;
  if (!place) return renderEmptyState('기관 정보를 불러올 수 없습니다. URL을 재확인하시거나 지도를 통해 진입해주세요.');

  const coverImageUrl = "https://images.unsplash.com/photo-1577985051167-0d49eec21977?auto=format&fit=crop&w=800&q=80";

  const handleLogout = () => {
    clearAuthSession();
    navigate('/loginweb');
  };

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
              type="text" placeholder="장소, 주소 검색" className={styles.headerInput}
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => { if(suggestions.length > 0) setIsDropdownOpen(true); }}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            />
          </div>
          {isDropdownOpen && suggestions.length > 0 && (
            <ul className={styles.suggestionList}>
              {suggestions.map((item) => (
                <li key={item.id} className={styles.suggestionItem} onClick={() => handleSelectPlace(item)}>
                  <MapPin size={16} color="var(--color-primary)" className={styles.suggestionIcon} />
                  <div className={styles.suggestionText}>
                    <span className={styles.suggestionName}>{item.place_name}</span>
                    <span className={styles.suggestionAddress}>{item.address_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav className={styles.navLinks}>
          {isLoggedIn ? (
            <button className={styles.navBtn} onClick={handleLogout}>로그아웃</button>
          ) : (
            <button className={styles.navBtn} onClick={() => navigate('/loginweb')}>로그인</button>
          )}
          <button className={styles.iconBtn} onClick={() => navigate(isLoggedIn ? '/favoritesweb' : '/loginweb')}><Heart size={20} /></button>
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
          <div className={`${styles.detailHeader} ${isScrolled ? styles.headerSolid : ''}`}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}><ChevronLeft size={24} /></button>
            <div className={styles.headerTitle}>{place.name}</div>
            <button className={styles.headerActionBtn}><Heart size={22} color={isScrolled ? '#1e293b' : 'white'} /></button>
          </div>

          <div className={styles.scrollArea} onScroll={handleScroll}>
            <div className={styles.coverArea}>
              <img src={coverImageUrl} alt={place.name} className={styles.coverImage} />
              <div className={styles.coverOverlay} />
            </div>

            <div className={styles.content}>
              <h1 className={styles.title}>{place.name}</h1>
              <span className={styles.category}>{place.category}</span>
                
              <div className={styles.statusWrapper}>
                <StatusBadge status={place.status} type="CONGESTION" size="md" />
                <span className={styles.updateTime}>{place.lastStatusUpdate} 업데이트</span>
              </div>

              <div className={styles.infoList}>
                <div className={styles.infoItem}><MapPin size={18} className={styles.icon} /><span>{place.address}</span></div>
                <div className={styles.infoItem}>
                  <Clock size={18} className={styles.icon} />
                  <div>
                    <div>운영시간: {place.businessHours}</div>
                    <div style={{ color: 'var(--color-status-orange)', marginTop: '0.25rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      예상 대기시간 {place.estimatedWaitTime}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart2 size={20} /> 시간대별 예상 혼잡도 추이
                </h2>
                <div className={styles.chartContainer}>
                  {place.hourlyCongestion && place.hourlyCongestion.map((hour, idx) => {
                    let barColor = 'linear-gradient(180deg, var(--color-status-green) 0%, rgba(16, 185, 129, 0.1) 100%)';
                    if (hour.level > 80) barColor = 'linear-gradient(180deg, var(--color-status-red) 0%, rgba(2ef, 68, 68, 0.1) 100%)';
                    else if (hour.level > 50) barColor = 'linear-gradient(180deg, var(--color-status-orange) 0%, rgba(245, 158, 11, 0.1) 100%)';

                    return (
                      <div key={idx} className={styles.chartBarWrapper}>
                        <div className={styles.chartBar} style={{ height: `${hour.level}%`, background: barColor }} />
                        <span className={styles.chartLabel}>{hour.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ paddingBottom: '100px' }}></div>
            </div>
          </div>
          
          <div className={styles.floatingActionBar}>
            <button className={styles.shareBtn} onClick={handleShare}><Share2 size={22} /></button>
            <button className={styles.navBtnFloat} onClick={handleDirections}><Navigation size={20} /> 길찾기</button>
          </div>
        </aside>

        <div className={styles.contentArea}>
          <main className={styles.mapArea}>
            <Map center={mapCenter} style={{ width: '100%', height: '100%', borderRadius: '16px' }} level={4}>
              {!selectedPlace && (
                <CustomOverlayMap position={mapCenter} yAnchor={1} zIndex={100}>
                  <div className={styles.markerPlaceholder}>
                    <div className={styles.markerBaloon}>
                      <div style={{width: 8, height: 8, background: '#10b981', borderRadius: '50%'}} /> 
                      <span>{place.status}</span>
                    </div>
                    <MapPin size={42} fill="rgba(15,23,42,0.9)" color="white" className={styles.markerPin} />
                  </div>
                </CustomOverlayMap>
              )}
            </Map>
          </main>
        </div>
      </div>
    </div>
  );
}
