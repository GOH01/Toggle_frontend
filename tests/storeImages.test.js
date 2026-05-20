import test from 'node:test';
import assert from 'node:assert/strict';

import { API_BASE_URL } from '../src/lib/api.js';
import { collectStoreCoverImages } from '../src/lib/storeImages.js';

test('collectStoreCoverImages merges available store image sources', () => {
  const images = collectStoreCoverImages({
    ownerImages: ['/api/v1/files/view?fileId=store-1', ''],
    images: ['https://cdn.example.com/store-2.jpg', '/api/v1/files/view?fileId=store-1'],
    imageUrls: ['placeholder', '/api/v1/files/view?fileId=store-3'],
    coverImages: ['https://cdn.example.com/store-4.jpg', null],
  });

  assert.deepEqual(images, [
    new URL('/api/v1/files/view?fileId=store-1', API_BASE_URL).href,
    'https://cdn.example.com/store-2.jpg',
    new URL('/api/v1/files/view?fileId=store-3', API_BASE_URL).href,
    'https://cdn.example.com/store-4.jpg',
  ]);
});
