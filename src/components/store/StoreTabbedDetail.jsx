import React, { useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, Clock, Heart, Image as ImageIcon, MapPin, Navigation, Phone, Share2, Star } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import SafeImage from '../common/SafeImage';
import StoreMenuPanel from '../menus/StoreMenuPanel';
import StoreReviewSection from '../reviews/StoreReviewSection';
import { collectStoreCoverImages } from '../../lib/storeImages';
import { resolveStoreClosureUiState } from '../../lib/storeContracts';
import styles from './StoreTabbedDetail.module.css';

const TAB_ITEMS = [
  { id: 'HOME', label: '홈' },
  { id: 'MENU', label: '메뉴' },
  { id: 'REVIEW', label: '리뷰' },
  { id: 'PHOTO', label: '사진' },
];

function formatText(value, fallback = '정보 없음') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function buildFallbackNode(className, label) {
  return (
    <div className={className}>
      <ImageIcon size={24} />
      <span>{label}</span>
    </div>
  );
}

function renderHeroPhotos(images, storeName) {
  const visibleImages = images.slice(0, 4);
  const remainingCount = Math.max(0, images.length - visibleImages.length);

  if (visibleImages.length === 0) {
    return (
      <div className={styles.heroEmpty}>
        <ImageIcon size={36} />
        <span>등록된 사진이 없습니다</span>
      </div>
    );
  }

  if (visibleImages.length === 1) {
    return (
      <div className={styles.heroSingle}>
        <SafeImage
          src={visibleImages[0]}
          alt={storeName}
          className={styles.heroImage}
          fallback={buildFallbackNode(styles.heroFallback, '사진을 불러올 수 없습니다')}
        />
      </div>
    );
  }

  if (visibleImages.length === 2) {
    return (
      <div className={styles.heroPair}>
        {visibleImages.map((imageUrl, index) => (
          <div key={`${imageUrl}-${index}`} className={styles.heroTile}>
            <SafeImage
              src={imageUrl}
              alt={`${storeName} 사진 ${index + 1}`}
              className={styles.heroImage}
              fallback={buildFallbackNode(styles.heroFallback, '사진을 불러올 수 없습니다')}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.heroCollage}>
      <div className={`${styles.heroTile} ${styles.heroPrimary}`}>
        <SafeImage
          src={visibleImages[0]}
          alt={`${storeName} 대표 사진`}
          className={styles.heroImage}
          fallback={buildFallbackNode(styles.heroFallback, '사진을 불러올 수 없습니다')}
        />
      </div>
      <div className={styles.heroGrid}>
        {visibleImages.slice(1).map((imageUrl, index) => {
          const isLastTile = index === 2 && remainingCount > 0;
          return (
            <div key={`${imageUrl}-${index}`} className={styles.heroTile}>
              <SafeImage
                src={imageUrl}
                alt={`${storeName} 사진 ${index + 2}`}
                className={styles.heroImage}
                fallback={buildFallbackNode(styles.heroFallback, '사진을 불러올 수 없습니다')}
              />
              {isLastTile && (
                <div className={styles.heroOverlay}>
                  <ImageIcon size={24} />
                  <span>{remainingCount}+</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhotoGrid({ images, storeName }) {
  if (images.length === 0) {
    return (
      <div className={styles.emptyState}>
        <ImageIcon size={24} />
        <div>
          <strong>등록된 사진이 없습니다</strong>
          <p>점주가 등록한 사진이 있으면 이 탭에 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.photoGrid}>
      {images.map((imageUrl, index) => (
        <figure key={`${imageUrl}-${index}`} className={styles.photoCard}>
          <SafeImage
            src={imageUrl}
            alt={`${storeName} 사진 ${index + 1}`}
            className={styles.photoImage}
            fallback={buildFallbackNode(styles.photoFallback, '사진을 불러올 수 없습니다')}
          />
        </figure>
      ))}
    </div>
  );
}

export default function StoreTabbedDetail({
  store,
  runtimeStoreId,
  summary,
  onSummaryChange,
  isRegisteredStore = true,
  isFavorite = false,
  isFavoriteSubmitting = false,
  onBack,
  onDirections,
  onShare,
  onFavoriteClick,
  showHero = true,
  showMeta = true,
  showActions = true,
  showBackButton = true,
}) {
  const [activeTab, setActiveTab] = useState('HOME');

  const coverImages = useMemo(() => collectStoreCoverImages(store), [store]);
  const closureUiState = resolveStoreClosureUiState(store || {});

  const renderTabContent = () => {
    if (activeTab === 'MENU') {
      return (
        <StoreMenuPanel
          store={store}
          storeId={runtimeStoreId}
          storeName={store.name}
          categoryName={store.category}
          compact
        />
      );
    }

    if (activeTab === 'REVIEW') {
      return (
        <StoreReviewSection
          storeId={runtimeStoreId}
          storeName={store.name}
          summary={summary}
          onSummaryChange={onSummaryChange}
          isRegisteredStore={isRegisteredStore}
        />
      );
    }

    if (activeTab === 'PHOTO') {
      return <PhotoGrid images={coverImages} storeName={store.name} />;
    }

    return (
      <div className={styles.homeStack}>
        {closureUiState.isPending && (
          <div className={styles.noticeBox}>
            <span className={styles.noticeTitle}>운영 종료 요청</span>
            <span>접수되었습니다. 관리자 검토가 끝나기 전까지는 운영 정보가 유지됩니다.</span>
          </div>
        )}

        {closureUiState.isInactive && (
          <div className={`${styles.noticeBox} ${styles.noticeDanger}`}>
            <span className={styles.noticeTitle}>운영 종료</span>
            <span>현재 이 매장은 운영이 종료된 상태입니다.</span>
          </div>
        )}

        <div className={styles.infoCards}>
          <article className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <MapPin size={16} />
              <span>도로명 주소</span>
            </div>
            <p>{formatText(store.roadAddress || store.address)}</p>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <MapPin size={16} />
              <span>지번 주소</span>
            </div>
            <p>{formatText(store.jibunAddress || store.address)}</p>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <AlertCircle size={16} />
              <span>영업 상태</span>
            </div>
            <div className={styles.statusRow}>
              <StatusBadge status={store.status} type="STORE" size="sm" />
            </div>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <Clock size={16} />
              <span>영업시간 / 브레이크타임</span>
            </div>
            <p>{formatText(store.businessHours)}</p>
            {store.hasBreakTime && <small>브레이크타임: {formatText(store.breakTime)}</small>}
          </article>

          <article className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <Phone size={16} />
              <span>전화번호</span>
            </div>
            <p>{formatText(store.contact, '전화번호 정보 없음')}</p>
          </article>

          <article className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <Star size={16} />
              <span>점주 공지</span>
            </div>
            <p>{formatText(store.ownerNotice, '등록된 공지가 없습니다.')}</p>
          </article>
        </div>
      </div>
    );
  };

  if (!store) {
    return null;
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        {showHero && (
          <div className={styles.hero}>
            {renderHeroPhotos(coverImages, store.name)}
            {showBackButton && (
              <button type="button" className={`${styles.iconButton} ${styles.backButton}`} onClick={onBack}>
                <ChevronLeft size={24} />
              </button>
            )}
            <button
              type="button"
              className={`${styles.iconButton} ${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
              onClick={onFavoriteClick}
              disabled={isFavoriteSubmitting}
              aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        )}

        {showMeta && (
          <div className={styles.meta}>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>{store.name}</h1>
                <p className={styles.category}>{store.category}</p>
              </div>
              {showActions && (
                <div className={styles.actionRow}>
                  <button type="button" className={styles.actionButton} onClick={onShare}>
                    <Share2 size={16} />
                    <span>공유</span>
                  </button>
                  <button type="button" className={styles.actionButton} onClick={onDirections}>
                    <Navigation size={16} />
                    <span>길찾기</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.tabBar} role="tablist" aria-label="매장 상세 탭">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              className={`${styles.tabButton} ${activeTab === item.id ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.tabContent} role="tabpanel">
        {renderTabContent()}
      </div>
    </section>
  );
}
