import { apiRequest } from './api.js';
import { getAuthHeaders } from './session.js';
import { normalizeClosureRequest } from './storeContracts.js';
import { sanitizeFileName, validateUploadFile } from './files.js';

export async function createOwnerStoreApplication({
  storeName,
  businessNumber,
  representativeName,
  businessOpenDate,
  businessAddress,
  businessPhone,
  businessLicenseFile,
}) {
  validateUploadFile(businessLicenseFile, 'business');

  const formData = new FormData();
  formData.append(
    'request',
    new Blob(
      [JSON.stringify({
        storeName,
        businessNumber,
        representativeName,
        businessOpenDate,
        businessAddress,
        businessPhone,
      })],
      { type: 'application/json' }
    )
  );
  formData.append('businessLicenseFile', businessLicenseFile, sanitizeFileName(businessLicenseFile.name || 'business-license'));

  return apiRequest('/api/v1/owner/store-registration-requests', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
}

export async function fetchMyOwnerStoreApplications() {
  return apiRequest('/api/v1/owner/store-registration-requests', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function fetchMyOwnerStores() {
  return apiRequest('/api/v1/owner/stores', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function fetchLatestOwnerStoreClosureRequest(storeId) {
  const data = await apiRequest(`/api/v1/owner/stores/${storeId}/closure-requests/latest`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return normalizeClosureRequest(data);
}

export async function createOwnerStoreClosureRequest(storeId, reason) {
  const data = await apiRequest(`/api/v1/owner/stores/${storeId}/closure-requests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: {
      reason: String(reason || '').trim() || null,
    },
  });

  return normalizeClosureRequest(data);
}

export async function updateOwnerStoreStatus(storeId, payload) {
  return apiRequest(`/api/v1/owner/stores/${storeId}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: payload,
  });
}

export async function updateOwnerStoreProfile(storeId, payload) {
  return apiRequest(`/api/v1/owner/stores/${storeId}/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: payload,
  });
}
