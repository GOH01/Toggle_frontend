import { apiRequest } from './api';

export async function lookupStoresByExternalPlaceIds(externalSource, externalPlaceIds) {
  const normalizedIds = [...new Set(
    (externalPlaceIds || [])
      .map((id) => String(id || '').trim())
      .filter(Boolean)
  )];

  if (normalizedIds.length === 0) {
    return [];
  }

  const data = await apiRequest('/api/v1/stores/lookup', {
    method: 'POST',
    body: {
      externalSource,
      externalPlaceIds: normalizedIds,
    },
  });

  return data.stores || [];
}

export async function fetchStoresByIds(ids = []) {
  const normalizedIds = [...new Set(
    (ids || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  )];

  if (normalizedIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams();
  normalizedIds.forEach((id) => params.append('ids', String(id)));

  const data = await apiRequest(`/api/v1/stores?${params.toString()}`, {
    method: 'GET',
  });

  return data.stores || [];
}

export async function fetchNearbyVerifiedStores({ latitude, longitude, radiusMeters = 2000, limit = 30 }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radiusMeters: String(radiusMeters),
    limit: String(limit),
  });

  const data = await apiRequest(`/api/v1/stores/nearby?${params.toString()}`, {
    method: 'GET',
  });

  return data.stores || [];
}
