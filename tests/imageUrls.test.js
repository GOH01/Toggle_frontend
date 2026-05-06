import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBrowserImageUrl, resolveBrowserImageUrls } from '../src/lib/imageUrls.js';

test('resolveBrowserImageUrl expands backend-relative file view paths to the API origin', () => {
  assert.equal(
    resolveBrowserImageUrl('/api/v1/files/view?key=review%2F1.png'),
    'http://localhost:8080/api/v1/files/view?key=review%2F1.png'
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
      'http://localhost:8080/api/v1/files/view?key=store%2F1.png',
      'https://cdn.example.com/store/2.png',
    ]
  );
});
