import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeFileName,
  stripPlaceholderImageUrls,
  validateUploadFile,
  uploadFile,
} from '../src/lib/files.js';
import { API_BASE_URL } from '../src/lib/api.js';

const DEFAULT_STORE_IMAGES = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?auto=format&fit=crop&w=200&q=80',
];

test('sanitizeFileName strips path traversal and unsafe characters', () => {
  assert.equal(sanitizeFileName('../사업자 등록증?.pdf'), '사업자_등록증_.pdf');
  assert.equal(sanitizeFileName('  report final #1 .png  '), 'report_final_1_.png');
});

test('stripPlaceholderImageUrls removes default placeholder images', () => {
  assert.deepEqual(
    stripPlaceholderImageUrls([
      DEFAULT_STORE_IMAGES[0],
      'https://cdn.example.com/store/1.png',
      DEFAULT_STORE_IMAGES[1],
      'https://cdn.example.com/store/2.png',
    ], DEFAULT_STORE_IMAGES),
    [
      'https://cdn.example.com/store/1.png',
      'https://cdn.example.com/store/2.png',
    ]
  );
});

test('validateUploadFile accepts business files and rejects invalid uploads', () => {
  assert.doesNotThrow(() => validateUploadFile(
    new File(['pdf'], 'business-license.pdf', { type: 'application/pdf' }),
    'business'
  ));

  assert.throws(() => validateUploadFile(
    new File(['txt'], 'notes.txt', { type: 'text/plain' }),
    'business'
  ), (error) => error.status === 400 && error.code === 'INVALID_FILE_TYPE');

  assert.throws(() => validateUploadFile(
    new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' }),
    'business'
  ), (error) => error.status === 400 && error.code === 'FILE_TOO_LARGE');
});

test('uploadFile posts multipart payload to the matching backend endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.localStorage = {
    getItem() {
      return '';
    },
    setItem() {},
    removeItem() {},
  };

  globalThis.fetch = async (url, init) => {
    assert.equal(url, new URL('/api/v1/files/store', API_BASE_URL).href);
    assert.equal(init.method, 'POST');
    assert.ok(init.body instanceof FormData);

    const uploadedFile = init.body.get('file');
    assert.ok(uploadedFile instanceof File);
    assert.equal(uploadedFile.name, 'store_photo_01.png');

    return new Response(JSON.stringify({
      success: true,
      data: {
        url: '/api/v1/files/view?key=store%2F123e4567-store_photo_01.png',
        key: 'store/123e4567-store_photo_01.png',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await uploadFile(
      new File(['image-bytes'], 'store photo 01.png', { type: 'image/png' }),
      'store'
    );

    assert.deepEqual(result, {
      url: new URL('/api/v1/files/view?key=store%2F123e4567-store_photo_01.png', API_BASE_URL).href,
      key: 'store/123e4567-store_photo_01.png',
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});
