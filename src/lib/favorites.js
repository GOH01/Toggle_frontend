import { apiRequest } from './api';
import { getAuthHeaders, updateLocalFavoriteStore, updateLocalFavoritePublic } from './session';
import { lookupPublicInstitutions } from './publicInstitutions';
import { lookupStoresByExternalPlaceIds } from './stores';
import { getUnregisteredStoreBlockMessage } from './storeGuards.js';
export { getUnregisteredStoreBlockMessage, isUnregisteredStorePlace } from './storeGuards.js';

const STORE_SOURCE = 'KAKAO';

export async function resolveStore(place) {
  const directStoreId = Number(place?.internalStoreId ?? place?.storeId);
  if (Number.isFinite(directStoreId) && directStoreId > 0) {
    return { storeId: directStoreId };
  }

  const resolvedList = await lookupStoresByExternalPlaceIds(STORE_SOURCE, [place.id]);
  const resolved = resolvedList[0];

  if (!resolved) {
    throw new Error(getUnregisteredStoreBlockMessage('favorite'));
  }

  return resolved;
}

export async function addFavoriteStore(place) {
  const resolved = await resolveStore(place);
  const data = await apiRequest(`/api/v1/favorites/stores/${resolved.storeId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  updateLocalFavoriteStore(resolved.storeId, true);

  return {
    ...data,
    externalPlaceId: String(place.id),
    storeId: resolved.storeId,
  };
}

export async function removeFavoriteStore(place) {
  const resolved = await resolveStore(place);
  const data = await apiRequest(`/api/v1/favorites/stores/${resolved.storeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  updateLocalFavoriteStore(resolved.storeId, false);

  return {
    ...data,
    externalPlaceId: String(place.id),
    storeId: resolved.storeId,
  };
}

export async function fetchFavoriteStores() {
  const data = await apiRequest('/api/v1/favorites/stores', {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return data.content || [];
}

export async function addFavoritePublic(place) {
  // Resolve first to ensure it exists in DB
  const resolvedList = await lookupPublicInstitutions(STORE_SOURCE, [place.id]);
  const resolved = resolvedList[0];
  
  if (!resolved) {
    throw new Error('공공기관 정보를 찾을 수 없습니다.');
  }

  const data = await apiRequest(`/api/v1/favorites/stores/publics/${resolved.id}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  updateLocalFavoritePublic(resolved.id, true);

  return {
    ...data,
    externalPlaceId: String(place.id),
    publicInstitutionId: resolved.id,
  };
}

export async function removeFavoritePublic(place) {
  // Resolve first to get internal ID
  const resolvedList = await lookupPublicInstitutions(STORE_SOURCE, [place.id]);
  const resolved = resolvedList[0];

  if (!resolved) {
    throw new Error('즐겨찾기 정보를 찾을 수 없습니다.');
  }

  const data = await apiRequest(`/api/v1/favorites/stores/publics/${resolved.id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  updateLocalFavoritePublic(resolved.id, false);

  return {
    ...data,
    externalPlaceId: String(place.id),
    publicInstitutionId: resolved.id,
  };
}
