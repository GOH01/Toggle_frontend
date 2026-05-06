import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, ChevronRight, Navigation, Mail } from 'lucide-react';
import { login } from '../lib/auth';
import { persistAuthSession } from '../lib/session';
import { useAuthSession } from '../hooks/useAuthSession';
import styles from './AdminLoginWeb.module.css';

export default function AdminLoginWeb() {
  const navigate = useNavigate();
  const auth = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Toggle Admin Login';

    if (auth.isLoggedIn && auth.role === 'ADMIN') {
      navigate('/adminweb', { replace: true });
    }
  }, [auth.isLoggedIn, auth.role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await login({ email, password });

      if (data.user?.role !== 'ADMIN') {
        throw new Error('관리자 계정으로 로그인해 주세요.');
      }

      persistAuthSession(data, { rememberMe });
      navigate('/adminweb', { replace: true });
    } catch (loginError) {
      setError(loginError.message || '관리자 로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <ShieldCheck size={32} color="white" />
          </div>
          <h1 className={styles.title}>Toggle <span className={styles.subtitle}>Admin</span></h1>
        </div>

        <p className={styles.desc}>점주 신청을 검토하고 사업자 승인과 매핑 현황을 관리하는 운영 콘솔입니다.</p>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputWrapper}>
            <label className={styles.label}>관리자 이메일</label>
            <div className={styles.inputGroup}>
              <input
                type="email"
                placeholder="admin@toggle.com"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
              <Mail className={styles.inputIcon} size={20} />
            </div>
          </div>

          <div className={styles.inputWrapper}>
            <label className={styles.label}>관리자 비밀번호</label>
            <div className={styles.inputGroup}>
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Lock className={styles.inputIcon} size={20} />
            </div>
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>로그인 상태 유지</span>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? '인증 중...' : '관리자 모드 진입'} <ChevronRight size={20} strokeWidth={3} />
          </button>
        </form>

        <button className={styles.backBtn} onClick={() => navigate('/web')}>
          <Navigation size={16} /> 홈페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}
