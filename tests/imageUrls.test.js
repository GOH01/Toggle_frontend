import test from 'node:test';
import assert from 'node:assert/strict';

import { API_BASE_URL } from '../src/lib/api.js';
import { resolveBrowserImageUrl, resolveBrowserImageUrls } from '../src/lib/imageUrls.js';

test('resolveBrowserImageUrl expands backend-relative file view paths to the API origin', () => {
  assert.equal(
    resolveBrowserImageUrl('/api/v1/files/view?key=review%2F1.png'),
    new URL('/api/v1/files/view?key=review%2F1.png', API_BASE_URL).href
  );
});

test('resolveBrowserImageUrls filters blank values and keeps absolute URLs intact', () => {
  assert.deepEqual(
    resolveBrowserImageUrls([
      '  ',
      null,
      '/api/v1/files/view?key=store%2F1.png',
      'https://cdn.example.com/store/2.png',
    ]),
    [
      new URL('/api/v1/files/view?key=store%2F1.png', API_BASE_URL).href,
      'https://cdn.example.com/store/2.png',
    ]
  );
});
