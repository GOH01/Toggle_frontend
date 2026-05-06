import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import styles from './SearchBar.module.css';

export default function SearchBar({ placeholder = "주변 매장, 공공기관 검색", onFilterClick, value, onChange, isFilterActive = false }) {
  return (
    <div className={styles.searchContainer}>
      <div className={styles.inputWrapper}>
        <Search size={20} className={styles.searchIcon} />
        <input 
          type="text" 
          className={styles.input} 
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      </div>
      <button className={`${styles.filterBtn} ${isFilterActive ? styles.active : ''}`} onClick={onFilterClick} aria-label="필터 옵션">
        <SlidersHorizontal size={20} />
      </button>
    </div>
  );
}
