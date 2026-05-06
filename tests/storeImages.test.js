import test from 'node:test';
import assert from 'node:assert/strict';

import { collectStoreCoverImages } from '../src/lib/storeImages.js';

test('collectStoreCoverImages merges available store image sources', () => {
  const images = collectStoreCoverImages({
    ownerImages: ['https://cdn.example.com/store-1.jpg', ''],
    images: ['https://cdn.example.com/store-1.jpg', 'https://cdn.example.com/store-2.jpg'],
    imageUrls: ['https://cdn.example.com/store-3.jpg'],
    coverImages: ['https://cdn.example.com/store-4.jpg', null],
  });

  assert.deepEqual(images, [
    'https://cdn.example.com/store-1.jpg',
    'https://cdn.example.com/store-2.jpg',
    'https://cdn.example.com/store-3.jpg',
    'https://cdn.example.com/store-4.jpg',
  ]);
});
