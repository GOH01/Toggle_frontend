import React from 'react';
import { createPortal } from 'react-dom'; // 포탈 추가
import { useNavigate } from 'react-router-dom';
import { LogIn, X } from 'lucide-react';
import styles from './LoginModal.module.css';

export default function LoginModal({ isOpen, onClose, message }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLoginClick = () => {
    navigate('/login');
    onClose();
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} color="#94a3b8" />
        </button>

        <div className={styles.iconWrapper}>
          <LogIn size={28} color="var(--color-primary)" />
        </div>

        <h3 className={styles.title}>로그인이 필요합니다</h3>
        <p className={styles.description}>
          {message || '이 기능은 로그인 후 이용하실 수 있습니다.\n로그인 페이지로 이동하시겠습니까?'}
        </p>

        <div className={styles.actionRow}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button className={styles.loginBtn} onClick={handleLoginClick}>로그인하기</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
