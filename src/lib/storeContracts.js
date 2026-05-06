import { STATUS_TYPES } from '../constants/status.js';
import { getUnregisteredStoreBlockMessage } from './storeGuards.js';

const MENU_SUPPORTED_TOKENS = ['음식점', '카페', 'restaurant', 'cafe', 'coffee', 'food'];
const CLOSURE_REQUEST_LABELS = {
  PENDING: '접수됨',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
};

const CLOSURE_REQUEST_TONES = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function pickFirstText(...values) {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) {
      return text;
    }
  }
  return '';
}

function inferOperationalState(storeLike = {}) {
  const explicitState = normalizeUpper(storeLike.operationalState);
  if (explicitState) {
    return explicitState;
  }

  if (storeLike.deletedAt) {
    return 'INACTIVE';
  }

  if (normalizeUpper(storeLike.closureRequestStatus) === 'PENDING') {
    return 'CLOSURE_REQUESTED';
  }

  if (normalizeUpper(storeLike.closureRequest?.status) === 'PENDING') {
    return 'CLOSURE_REQUESTED';
  }

  return 'ACTIVE';
}

function inferClosureRequestStatus(storeLike = {}) {
  const explicitStatus = normalizeUpper(storeLike.closureRequestStatus);
  if (explicitStatus) {
    return explicitStatus;
  }

  return normalizeUpper(storeLike.closureRequest?.status);
}

function inferRegisteredStore(storeLike = {}) {
  if (typeof storeLike.verified === 'boolean') {
    return storeLike.verified;
  }

  return normalizeUpper(storeLike.status) !== STATUS_TYPES.STORE.UNREGISTERED;
}

export function isMenuCategorySupported(categoryName = '') {
  const normalized = normalizeText(categoryName).toLowerCase();

  if (!normalized) {
    return false;
  }

  return MENU_SUPPORTED_TOKENS.some((token) => normalized.includes(token));
}

export function resolveStoreOperationalState(storeLike = {}) {
  const operationalState = inferOperationalState(storeLike);
  const closureRequestStatus = inferClosureRequestStatus(storeLike);
  const isRegisteredStore = inferRegisteredStore(storeLike);
  const isInactive = operationalState === 'INACTIVE' || Boolean(storeLike.deletedAt);
  const isClosureRequested = operationalState === 'CLOSURE_REQUESTED' || closureRequestStatus === 'PENDING';

  return {
    operationalState,
    closureRequestStatus,
    isRegisteredStore,
    isInactive,
    isClosureRequested,
  };
}

export function resolveStoreMenuAccess(storeLike = {}) {
  const state = resolveStoreOperationalState(storeLike);
  const categoryName = pickFirstText(
    storeLike.menuCategoryName,
    storeLike.categoryName,
    storeLike.category,
    storeLike.normalizedCategory,
    storeLike.searchCategory,
  );
  const categorySupported = typeof storeLike.menuCategorySupported === 'boolean'
    ? storeLike.menuCategorySupported
    : isMenuCategorySupported(categoryName);
  const menuEligible = typeof storeLike.menuEligible === 'boolean'
    ? storeLike.menuEligible
    : state.isRegisteredStore && categorySupported && !state.isInactive;
  const menuEditable = typeof storeLike.menuEditable === 'boolean'
    ? storeLike.menuEditable
    : menuEligible && !state.isInactive && !state.isClosureRequested;

  let menuEligibilityReason = normalizeText(storeLike.menuEligibilityReason);
  if (!menuEligibilityReason) {
    if (!state.isRegisteredStore) {
      menuEligibilityReason = getUnregisteredStoreBlockMessage();
    } else if (state.isInactive) {
      menuEligibilityReason = '운영 종료된 매장입니다.';
    } else if (!categorySupported) {
      menuEligibilityReason = '메뉴 기능은 음식점과 카페에서만 사용할 수 있습니다.';
    } else if (!menuEditable) {
      menuEligibilityReason = '운영 종료 요청이 접수되어 메뉴를 수정할 수 없습니다.';
    }
  }

  return {
    ...state,
    categoryName,
    categorySupported,
    menuEligible,
    menuEditable,
    menuEligibilityReason,
  };
}

export function normalizeClosureRequest(record = {}) {
  if (!record) {
    return null;
  }

  const status = normalizeUpper(record.status || record.requestStatus || record.closureRequestStatus);

  return {
    requestId: record.requestId ?? record.id ?? record.closureRequestId ?? null,
    storeId: record.storeId ?? record.store?.storeId ?? null,
    storeName: pickFirstText(record.storeName, record.name, record.store?.storeName),
    ownerName: pickFirstText(record.ownerName, record.ownerNickname),
    ownerEmail: pickFirstText(record.ownerEmail),
    reason: pickFirstText(record.reason, record.requestReason, record.closureReason),
    reviewReason: pickFirstText(record.reviewReason, record.rejectReason),
    status: status || 'PENDING',
    createdAt: record.createdAt || record.requestedAt || record.submittedAt || null,
    reviewedAt: record.reviewedAt || null,
    reviewedBy: pickFirstText(record.reviewedBy),
    operationalState: normalizeUpper(record.operationalState),
    closureRequestStatus: status || normalizeUpper(record.closureRequestStatus),
    raw: record,
  };
}

export function normalizeClosureRequestList(payload) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.requests || payload?.closureRequests || payload?.items || payload?.content || [];

  return items.map(normalizeClosureRequest).filter(Boolean);
}

export function getClosureRequestStatusMeta(status) {
  const normalized = normalizeUpper(status);

  return {
    label: CLOSURE_REQUEST_LABELS[normalized] || normalized || '상태 미확인',
    tone: CLOSURE_REQUEST_TONES[normalized] || 'neutral',
  };
}

export function resolveStoreClosureUiState(storeLike = {}, latestRequest = null) {
  const state = resolveStoreOperationalState(storeLike);
  const requestSource = latestRequest || storeLike.latestClosureRequest || storeLike.closureRequest || null;
  const request = requestSource ? normalizeClosureRequest(requestSource) : null;
  const requestStatus = request?.status || state.closureRequestStatus || '';
  const requestMeta = getClosureRequestStatusMeta(requestStatus);
  const isPending = requestStatus === 'PENDING';
  const requestReason = request?.reason || normalizeText(storeLike.closureRequestReason || storeLike.requestReason);
  const requestReviewedAt = request?.reviewedAt || storeLike.closureRequestReviewedAt || storeLike.reviewedAt || null;
  const requestReviewedBy = request?.reviewedBy || normalizeText(storeLike.closureRequestReviewedBy || storeLike.reviewedBy);

  return {
    ...state,
    request,
    requestStatus,
    requestMeta,
    requestReason,
    requestReviewedAt,
    requestReviewedBy,
    requestStoreName: request?.storeName || pickFirstText(storeLike.storeName, storeLike.name),
    canRequestClosure: state.isRegisteredStore && !state.isInactive && !isPending,
    duplicateRequestBlocked: isPending,
    isPending,
    isResolved: requestStatus === 'APPROVED' || requestStatus === 'REJECTED',
  };
}
