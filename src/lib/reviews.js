import { apiRequest } from './api.js';
import { getAuthHeaders } from './session.js';

const ALLOWED_SORTS = new Set(['latest', 'rating_desc', 'rating_asc']);
const DEFAULT_SORT = 'latest';
const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;

function normalizePageValue(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function normalizeSizeValue(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function normalizeReviewSort(sort = DEFAULT_SORT) {
  if (sort === null || sort === undefined || String(sort).trim() === '') {
    return DEFAULT_SORT;
  }

  const normalized = String(sort).trim().toLowerCase();
  if (!ALLOWED_SORTS.has(normalized)) {
    throw new Error('지원하지 않는 정렬 기준입니다.');
  }

  return normalized;
}

export function buildStoreReviewQueryParams({ sort = DEFAULT_SORT, page = DEFAULT_PAGE, size = DEFAULT_SIZE } = {}) {
  const params = new URLSearchParams();
  params.set('sort', normalizeReviewSort(sort));
  params.set('page', String(normalizePageValue(page, DEFAULT_PAGE)));
  params.set('size', String(normalizeSizeValue(size, DEFAULT_SIZE)));
  return params;
}

export function mapStoreReviewItem(item) {
  if (!item) return null;

  return {
    reviewId: item.reviewId,
    storeId: item.storeId,
    userId: item.userId,
    displayName: item.displayName || '사용자',
    rating: Number(item.rating ?? 0),
    content: item.content || '',
    imageUrls: Array.isArray(item.imageUrls)
      ? item.imageUrls.filter((imageUrl) => Boolean(String(imageUrl || '').trim()))
      : [],
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

export function mapStoreReviewSummary(summary) {
  return {
    averageRating: summary?.averageRating ?? null,
    reviewCount: Number.isFinite(Number(summary?.reviewCount)) ? Number(summary.reviewCount) : 0,
  };
}

export function mapStoreReviewPageResponse(payload) {
  const content = Array.isArray(payload?.content)
    ? payload.content.map(mapStoreReviewItem).filter(Boolean)
    : [];

  return {
    content,
    page: Number(payload?.page ?? DEFAULT_PAGE),
    size: Number(payload?.size ?? DEFAULT_SIZE),
    totalElements: Number(payload?.totalElements ?? 0),
    totalPages: Number(payload?.totalPages ?? 0),
    summary: mapStoreReviewSummary(payload?.summary),
  };
}

function buildStoreReviewPath(storeId, suffix = '') {
  const normalizedStoreId = String(storeId ?? '').trim();
  if (!normalizedStoreId) {
    throw new Error('storeId가 필요합니다.');
  }

  const trimmedSuffix = suffix ? `/${String(suffix).replace(/^\//, '')}` : '';
  return `/api/v1/stores/${normalizedStoreId}/reviews${trimmedSuffix}`;
}

export async function fetchStoreReviews(storeId, options = {}) {
  const params = buildStoreReviewQueryParams(options);
  const data = await apiRequest(`${buildStoreReviewPath(storeId)}?${params.toString()}`, {
    method: 'GET',
  });
  return mapStoreReviewPageResponse(data);
}

export async function fetchMyStoreReviews(storeId, options = {}) {
  const params = buildStoreReviewQueryParams(options);
  const data = await apiRequest(`${buildStoreReviewPath(storeId, 'mine')}?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return mapStoreReviewPageResponse(data);
}

export async function createStoreReview(storeId, payload) {
  return apiRequest(buildStoreReviewPath(storeId), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: payload,
  });
}

export async function updateStoreReview(reviewId, payload) {
  const normalizedReviewId = String(reviewId ?? '').trim();
  if (!normalizedReviewId) {
    throw new Error('reviewId가 필요합니다.');
  }

  return apiRequest(`/api/v1/reviews/${normalizedReviewId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: payload,
  });
}

export async function deleteStoreReview(reviewId) {
  const normalizedReviewId = String(reviewId ?? '').trim();
  if (!normalizedReviewId) {
    throw new Error('reviewId가 필요합니다.');
  }

  return apiRequest(`/api/v1/reviews/${normalizedReviewId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}
