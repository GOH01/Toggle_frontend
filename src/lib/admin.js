import { apiRequest } from './api.js';
import { getAuthHeaders } from './session.js';
import { normalizeClosureRequest, normalizeClosureRequestList } from './storeContracts.js';

export async function fetchAdminOwnerStoreApplications() {
  return apiRequest('/api/v1/admin/store-registration-requests', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function fetchAdminStores() {
  return apiRequest('/api/v1/admin/stores', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function fetchAdminOwnerStores() {
  return apiRequest('/api/v1/admin/owner-stores', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function fetchAdminStoreClosureRequests(status = 'PENDING') {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }

  const data = await apiRequest(`/api/v1/admin/store-closure-requests${params.toString() ? `?${params.toString()}` : ''}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return normalizeClosureRequestList(data);
}

export async function approveStoreClosureRequest(requestId) {
  const data = await apiRequest(`/api/v1/admin/store-closure-requests/${requestId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return normalizeClosureRequest(data);
}

export async function rejectStoreClosureRequest(requestId, reason) {
  const data = await apiRequest(`/api/v1/admin/store-closure-requests/${requestId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: {
      reason: String(reason || '').trim() || null,
    },
  });

  return normalizeClosureRequest(data);
}

export async function fetchAdminOwnerStoreApplicationDetail(applicationId) {
  return apiRequest(`/api/v1/admin/store-registration-requests/${applicationId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

export async function executeAdminBusinessVerification(applicationId) {
  return apiRequest(`/api/v1/admin/store-registration-requests/${applicationId}/business-verifications/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

export async function manualVerifyOwnerStoreBusiness(applicationId, verified, reason) {
  return apiRequest(`/api/v1/admin/store-registration-requests/${applicationId}/business-verifications/manual`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: { verified, reason },
  });
}

export async function executeAdminMapVerification(applicationId, forceRefresh = true) {
  return apiRequest(`/api/v1/admin/store-registration-requests/${applicationId}/map-verifications/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: { forceRefresh },
  });
}

export async function approveOwnerStoreApplication(applicationId, adminConfirmed = true) {
  return apiRequest(`/api/v1/admin/store-registration-requests/${applicationId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: {
      adminConfirmed,
    },
  });
}

export async function rejectOwnerStoreApplication(applicationId, reason) {
  return apiRequest(`/api/v1/admin/store-registration-requests/${applicationId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: { reason },
  });
}
