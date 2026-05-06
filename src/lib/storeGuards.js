import { STATUS_TYPES } from '../constants/status.js';

const STORE_UNREGISTERED_ALERT = '등록된 매장이 아닙니다';
const STORE_UNREGISTERED_FAVORITE_ALERT = '등록된 매장이 아니라 저장 할 수 없습니다';

export function isUnregisteredStorePlace(place) {
  return Boolean(place)
    && place.objType === 'STORE'
    && place.status === STATUS_TYPES.STORE.UNREGISTERED;
}

export function getUnregisteredStoreBlockMessage(action = 'default') {
  return action === 'favorite'
    ? STORE_UNREGISTERED_FAVORITE_ALERT
    : STORE_UNREGISTERED_ALERT;
}
