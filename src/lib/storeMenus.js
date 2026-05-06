import { apiRequest } from './api';
import { getAuthHeaders } from './session';
export {
  getClosureRequestStatusMeta,
  isMenuCategorySupported,
  normalizeClosureRequest,
  normalizeClosureRequestList,
  resolveStoreMenuAccess,
  resolveStoreOperationalState,
} from './storeContracts';

export async function fetchStoreMenus(storeId) {
  return apiRequest(`/api/v1/stores/${storeId}/menus`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function fetchOwnerStoreMenus(storeId) {
  return apiRequest(`/api/v1/owner/stores/${storeId}/menus`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function saveOwnerStoreMenus(storeId, menus) {
  return apiRequest(`/api/v1/owner/stores/${storeId}/menus`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: { menus },
  });
}

export async function unlinkOwnerStore(storeId) {
  return apiRequest(`/api/v1/owner/stores/${storeId}/link`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function deleteStoreAsAdmin(storeId, reason) {
  const suffix = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  return apiRequest(`/api/v1/stores/${storeId}${suffix}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function fetchLatestOwnerStoreClosureRequest(storeId) {
  return apiRequest(`/api/v1/owner/stores/${storeId}/closure-requests/latest`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function createOwnerStoreClosureRequest(storeId, reason) {
  return apiRequest(`/api/v1/owner/stores/${storeId}/closure-requests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: {
      reason: String(reason || '').trim() || null,
    },
  });
}
