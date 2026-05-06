import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Lock, LogOut, BookmarkPlus } from 'lucide-react';
import toggleLogo from '../assets/logo.png';
import { clearAuthSession } from '../lib/session';
import { useAuthSession } from '../hooks/useAuthSession';
import styles from './LandingWeb.module.css';

export default function LandingWeb() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const [scrollY, setScrollY] = useState(0);
  const [, setClickCount] = useState(0); // 이스터에그 카운트

  const handleLogoClick = () => {
    setClickCount(prev => {
      if (prev + 1 === 5) {
        navigate('/adminloginweb');
        return 0;
      }
      return prev + 1;
    });
  };

  const handleAuthButtonClick = () => {
    if (isLoggedIn) {
      clearAuthSession();
      return;
    }

    navigate('/loginweb');
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      {/* 글로벌 네비게이션 바 */}
      <nav className={`${styles.navbar} ${scrollY > 50 ? styles.navScrolled : ''}`}>
        <div className={styles.logoGroup} onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <img src={toggleLogo} alt="Toggle logo" className={styles.logoMark} />
          <span className={styles.logoText}>Toggle</span>
        </div>
        <div className={styles.navLinks}>
          <button className={styles.loginBtn} onClick={handleAuthButtonClick}>
            {isLoggedIn ? <LogOut size={16} /> : <Lock size={16} />}
            {isLoggedIn ? '로그아웃' : '로그인'}
          </button>
          <button className={styles.signupBtn} onClick={() => navigate('/signupweb')}>
            회원가입
          </button>
        </div>
      </nav>

      <main className={styles.mainSection}>
        <div className={styles.heroContent}>
          <div className={styles.badgeLine}>
            <div className={styles.liveIndicator} />
            <span className={styles.badgeText}>실시간 동기화 지도 서비스</span>
          </div>

          <h1 className={styles.title}>
            <span className={styles.highlight}>
              지금, 열려있는 공간을 <br />
              공유하다
            </span>
          </h1>

          <p className={styles.subtitle}>
            Toggle은 점포의 실제 영업 상태를 지도를 통해 정확히 보여줍니다.
          </p>

          <div className={styles.ctaGroup}>
            <button className={styles.primaryCta} onClick={() => navigate('/mapweb')}>
              <span aria-hidden="true">➜</span> 데스크탑 버젼으로 탐색 시작
            </button>
            <button className={styles.secondaryCta} onClick={() => navigate('/sharedweb')}>
              <span aria-hidden="true">⌕</span> 공개 지도 둘러보기
            </button>
          </div>
        </div>
      </main>

      {/* Overview / Feature Cards Section */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2>Why Toggle?</h2>
          <p>포털 지도에서는 알 수 없었던 진정한 실시간 정보들</p>
        </div>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.iconBoxTop}>
              <Store size={32} />
            </div>
            <h3>실시간 매장 운영 정보</h3>
            <p>사장님이 POS에서 조작하는 즉시 영업/설정중, 조기마감 등 돌발상황이 반영됩니다.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconBoxTop}>
              <MapPin size={32} />
            </div>
            <h3>스마트 핀 기반 맵</h3>
            <p>복잡하게 여러 글씨를 보지 마세요. 색상과 간단한 텍스트로 이루어진 스마트핀이 알려줍니다.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconBoxTop}>
              <BookmarkPlus size={32} />
            </div>
            <h3>나만의 지도 저장</h3>
            <p>자주 찾는 장소와 관심 지점을 저장해 두고, 다음 방문 때 바로 꺼내볼 수 있습니다.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <img src={toggleLogo} alt="Toggle logo" className={styles.logoMarkSmall} />
          </div>
          <div className={styles.footerLinks}>
            <a href="#">서비스 약관</a>
            <a href="#">개인정보 처리방침</a>
            <a href="#">점주 입점 가이드</a>
            <a href="#">고객센터</a>
          </div>
        </div>
        <div className={styles.copy}>
          &copy; 2026 Toggle. Built for seamless spatial experiences.
        </div>
      </footer>
    </div>
  );
}
