import { fetchMe, refreshToken as refreshTokenRequest } from './auth.js';

const DEFAULT_FAVORITES = { stores: [], publics: [] };
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const CURRENT_USER_KEY = 'currentUser';
const LOGGED_IN_KEY = 'isLoggedIn';
const REMEMBER_ME_KEY = 'rememberMe';
export const FAVORITES_REVISION_KEY = 'favoritesRevision';

function normalizeSessionUser(user = {}) {
  const mapProfile = user.mapProfile || {};
  const publicMapUuid = mapProfile.publicMapUuid ?? user.publicMapUuid ?? '';

  return {
    ...user,
    type: user.role || user.type,
    displayName: user.displayName ?? user.nickname ?? user.email?.split('@')?.[0] ?? '',
    publicMapUuid,
    isPublicMap: mapProfile.isPublic ?? user.isPublicMap ?? false,
    mapTitle: mapProfile.title ?? user.mapTitle ?? '',
    mapDesc: mapProfile.description ?? user.mapDesc ?? '',
    profileImage: mapProfile.profileImageUrl ?? user.profileImage ?? null,
  };
}

function dispatchSessionEvent(type, detail = {}) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getCurrentUserRole() {
  return getCurrentUser().role || getCurrentUser().type || '';
}

export function isLoggedIn() {
  return Boolean(getAccessToken()) && localStorage.getItem(LOGGED_IN_KEY) === 'true';
}

export function getRememberMe() {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

export function getAuthHeaders() {
  const accessToken = getAccessToken();
  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
}

export function persistAuthSession(authData, options = {}) {
  const { rememberMe = false } = options;
  const user = normalizeSessionUser(authData?.user || {});

  localStorage.setItem(ACCESS_TOKEN_KEY, authData.accessToken || '');
  localStorage.setItem(REFRESH_TOKEN_KEY, authData.refreshToken || '');
  localStorage.setItem(LOGGED_IN_KEY, 'true');
  localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify({
      ...normalizeSessionUser(getCurrentUser()),
      ...user,
    })
  );

  dispatchSessionEvent('authChanged', { loggedIn: true, user });
}

export function updateCurrentUser(fields) {
  const updatedUser = normalizeSessionUser({
    ...normalizeSessionUser(getCurrentUser()),
    ...fields,
  });

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
  dispatchSessionEvent('authChanged', { loggedIn: isLoggedIn(), user: updatedUser });
  return updatedUser;
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LOGGED_IN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  dispatchSessionEvent('authChanged', { loggedIn: false });
}

export async function restoreAuthSession() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    const user = await fetchMe(accessToken);
    updateCurrentUser({
      ...user,
    });
    return user;
  } catch {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthSession();
      return null;
    }

    try {
      const refreshed = await refreshTokenRequest(refreshToken);
      const user = await fetchMe(refreshed.accessToken);
      persistAuthSession(
        {
          ...refreshed,
          user,
        },
        { rememberMe: getRememberMe() }
      );
      return user;
    } catch {
      clearAuthSession();
      return null;
    }
  }
}

export function getLocalFavorites() {
  const currentUser = getCurrentUser();
  return {
    stores: Array.isArray(currentUser.favorites?.stores) ? currentUser.favorites.stores : DEFAULT_FAVORITES.stores,
    publics: Array.isArray(currentUser.favorites?.publics) ? currentUser.favorites.publics : DEFAULT_FAVORITES.publics,
  };
}

export function syncLocalFavoritesSnapshot(snapshot = {}, options = {}) {
  const { dispatch = false } = options;
  const nextFavorites = {
    stores: Array.from(new Set((snapshot.stores || []).map((id) => String(id)).filter(Boolean))),
    publics: Array.from(new Set((snapshot.publics || []).map((id) => String(id)).filter(Boolean))),
  };

  const currentUser = normalizeSessionUser(getCurrentUser());
  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify({
      ...currentUser,
      favorites: nextFavorites,
    })
  );

  if (dispatch) {
    dispatchSessionEvent('favoritesChanged', {
      stores: nextFavorites.stores,
      publics: nextFavorites.publics,
    });
  }

  return nextFavorites;
}

export function updateLocalFavorite(type, placeId, favorited) {
  const favorites = getLocalFavorites();
  const targetId = String(placeId);
  const key = type === 'PUBLIC' ? 'publics' : 'stores';

  const nextValues = favorited
    ? Array.from(new Set([...(favorites[key] || []), targetId]))
    : (favorites[key] || []).filter((id) => String(id) !== targetId);

  const updatedUser = updateCurrentUser({
    favorites: {
      ...favorites,
      [key]: nextValues,
    },
  });
  const currentRevision = Number(localStorage.getItem(FAVORITES_REVISION_KEY) || '0');
  localStorage.setItem(
    FAVORITES_REVISION_KEY,
    String(Number.isFinite(currentRevision) ? currentRevision + 1 : 1)
  );

  dispatchSessionEvent('favoritesChanged', {
    type,
    placeId: targetId,
    favorited,
  });

  return updatedUser;
}

export function getFavoritePlaceId(type, place) {
  if (!place) {
    return '';
  }

  if (type === 'PUBLIC') {
    return String(place.internalId ?? place.id ?? '');
  }

  return String(place.internalStoreId ?? place.storeId ?? place.id ?? '');
}

export function isFavoritePlace(type, place) {
  const favorites = getLocalFavorites();
  const key = type === 'PUBLIC' ? 'publics' : 'stores';
  const targetId = getFavoritePlaceId(type, place);
  return Boolean(targetId) && (favorites[key] || []).map(String).includes(targetId);
}

export function updateLocalFavoriteStore(placeId, favorited) {
  return updateLocalFavorite('STORE', placeId, favorited);
}

export function updateLocalFavoritePublic(placeId, favorited) {
  return updateLocalFavorite('PUBLIC', placeId, favorited);
}
