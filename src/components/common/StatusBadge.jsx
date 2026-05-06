import React from 'react';
import { STATUS_UI, normalizeStoreStatus } from '../../constants/status';
import styles from './StatusBadge.module.css';

export default function StatusBadge({ status, type = 'STORE', size = 'sm', className = '' }) {
  const normalizedStatus = type === 'STORE' ? normalizeStoreStatus(status) : status;
  const uiInfo = STATUS_UI[type]?.[normalizedStatus];
  
  // 만약 알 수 없는 상태값이면 기본 회색 렌더링
  if (!uiInfo) {
    return (
      <span 
        className={`${styles.badge} ${styles[size]} ${className}`}
        style={{ backgroundColor: 'var(--color-status-gray)' }}
      >
        상태 없음
      </span>
    );
  }

  return (
    <span 
      className={`${styles.badge} ${styles[size]} ${className}`}
      style={{ backgroundColor: uiInfo.colorVar }}
    >
      {uiInfo.label}
    </span>
  );
}
