import React from 'react';
import styles from './Input.module.css';

export default function Input({ icon: Icon, error, className = '', ...props }) {
  return (
    <div className={`${styles.inputWrapper} ${className}`}>
      {Icon && (
        <div className={styles.iconContainer}>
          <Icon size={20} className={styles.icon} />
        </div>
      )}
      <input 
        className={`${styles.input} ${Icon ? styles.withIcon : ''} ${error ? styles.hasError : ''}`} 
        {...props} 
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
