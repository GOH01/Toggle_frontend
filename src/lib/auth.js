import { apiRequest } from './api.js';

export async function signup(payload) {
  return apiRequest('/api/v1/auth/signup', {
    method: 'POST',
    body: payload,
  });
}

export async function login(payload) {
  return apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function refreshToken(refreshTokenValue) {
  return apiRequest('/api/v1/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: refreshTokenValue,
    },
  });
}

export async function logout(refreshTokenValue) {
  return apiRequest('/api/v1/auth/logout', {
    method: 'POST',
    body: {
      refreshToken: refreshTokenValue,
    },
  });
}

export async function fetchMe(accessToken) {
  return apiRequest('/api/v1/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
