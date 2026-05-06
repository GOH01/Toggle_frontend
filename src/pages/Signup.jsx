import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Store, ChevronRight, Smile } from 'lucide-react';
import { signup } from '../lib/auth';
import styles from './Signup.module.css';

export default function Signup() {
  const navigate = useNavigate();
  // 'USER' | 'OWNER'
  const [loginType, setLoginType] = useState('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [ownerDisplayName, setOwnerDisplayName] = useState('');
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
        : '회원가입이 완료되었습니다! 로그인해 주세요.');
      navigate('/login');
    } catch (signupError) {
      setError(signupError.message || '회원가입 중 오류가 발생했습니다.');
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
          <p className={styles.subtitle}>{loginType === 'USER' ? '새로운 시작, 우리 동네 연결하기' : '점주 계정을 만들고 로그인 후 매장을 등록해 보세요'}</p>
        </div>

        {/* Type Toggle */}
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

        <form className={styles.form} onSubmit={handleSignup}>
          <div className={`${styles.inputGroup} ${styles.formElement}`}>
            <input
              type="text"
              placeholder={loginType === 'USER' ? '닉네임' : '매장명 또는 대표자명'}
              className={styles.input}
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
            <Smile className={styles.inputIcon} size={20} />
          </div>

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

          <div className={`${styles.inputGroup} ${styles.formElement}`}>
            <input
              type="password"
              placeholder="비밀번호 확인"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Lock className={styles.inputIcon} size={20} />
          </div>

          {error && <p className={styles.formElement} style={{ color: '#f87171', margin: 0 }}>{error}</p>}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`${styles.submitBtn} ${loginType === 'OWNER' ? styles.ownerBtn : ''} ${styles.formElement}`}
          >
            {isSubmitting ? '처리 중...' : (loginType === 'USER' ? '가입하기' : '점주 계정 만들기')} <ChevronRight size={20} strokeWidth={3} />
          </button>
        </form>

        <button 
          type="button" 
          className={styles.skipLink}
          onClick={() => navigate('/login')}
        >
          이미 계정이 있으신가요? 로그인하기
        </button>
      </div>
    </div>
  );
}
