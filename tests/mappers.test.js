import test from 'node:test';
import assert from 'node:assert/strict';

import { STATUS_TYPES } from '../src/constants/status.js';
import { API_BASE_URL } from '../src/lib/api.js';
import { mapStoreToPlace } from '../src/lib/mappers.js';

test('mapStoreToPlace preserves canonical menu and closure fields', () => {
  const mapped = mapStoreToPlace({
    storeId: 10,
    externalPlaceId: 'abc-123',
    name: '테스트 카페',
    categoryName: '카페 > 디저트',
    verified: true,
    menuEligible: true,
    menuEditable: false,
    menuEligibilityReason: '운영 종료 요청이 접수되어 메뉴를 수정할 수 없습니다.',
    menuCategorySupported: true,
    operationalState: 'CLOSURE_REQUESTED',
    closureRequestStatus: 'PENDING',
    liveBusinessStatus: 'OPEN',
    deletedAt: null,
    imageUrls: ['/api/v1/files/view?fileId=store-1', 'https://cdn.example.com/store-2.png', 'placeholder'],
  });

  assert.equal(mapped.id, 'abc-123');
  assert.equal(mapped.internalStoreId, 10);
  assert.equal(mapped.status, STATUS_TYPES.STORE.OPEN);
  assert.equal(mapped.menuEligible, true);
  assert.equal(mapped.menuEditable, false);
  assert.equal(mapped.operationalState, 'CLOSURE_REQUESTED');
  assert.equal(mapped.closureRequestStatus, 'PENDING');
  assert.deepEqual(mapped.imageUrls, [
    new URL('/api/v1/files/view?fileId=store-1', API_BASE_URL).href,
    'https://cdn.example.com/store-2.png',
  ]);
  assert.deepEqual(mapped.images, mapped.imageUrls);
  assert.deepEqual(mapped.ownerImages, mapped.imageUrls);
});

test('mapStoreToPlace marks deleted stores as closed for display', () => {
  const mapped = mapStoreToPlace({
    storeId: 11,
    name: '종료 매장',
    categoryName: '음식점 > 한식',
    verified: true,
    deletedAt: '2026-04-26T00:00:00Z',
  });

  assert.equal(mapped.status, STATUS_TYPES.STORE.CLOSED);
  assert.equal(mapped.menuEligible, false);
  assert.equal(mapped.menuEditable, false);
});
