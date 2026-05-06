import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Store, ChevronRight, Navigation, Mail } from 'lucide-react';
import { signup } from '../lib/auth';
import toggleLogo from '../assets/logo.png';
import styles from './LoginWeb.module.css'; // 디자인 테마 공유

export default function SignupWeb() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState('USER'); // 'USER' | 'OWNER'
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [ownerDisplayName, setOwnerDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        email,
        password,
        nickname: loginType === 'USER' ? nickname : null,
        ownerDisplayName: loginType === 'OWNER' ? ownerDisplayName : null,
        role: loginType,
      });

      alert(loginType === 'OWNER'
        ? '점주 계정이 생성되었습니다. 로그인 후 매장 등록을 진행해 주세요.'
        : '회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      navigate('/loginweb');
    } catch (signupError) {
      setError(signupError.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Graphic Panel */}
      <div className={styles.graphicPanel}>
        <div className={styles.graphicOverlay} />
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1600" 
          alt="Restaurant and Cafe" 
          className={styles.graphicImage}
        />
        
        <div className={styles.graphicContent}>
          <div className={styles.logoGroup} onClick={() => navigate('/web')}>
            <img src={toggleLogo} alt="Toggle logo" className={styles.logoMark} />
            <span className={styles.logoText}>Toggle</span>
          </div>
          <h1 className={styles.graphicTitle}>
            {loginType === 'USER' ? '더 빠르고 정확하게, \n당신의 일상을 토글하세요.' : '점주 파트너가 되어 \n매장을 스마트하게 운영하세요.'}
          </h1>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className={styles.formPanel}>
        <div className={styles.formContainer}>
          <button className={styles.backBtn} onClick={() => navigate('/web')}>
            <Navigation size={18} /> 홈페이지로
          </button>
          
          <h2 className={styles.formTitle}>{loginType === 'USER' ? '계정 만들기 ✏️' : '점주 파트너 가입 💼'}</h2>
          <p className={styles.formSubtitle}>{loginType === 'USER' ? 'Toggle과 함께 스마트한 이동을 시작하세요.' : '점주 계정을 만든 뒤 로그인 후 매장 운영 권한을 신청하세요.'}</p>

          {/* User Type Toggle */}
          <div className={styles.tabContainer}>
            <div 
              className={styles.tabIndicator} 
              style={{ transform: loginType === 'USER' ? 'translateX(0)' : 'translateX(100%)' }} 
            />
            <div 
              className={`${styles.tab} ${loginType === 'USER' ? styles.active : ''}`}
              onClick={() => setLoginType('USER')}
            >
              <User size={18} /> 일반 사용자
            </div>
            <div 
              className={`${styles.tab} ${loginType === 'OWNER' ? styles.active : ''}`}
              onClick={() => setLoginType('OWNER')}
            >
              <Store size={18} /> 매장 점주
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSignup}>
            <div className={styles.inputWrapper}>
              <label>{loginType === 'USER' ? '이메일 주소' : '매장 관리용 이메일'}</label>
              <div className={styles.inputGroup}>
                <input
                  type="email" placeholder="example@toggle.com" className={styles.input}
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
                <Mail className={styles.inputIcon} size={20} />
              </div>
            </div>

            <div className={styles.inputWrapper}>
              <label>{loginType === 'USER' ? '닉네임 / 성함' : '매장명 / 대표자명'}</label>
              <div className={styles.inputGroup}>
                <input
                  type="text" placeholder={loginType === 'USER' ? "홍길동" : "토글가게 대치점"} className={styles.input}
                  value={loginType === 'USER' ? nickname : ownerDisplayName}
                  onChange={(e) => {
                    if (loginType === 'USER') {
                      setNickname(e.target.value);
                      return;
                    }
                    setOwnerDisplayName(e.target.value);
                  }}
                  required
                />
                <User className={styles.inputIcon} size={20} />
              </div>
            </div>

            <div className={styles.inputWrapper}>
              <label>비밀번호</label>
              <div className={styles.inputGroup}>
                <input
                  type="password" placeholder="6자리 이상 입력" className={styles.input}
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                />
                <Lock className={styles.inputIcon} size={20} />
              </div>
            </div>

            <div className={styles.inputWrapper}>
              <label>비밀번호 확인</label>
              <div className={styles.inputGroup}>
                <input
                  type="password" placeholder="비밀번호 재입력" className={styles.input}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                />
                <Lock className={styles.inputIcon} size={20} />
              </div>
            </div>

            {error && <p style={{ color: '#f87171', margin: 0 }}>{error}</p>}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`${styles.submitBtn} ${loginType === 'OWNER' ? styles.ownerBtn : ''}`} 
              style={{ marginTop: '1.5rem' }}
            >
              {isSubmitting ? '처리 중...' : (loginType === 'USER' ? '무료 회원가입' : '점주 계정 만들기')} <ChevronRight size={20} strokeWidth={3} />
            </button>
          </form>

          <div className={styles.signupPrompt}>
            이미 계정이 있으신가요? <a onClick={() => navigate('/loginweb')} style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>로그인하기</a>
          </div>

          <div className={styles.footerTerms} style={{ marginTop: '3rem' }}>
             가입함으로써 Toggle의 <a href="#">이용약관</a> 및 <a href="#">개인정보 처리방침</a>에 동의하게 됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
