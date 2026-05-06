import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, MessageSquare, Plus, Star, Trash2, X } from 'lucide-react';
import LoginModal from '../common/LoginModal';
import SafeImage from '../common/SafeImage';
import { useAuthSession } from '../../hooks/useAuthSession';
import {
  createStoreReview,
  deleteStoreReview,
  fetchMyStoreReviews,
  fetchStoreReviews,
  normalizeReviewSort,
  updateStoreReview,
} from '../../lib/reviews';
import { stripPlaceholderImageUrls, uploadFiles } from '../../lib/files';
import styles from './StoreReviewSection.module.css';

const REVIEW_PAGE_SIZE = 5;
const MAX_REVIEW_IMAGES = 5;
const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'rating_desc', label: '별점 높은순' },
  { value: 'rating_asc', label: '별점 낮은순' },
];

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatAverageRating(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : String(value);
}

function normalizeReviewError(error) {
  if (!error) return '리뷰를 불러오지 못했습니다.';

  const status = Number(error.status || error?.response?.status || 0);
  if (status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.';
  if (status === 403) return '내 리뷰만 수정/삭제할 수 있습니다.';
  if (status === 404) return '리뷰를 찾을 수 없습니다.';

  return error.message || '리뷰 처리 중 오류가 발생했습니다.';
}

function buildImageFallback(className, label) {
  return (
    <div className={className}>
      <ImageIcon size={18} />
      <span>{label}</span>
    </div>
  );
}

export default function StoreReviewSection({
  storeId,
  storeName,
  summary,
  onSummaryChange,
  isRegisteredStore = true,
}) {
  const auth = useAuthSession();
  const isLoggedIn = auth.isLoggedIn;
  const currentUserId = auth.user?.id ? String(auth.user.id) : '';

  const [sort, setSort] = useState('latest');
  const [reviews, setReviews] = useState([]);
  const [mineReview, setMineReview] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(null);
  const [content, setContent] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const resolvedSummary = summary || { averageRating: null, reviewCount: 0 };

  const ownedReviewIds = useMemo(() => {
    const ids = new Set();
    if (mineReview?.reviewId) {
      ids.add(String(mineReview.reviewId));
    }
    for (const review of reviews) {
      if (currentUserId && String(review.userId) === currentUserId && review.reviewId) {
        ids.add(String(review.reviewId));
      }
    }
    return ids;
  }, [currentUserId, mineReview, reviews]);

  const visibleReviews = reviews.filter((review) => !ownedReviewIds.has(String(review.reviewId)));

  const normalizeReviewImages = (imageUrls = []) => stripPlaceholderImageUrls(imageUrls, []).slice(0, MAX_REVIEW_IMAGES);

  const handleReviewImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const currentImageCount = reviewImages.length;
    const remainingSlots = MAX_REVIEW_IMAGES - currentImageCount;
    if (remainingSlots <= 0) {
      setImageUploadError('리뷰 이미지는 최대 5장까지 등록할 수 있습니다.');
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);
    if (files.length > uploadTargets.length) {
      setImageUploadError(`리뷰 이미지는 최대 5장까지 등록할 수 있어 ${files.length - uploadTargets.length}장은 제외했습니다.`);
    } else {
      setImageUploadError('');
    }

    try {
      setIsUploadingImages(true);
      const uploadedImages = await uploadFiles(uploadTargets, 'review');
      const uploadedUrls = uploadedImages.map((item) => item.url).filter(Boolean);
      setReviewImages((prev) => normalizeReviewImages([...prev, ...uploadedUrls]));
    } catch (error) {
      setImageUploadError(error.message || '리뷰 사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeReviewImage = (index) => {
    setReviewImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const loadReviews = async ({ nextPage = 0, append = false } = {}) => {
    setErrorMessage('');
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [storeReviews, mineReviews] = await Promise.all([
        fetchStoreReviews(storeId, { sort, page: nextPage, size: REVIEW_PAGE_SIZE }),
        isLoggedIn
          ? fetchMyStoreReviews(storeId, { sort, page: 0, size: REVIEW_PAGE_SIZE })
          : Promise.resolve(null),
      ]);

      const nextMineReview = mineReviews?.content?.[0] || null;
      const nextReviews = storeReviews.content;

      setReviews((prev) => (append ? [...prev, ...nextReviews] : nextReviews));
      setMineReview(nextMineReview);
      setPage(nextPage);
      setTotalPages(storeReviews.totalPages || 0);
      onSummaryChange?.(storeReviews.summary);
    } catch (error) {
      setErrorMessage(normalizeReviewError(error));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!isRegisteredStore || !storeId) {
        setReviews([]);
        setMineReview(null);
        setPage(0);
        setTotalPages(0);
        setErrorMessage('');
        setFormMessage('');
        setImageUploadError('');
        setRating(5);
        setHoveredRating(null);
        setContent('');
        setReviewImages([]);
        setPendingDeleteId(null);
        setIsMutating(false);
        setShowLoginModal(false);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      setReviews([]);
      setMineReview(null);
      setPage(0);
      setTotalPages(0);
      setFormMessage('');
      setImageUploadError('');
      setRating(5);
      setContent('');
      setReviewImages([]);
      await loadReviews({ nextPage: 0, append: false });
    };

    run();

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, sort, isLoggedIn, currentUserId, isRegisteredStore]);

  useEffect(() => {
    if (mineReview) {
      setRating(mineReview.rating || 5);
      setHoveredRating(null);
      setContent(mineReview.content || '');
      setReviewImages(normalizeReviewImages(mineReview.imageUrls || []));
      setFormMessage('');
      setImageUploadError('');
      return;
    }

    setRating(5);
    setHoveredRating(null);
    setContent('');
    setReviewImages([]);
    setFormMessage('');
    setImageUploadError('');
  }, [mineReview]);

  const handleSortChange = (nextSort) => {
    const normalized = normalizeReviewSort(nextSort);
    if (normalized !== sort) {
      setSort(normalized);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isRegisteredStore) {
      return;
    }

    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    const trimmedContent = content.trim();
    if (rating < 1 || rating > 5) {
      setFormMessage('별점은 1점부터 5점 사이여야 합니다.');
      return;
    }

    if (!trimmedContent) {
      setFormMessage('리뷰 내용을 입력해 주세요.');
      return;
    }

    setIsMutating(true);
    setFormMessage('');

    try {
      if (mineReview?.reviewId) {
        await updateStoreReview(mineReview.reviewId, { rating, content: trimmedContent, imageUrls: reviewImages });
      } else {
        await createStoreReview(storeId, { rating, content: trimmedContent, imageUrls: reviewImages });
      }

      await loadReviews({ nextPage: 0, append: false });
    } catch (error) {
      const message = normalizeReviewError(error);
      if (Number(error.status || 0) === 401) {
        setShowLoginModal(true);
      }
      setFormMessage(message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!isRegisteredStore || !mineReview?.reviewId || !isLoggedIn) {
      return;
    }

    const confirmed = window.confirm('정말로 리뷰를 삭제하시겠습니까?');
    if (!confirmed) {
      return;
    }

    setPendingDeleteId(mineReview.reviewId);
    setIsMutating(true);
    setFormMessage('');

    try {
      await deleteStoreReview(mineReview.reviewId);
      await loadReviews({ nextPage: 0, append: false });
    } catch (error) {
      const message = normalizeReviewError(error);
      if (Number(error.status || 0) === 401) {
        setShowLoginModal(true);
      }
      setFormMessage(message);
    } finally {
      setPendingDeleteId(null);
      setIsMutating(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || page + 1 >= totalPages) {
      return;
    }

    await loadReviews({ nextPage: page + 1, append: true });
  };

  const hasOwnReview = Boolean(mineReview?.reviewId);
  const reviewCountText = Number(resolvedSummary.reviewCount || 0);
  const emptyTitle = hasOwnReview ? '다른 리뷰가 아직 없어요.' : '아직 리뷰가 없어요.';
  const emptyDescription = hasOwnReview
    ? '내 리뷰를 제외한 다른 사용자들의 리뷰가 쌓이면 이곳에 표시됩니다.'
    : '첫 리뷰를 남겨서 다른 사람들에게 정보를 공유해 보세요.';

  if (!isRegisteredStore) {
    return (
      <section className={styles.section}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>리뷰</h2>
            <p className={styles.subtitle}>등록된 매장이 아닙니다</p>
          </div>
        </div>

        <div className={styles.emptyState}>
          <MessageSquare size={22} />
          <div>
            <strong>등록된 매장이 아닙니다</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>리뷰</h2>
          <p className={styles.subtitle}>
            {storeName ? `${storeName}에 남겨진 이야기를 확인해 보세요.` : '리뷰를 확인해 보세요.'}
          </p>
        </div>
        <div className={styles.sortGroup} role="tablist" aria-label="리뷰 정렬 방식">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.sortButton} ${sort === option.value ? styles.sortButtonActive : ''}`}
              onClick={() => handleSortChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryMetric}>
          <Star size={18} fill="currentColor" />
          <span className={styles.summaryValue}>{formatAverageRating(resolvedSummary.averageRating)}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryMetric}>
          <MessageSquare size={18} />
          <span className={styles.summaryValue}>리뷰 {reviewCountText}개</span>
        </div>
      </div>

      {!isLoggedIn ? (
        <div className={styles.writePrompt}>
          <div>
            <strong>로그인 후 리뷰를 남길 수 있어요.</strong>
            <p>내 별점을 저장하고, 나중에 수정하거나 삭제할 수 있습니다.</p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={() => setShowLoginModal(true)}>
            로그인하고 리뷰 작성
          </button>
        </div>
      ) : (
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <div>
              <h3 className={styles.formTitle}>{hasOwnReview ? '내 리뷰 수정' : '리뷰 작성'}</h3>
              <p className={styles.formSubtitle}>
                {hasOwnReview
                  ? '작성한 리뷰를 수정하거나 삭제할 수 있습니다.'
                  : '별점과 한 줄 의견을 남겨 주세요.'}
              </p>
            </div>
            {hasOwnReview && (
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={isMutating || pendingDeleteId !== null}
              >
                {pendingDeleteId === mineReview.reviewId ? <Loader2 size={16} className={styles.spinIcon} /> : <Trash2 size={16} />}
                삭제
              </button>
            )}
          </div>

          <div className={styles.ratingHeader}>
            <span className={styles.ratingTitle}>별점 선택</span>
            <span className={styles.ratingValue}>{`${hoveredRating ?? rating}.0`}</span>
          </div>

          <div
            className={styles.ratingSelector}
            aria-label="별점 선택"
            onMouseLeave={() => setHoveredRating(null)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setHoveredRating(null);
              }
            }}
          >
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              const selected = value <= (hoveredRating ?? rating);
              return (
                <button
                  key={value}
                  type="button"
                  className={`${styles.ratingButton} ${selected ? styles.ratingButtonActive : ''}`}
                  onMouseEnter={() => setHoveredRating(value)}
                  onFocus={() => setHoveredRating(value)}
                  onClick={() => setRating(value)}
                  aria-label={`${value}점`}
                  aria-pressed={value <= rating}
                >
                  <Star size={18} fill={selected ? 'currentColor' : 'none'} />
                </button>
              );
            })}
          </div>

          <textarea
            className={styles.textarea}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="리뷰 내용을 입력해 주세요."
            rows={4}
            maxLength={2000}
          />

          <div className={styles.imageUploadBlock}>
            <div className={styles.imageUploadHeader}>
              <div className={styles.imageUploadTitleRow}>
                <ImageIcon size={16} />
                <span className={styles.imageUploadTitle}>사진 첨부</span>
              </div>
              <span className={styles.imageUploadLimit}>최대 5장</span>
            </div>

            <label className={styles.imageUploadButton}>
              <Plus size={16} />
              <span>{reviewImages.length > 0 ? '사진 추가' : '사진 업로드'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleReviewImageUpload}
                disabled={isMutating || isUploadingImages}
              />
            </label>

            {reviewImages.length > 0 && (
              <div className={styles.imagePreviewGrid}>
                {reviewImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className={styles.imagePreviewCard}>
                    <SafeImage
                      src={imageUrl}
                      alt={`리뷰 사진 ${index + 1}`}
                      className={styles.imagePreviewImage}
                      fallback={buildImageFallback(styles.imagePreviewFallback, '사진을 불러올 수 없습니다')}
                    />
                    <button
                      type="button"
                      className={styles.imageRemoveButton}
                      onClick={() => removeReviewImage(index)}
                      disabled={isMutating || isUploadingImages}
                      aria-label={`리뷰 사진 ${index + 1} 삭제`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {imageUploadError && (
            <div className={styles.inlineError} role="alert">
              <AlertCircle size={16} />
              <span>{imageUploadError}</span>
            </div>
          )}

          {formMessage && (
            <div className={styles.inlineError} role="alert">
              <AlertCircle size={16} />
              <span>{formMessage}</span>
            </div>
          )}

          <div className={styles.formActions}>
            <span className={styles.helperText}>최대 2000자까지 작성할 수 있습니다.</span>
            <button type="submit" className={styles.primaryButton} disabled={isMutating}>
              {isMutating ? <Loader2 size={16} className={styles.spinIcon} /> : null}
              {hasOwnReview ? '수정 저장' : '리뷰 등록'}
            </button>
          </div>
        </form>
      )}

      {errorMessage && (
        <div className={styles.errorBox} role="alert">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>리뷰 목록</h3>
        <span className={styles.listCount}>총 {reviewCountText}개</span>
      </div>

      {isLoading ? (
        <div className={styles.stateBox}>
          <Loader2 size={18} className={styles.spinIcon} />
          <span>리뷰를 불러오는 중입니다...</span>
        </div>
      ) : visibleReviews.length > 0 ? (
        <div className={styles.reviewList}>
          {visibleReviews.map((review) => (
            <article key={review.reviewId} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div>
                  <strong className={styles.authorName}>{review.displayName}</strong>
                  <div className={styles.dateRow}>
                    <span>작성: {formatDateTime(review.createdAt)}</span>
                    {review.updatedAt && review.updatedAt !== review.createdAt && (
                      <span>수정: {formatDateTime(review.updatedAt)}</span>
                    )}
                  </div>
                </div>
                <div className={styles.ratingPill}>
                  <Star size={14} fill="currentColor" />
                  <span>{review.rating}</span>
                </div>
              </div>
              <p className={styles.reviewContent}>{review.content}</p>
              {Array.isArray(review.imageUrls) && review.imageUrls.length > 0 && (
                <div className={styles.reviewImageGrid}>
                  {review.imageUrls.map((imageUrl, index) => (
                    <SafeImage
                      key={`${review.reviewId}-${imageUrl}-${index}`}
                      src={imageUrl}
                      alt={`${review.displayName}의 리뷰 사진 ${index + 1}`}
                      className={styles.reviewImage}
                      fallback={buildImageFallback(styles.reviewImageFallback, '사진을 불러올 수 없습니다')}
                    />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <MessageSquare size={22} />
          <div>
            <strong>{emptyTitle}</strong>
            <p>{emptyDescription}</p>
          </div>
        </div>
      )}

      {totalPages > page + 1 && (
        <button type="button" className={styles.loadMoreButton} onClick={handleLoadMore} disabled={isLoadingMore || isLoading}>
          {isLoadingMore ? <Loader2 size={16} className={styles.spinIcon} /> : null}
          더 보기
        </button>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="리뷰 작성, 수정, 삭제는 로그인 후 이용하실 수 있습니다."
      />
    </section>
  );
}
