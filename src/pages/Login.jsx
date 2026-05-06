import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Store, ChevronRight } from 'lucide-react';
import { login } from '../lib/auth';
import { persistAuthSession } from '../lib/session';
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  // 'USER' | 'OWNER'
  const [loginType, setLoginType] = useState('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // 추가
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError('');
  }, [loginType]);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const data = await login({
        email,
        password,
      });

      if (data.user?.role === 'ADMIN') {
        throw new Error('관리자 계정은 관리자 로그인 페이지에서 로그인해 주세요.');
      }

      if (data.user?.role !== loginType) {
        throw new Error(loginType === 'USER' ? '일반 사용자 계정으로 로그인해 주세요.' : '점주 계정으로 로그인해 주세요.');
      }

      persistAuthSession(data, { rememberMe });
      navigate(loginType === 'USER' ? '/map' : '/pos');
    } catch (loginError) {
      setError(loginError.message || '이메일 또는 비밀번호가 일치하지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.glassCard}>
        <div className={styles.header}>
          <h1 className={styles.logo}>Toggle</h1>
          <p className={styles.subtitle}>실시간으로 연결되는 우리 동네</p>
        </div>

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
            <Store size={18} /> 점주
          </div>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={`${styles.inputGroup} ${styles.formElement}`}>
            <input
              type="text"
              placeholder={loginType === 'USER' ? "이메일을 입력하세요" : "매장 관리자 이메일"}
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <User className={styles.inputIcon} size={20} />
          </div>

          <div className={`${styles.inputGroup} ${styles.formElement}`}>
            <input
              type="password"
              placeholder="비밀번호"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Lock className={styles.inputIcon} size={20} />
          </div>

          <div className={`${styles.rememberMeRow} ${styles.formElement}`}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              />
              <span>로그인 상태 유지</span>
            </label>
          </div>

          <div className={`${styles.footerActions} ${styles.formElement}`}>
            <button type="button" className={styles.actionLink}>아이디/비밀번호 찾기</button>
            <button type="button" className={styles.actionLink} onClick={() => navigate('/signup')}>
              {loginType === 'USER' ? '회원가입' : '점주 계정 만들기'}
            </button>
          </div>

          {error && <p className={styles.formElement} style={{ color: '#f87171', margin: 0 }}>{error}</p>}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`${styles.submitBtn} ${loginType === 'OWNER' ? styles.ownerBtn : ''} ${styles.formElement}`}
          >
            {isSubmitting ? '처리 중...' : '로그인'} <ChevronRight size={20} strokeWidth={3} />
          </button>
        </form>

        {/* Only show 'Continue without login' for general users, since stores must login */}
        {loginType === 'USER' && (
          <button 
            type="button" 
            className={styles.skipLink}
            onClick={() => navigate('/map')}
          >
            로그인 없이 지도 둘러보기
          </button>
        )}
      </div>
    </div>
  );
}
