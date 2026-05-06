import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeReviewSort,
  buildStoreReviewQueryParams,
  mapStoreReviewSummary,
  mapStoreReviewPageResponse,
} from '../src/lib/reviews.js';

test('normalizeReviewSort defaults to latest', () => {
  assert.equal(normalizeReviewSort(), 'latest');
  assert.equal(normalizeReviewSort(''), 'latest');
  assert.equal(normalizeReviewSort(null), 'latest');
});

test('normalizeReviewSort accepts only supported values', () => {
  assert.equal(normalizeReviewSort('latest'), 'latest');
  assert.equal(normalizeReviewSort('rating_desc'), 'rating_desc');
  assert.throws(() => normalizeReviewSort('oldest'));
});

test('buildStoreReviewQueryParams normalizes paging and sort', () => {
  const params = buildStoreReviewQueryParams({ sort: 'rating_desc', page: 2, size: 15 });

  assert.equal(params.toString(), 'sort=rating_desc&page=2&size=15');
});

test('mapStoreReviewSummary keeps backend summary fields intact', () => {
  assert.deepEqual(
    mapStoreReviewSummary({ averageRating: 4.6, reviewCount: 12 }),
    { averageRating: 4.6, reviewCount: 12 }
  );
});

test('mapStoreReviewPageResponse normalizes optional fields', () => {
  const response = mapStoreReviewPageResponse({
    content: [{ reviewId: 1, rating: 5 }],
    page: 1,
    size: 10,
    totalElements: 1,
    totalPages: 1,
    summary: { averageRating: 4.8, reviewCount: 1 },
  });

  assert.deepEqual(response.content, [{
    reviewId: 1,
    storeId: undefined,
    userId: undefined,
    displayName: '사용자',
    rating: 5,
    content: '',
    imageUrls: [],
    createdAt: null,
    updatedAt: null,
  }]);
  assert.equal(response.page, 1);
  assert.equal(response.size, 10);
  assert.equal(response.totalElements, 1);
  assert.equal(response.totalPages, 1);
  assert.deepEqual(response.summary, { averageRating: 4.8, reviewCount: 1 });
});

test('mapStoreReviewPageResponse preserves review image urls', () => {
  const response = mapStoreReviewPageResponse({
    content: [{
      reviewId: 2,
      rating: 4,
      imageUrls: ['https://cdn.example.com/review/1.png', null, ''],
    }],
  });

  assert.deepEqual(response.content[0].imageUrls, ['https://cdn.example.com/review/1.png']);
});
