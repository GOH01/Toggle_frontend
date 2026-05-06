import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAggregateSearchKeywords,
  getSearchMode,
  normalizeSearchCategory,
  normalizeUiCategory,
  resolveDisplayCategory,
} from '../src/lib/placeCategories.js';

test('normalizeUiCategory keeps known top-level categories', () => {
  assert.equal(normalizeUiCategory({ category: '음식점 > 한식' }), '음식점');
  assert.equal(normalizeUiCategory({ category: '공공기관' }), '공공기관');
});

test('normalizeSearchCategory follows kakao search taxonomy before backend display values', () => {
  assert.equal(normalizeSearchCategory({ category_group_name: '카페', category_name: '음식점 > 카페,디저트' }), '카페');
  assert.equal(normalizeSearchCategory({ category_group_name: '음식점', category_name: '음식점 > 한식' }), '음식점');
});

test('normalizeUiCategory maps beauty and uncategorized places to 기타', () => {
  assert.equal(normalizeUiCategory({ category: '미용실' }), '기타');
  assert.equal(normalizeUiCategory({ category: '네일아트' }), '기타');
  assert.equal(normalizeUiCategory({ category: '알 수 없음' }), '기타');
});

test('resolveDisplayCategory preserves specific raw labels for 기타 items', () => {
  assert.equal(resolveDisplayCategory({ category: '미용실' }), '미용실');
});

test('getSearchMode uses aggregate mode for 전체 and keyword seeds for 기타', () => {
  assert.equal(getSearchMode('전체', ''), 'aggregate-all');
  assert.equal(getSearchMode('기타', ''), 'keyword-seed');
  assert.equal(getSearchMode('음식점', ''), 'single-category');
  assert.equal(getSearchMode('기타', '강남'), 'keyword');
});

test('aggregate-all search excludes 기타 seed keywords to avoid empty overall results', () => {
  assert.deepEqual(getAggregateSearchKeywords('전체'), []);
  assert.deepEqual(getAggregateSearchKeywords('기타'), [
    '미용실',
    '헤어샵',
    '네일샵',
    '피부관리',
    '뷰티샵',
    '마사지',
    '세탁소',
  ]);
});
