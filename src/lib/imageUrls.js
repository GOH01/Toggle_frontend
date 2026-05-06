import { API_BASE_URL } from './api.js';

const PLACEHOLDER_URL_TOKENS = new Set([
  '',
  '-',
  'null',
  'none',
  'n/a',
  'na',
  'placeholder',
  'image',
]);

function normalizeImageUrlValue(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  if (PLACEHOLDER_URL_TOKENS.has(text.toLowerCase())) {
    return '';
  }

  return text;
}

export function resolveBrowserImageUrl(value) {
  const normalized = normalizeImageUrlValue(value);
  if (!normalized) {
    return '';
  }

  try {
    return new URL(normalized, API_BASE_URL).href;
  } catch {
    return normalized;
  }
}

export function resolveBrowserImageUrls(values = []) {
  const resolved = [];
  const seen = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const resolvedValue = resolveBrowserImageUrl(value);
    if (!resolvedValue || seen.has(resolvedValue)) {
      continue;
    }

    seen.add(resolvedValue);
    resolved.push(resolvedValue);
  }

  return resolved;
}

export function normalizeBrowserImageUrls(values = []) {
  return resolveBrowserImageUrls(values);
}

export function normalizeImageUrlForStorage(value) {
  return normalizeImageUrlValue(value);
}
