import React from 'react';
import { Map, List } from 'lucide-react';
import styles from './HomeTabs.module.css';

export default function HomeTabs({ activeTab, onTabChange }) {
  return (
    <div className={styles.tabsContainer}>
      <button 
        className={`${styles.tab} ${activeTab === 'map' ? styles.active : ''}`}
        onClick={() => onTabChange('map')}
      >
        <Map size={18} />
        <span>주변 지도</span>
      </button>
      <button 
        className={`${styles.tab} ${activeTab === 'list' ? styles.active : ''}`}
        onClick={() => onTabChange('list')}
      >
        <List size={18} />
        <span>목록 보기</span>
      </button>
      <div 
        className={styles.indicator} 
        style={{ transform: `translateX(${activeTab === 'map' ? '0' : '100%'})` }}
      />
    </div>
  );
}
