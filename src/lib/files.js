import { apiRequest } from './api.js';
import { getAuthHeaders } from './session.js';

export const FILE_UPLOAD_ENDPOINTS = {
  business: '/api/v1/files/business',
  menu: '/api/v1/files/menu',
  review: '/api/v1/files/review',
  store: '/api/v1/files/store',
};

export const FILE_UPLOAD_MAX_BYTES = {
  business: 10 * 1024 * 1024,
  menu: 5 * 1024 * 1024,
  review: 5 * 1024 * 1024,
  store: 5 * 1024 * 1024,
};

export const FILE_UPLOAD_ALLOWED_TYPES = {
  business: ['application/pdf', 'image/jpeg', 'image/png'],
  menu: ['image/jpeg', 'image/png', 'image/webp'],
  review: ['image/jpeg', 'image/png', 'image/webp'],
  store: ['image/jpeg', 'image/png', 'image/webp'],
};

function createUploadError(message, code) {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function resolveUploadLimitLabel(dir) {
  const maxBytes = FILE_UPLOAD_MAX_BYTES[dir] || 0;
  return Math.max(1, Math.round(maxBytes / (1024 * 1024)));
}

export function sanitizeFileName(fileName = 'file') {
  const raw = String(fileName ?? '').trim();
  if (!raw) {
    return 'file';
  }

  const normalized = raw.normalize('NFKC').replace(/[\\/]+/g, ' ');
  const sanitized = normalized
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/\.+/g, '.')
    .replace(/^\.+/, '')
    .replace(/^_+|_+$/g, '');

  return sanitized || 'file';
}

export function validateUploadFile(file, dir) {
  if (!file || typeof file !== 'object') {
    throw createUploadError('업로드할 파일이 필요합니다.', 'FILE_REQUIRED');
  }

  if (!FILE_UPLOAD_ENDPOINTS[dir]) {
    throw createUploadError('지원하지 않는 업로드 경로입니다.', 'INVALID_UPLOAD_DIR');
  }

  const allowedTypes = FILE_UPLOAD_ALLOWED_TYPES[dir];
  if (!allowedTypes.includes(file.type)) {
    throw createUploadError('허용되지 않는 파일 형식입니다.', 'INVALID_FILE_TYPE');
  }

  const maxBytes = FILE_UPLOAD_MAX_BYTES[dir];
  if (Number(file.size || 0) > maxBytes) {
    throw createUploadError(`파일 크기는 ${resolveUploadLimitLabel(dir)}MB 이하여야 합니다.`, 'FILE_TOO_LARGE');
  }

  return file;
}

export function stripPlaceholderImageUrls(imageUrls = [], placeholderUrls = []) {
  const placeholders = new Set((placeholderUrls || []).filter(Boolean));

  return (Array.isArray(imageUrls) ? imageUrls : [])
    .map((imageUrl) => String(imageUrl || '').trim())
    .filter((imageUrl) => imageUrl && !placeholders.has(imageUrl));
}

export async function uploadFile(file, dir) {
  validateUploadFile(file, dir);

  const formData = new FormData();
  formData.append('file', file, sanitizeFileName(file.name || 'file'));

  const data = await apiRequest(FILE_UPLOAD_ENDPOINTS[dir], {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  return {
    url: data?.url || '',
    key: data?.key || '',
  };
}

export async function uploadFiles(files = [], dir) {
  const uploads = Array.isArray(files) ? files : [];
  return Promise.all(uploads.map((file) => uploadFile(file, dir)));
}
