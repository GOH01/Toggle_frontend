import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveStoreClosureUiState,
  resolveStoreMenuAccess,
} from '../src/lib/storeContracts.js';

test('resolveStoreMenuAccess respects canonical eligibility and closure state', () => {
  const access = resolveStoreMenuAccess({
    verified: true,
    categoryName: '음식점 > 한식',
    menuEligible: true,
    menuEditable: false,
    operationalState: 'CLOSURE_REQUESTED',
    closureRequestStatus: 'PENDING',
  });

  assert.equal(access.menuEligible, true);
  assert.equal(access.menuEditable, false);
  assert.equal(access.isClosureRequested, true);
  assert.equal(access.categorySupported, true);
  assert.equal(access.menuEligibilityReason, '운영 종료 요청이 접수되어 메뉴를 수정할 수 없습니다.');
});

test('resolveStoreMenuAccess blocks unregistered stores with consistent copy', () => {
  const access = resolveStoreMenuAccess({
    verified: false,
    categoryName: '음식점 > 한식',
  });

  assert.equal(access.menuEligible, false);
  assert.equal(access.menuEditable, false);
  assert.equal(access.menuEligibilityReason, '등록된 매장이 아닙니다');
});

test('resolveStoreClosureUiState marks pending requests as duplicate-blocked', () => {
  const closure = resolveStoreClosureUiState(
    {
      verified: true,
      storeName: '테스트 매장',
      closureRequestStatus: 'PENDING',
    },
    {
      requestId: 1,
      status: 'PENDING',
      reason: '운영 종료',
      createdAt: '2026-04-26T00:00:00Z',
    }
  );

  assert.equal(closure.requestStatus, 'PENDING');
  assert.equal(closure.requestMeta.label, '접수됨');
  assert.equal(closure.duplicateRequestBlocked, true);
  assert.equal(closure.canRequestClosure, false);
  assert.equal(closure.requestReason, '운영 종료');
});
