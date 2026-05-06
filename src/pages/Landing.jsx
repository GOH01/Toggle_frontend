import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, MapPin, Store, Search, ChevronRight, Navigation } from 'lucide-react';
import toggleLogo from '../assets/logo.png';
import styles from './Landing.module.css';

export default function Landing() {
  const navigate = useNavigate();
  const [, setClickCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const handleLogoClick = () => {
    setClickCount(prev => {
      const nextCount = prev + 1;
      if (nextCount >= 5) {
        setShowAdminModal(true);
        return 0;
      }
      return nextCount;
    });
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (adminPassword === '1234') {
      navigate('/admin');
    } else {
      alert('비밀번호가 일치하지 않습니다.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mapBackground} />

      <header className={styles.header}>
        <div className={styles.logo} onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <img src={toggleLogo} alt="Toggle logo" className={styles.logoMark} />
          <span className={styles.logoText}>Toggle</span>
        </div>
        <div className={styles.navLinks}>
          <button className={styles.loginBtn} onClick={() => navigate('/login')}>
            로그인 / 회원가입
          </button>
        </div>
      </header>

      <main className={styles.hero}>
        <div className={styles.badge}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <span>실시간 동기화 지도 서비스</span>
        </div>

        <h1 className={styles.title}>
          지금 방문 가능한<br />
          <span className={styles.highlight}>장소를 찾아보세요</span>
        </h1>

        <p className={styles.subtitle}>
          포털 지도에서 헛걸음하셨나요? <br/>
          Toggle은 점포의 실제 영업 상태를 실시간으로 반영합니다.
        </p>

        <div className={styles.ctaGroup}>
          <button className={styles.primaryCta} onClick={() => navigate('/map', { state: { autoGps: true } })}>
            <Navigation size={22} fill="currentColor" /> 내 주변 보기
          </button>
          
          <button className={styles.secondaryCta} onClick={() => navigate('/map')}>
            <Search size={22} /> 장소 검색하기
          </button>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <Store size={24} />
            </div>
            <span>실시간 영업 상태</span>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <MapPin size={24} />
            </div>
            <span>나만의 지도 저장</span>
          </div>
        </div>
      </main>

      {/* 관리자 이스터에그 모달 */}
      {showAdminModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>관리자 모드</h3>
            <p className={styles.modalDesc}>비밀번호를 입력해 주세요.</p>
            <form onSubmit={handleAdminSubmit} style={{ width: '100%' }}>
              <input 
                type="password" 
                placeholder="Password" 
                className={styles.modalInput}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoFocus
              />
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAdminModal(false)}>취소</button>
                <button type="submit" className={styles.confirmBtn}>확인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
