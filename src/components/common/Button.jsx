import React from 'react';
import styles from './Button.module.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) {
  const baseClass = `${styles.btn} ${styles[variant]} ${styles[size]} ${
    fullWidth ? styles.fullWidth : ''
  } ${className}`;

  return (
    <button className={baseClass} {...props}>
      {children}
    </button>
  );
}
