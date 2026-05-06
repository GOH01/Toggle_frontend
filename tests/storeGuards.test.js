import test from 'node:test';
import assert from 'node:assert/strict';

import { STATUS_TYPES } from '../src/constants/status.js';
import {
  getUnregisteredStoreBlockMessage,
  isUnregisteredStorePlace,
} from '../src/lib/storeGuards.js';

test('isUnregisteredStorePlace only blocks store previews marked UNREGISTERED', () => {
  assert.equal(
    isUnregisteredStorePlace({ objType: 'STORE', status: STATUS_TYPES.STORE.UNREGISTERED }),
    true,
  );
  assert.equal(
    isUnregisteredStorePlace({ objType: 'STORE', status: STATUS_TYPES.STORE.OPEN }),
    false,
  );
  assert.equal(
    isUnregisteredStorePlace({ objType: 'PUBLIC', status: STATUS_TYPES.STORE.UNREGISTERED }),
    false,
  );
});

test('getUnregisteredStoreBlockMessage returns the requested copy', () => {
  assert.equal(getUnregisteredStoreBlockMessage('favorite'), '등록된 매장이 아니라 저장 할 수 없습니다');
  assert.equal(getUnregisteredStoreBlockMessage(), '등록된 매장이 아닙니다');
  assert.equal(getUnregisteredStoreBlockMessage('myMap'), '등록된 매장이 아닙니다');
});
