import test from 'node:test';
import assert from 'node:assert/strict';

import { collectStoreCoverImages } from '../src/lib/storeImages.js';

test('collectStoreCoverImages merges available store image sources', () => {
  const images = collectStoreCoverImages({
    ownerImages: ['/api/v1/files/view?fileId=store-1', ''],
    images: ['https://cdn.example.com/store-2.jpg', '/api/v1/files/view?fileId=store-1'],
    imageUrls: ['placeholder', '/api/v1/files/view?fileId=store-3'],
    coverImages: ['https://cdn.example.com/store-4.jpg', null],
  });

  assert.deepEqual(images, [
    'http://13.124.62.85/api/v1/files/view?fileId=store-1',
    'https://cdn.example.com/store-2.jpg',
    'http://13.124.62.85/api/v1/files/view?fileId=store-3',
    'https://cdn.example.com/store-4.jpg',
  ]);
});
