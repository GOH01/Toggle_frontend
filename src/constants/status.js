export const STATUS_TYPES = {
  STORE: {
    OPEN: 'OPEN',
    BREAK_TIME: 'BREAK_TIME',
    CLOSED: 'CLOSED',
    TEMP_CLOSED: 'TEMP_CLOSED',
    EARLY_CLOSED: 'EARLY_CLOSED',
    LOOKUP_PENDING: 'LOOKUP_PENDING',
    UNREGISTERED: 'UNREGISTERED',
  },
  CONGESTION: {
    RELAXED: 'RELAXED',
    NORMAL: 'NORMAL',
    BUSY: 'BUSY',
    VERY_BUSY: 'VERY_BUSY',
  }
};

export const STATUS_UI = {
  STORE: {
    [STATUS_TYPES.STORE.OPEN]: { label: '영업중', colorVar: 'var(--color-status-green)' },
    [STATUS_TYPES.STORE.BREAK_TIME]: { label: '브레이크타임', colorVar: 'var(--color-status-yellow)' },
    [STATUS_TYPES.STORE.CLOSED]: { label: '영업종료', colorVar: 'var(--color-status-gray)' },
    [STATUS_TYPES.STORE.TEMP_CLOSED]: { label: '임시휴무', colorVar: 'var(--color-status-red)' },
    [STATUS_TYPES.STORE.EARLY_CLOSED]: { label: '조기마감', colorVar: 'var(--color-status-orange)' },
    [STATUS_TYPES.STORE.LOOKUP_PENDING]: { label: '상태 확인 중', colorVar: 'var(--color-status-yellow)' },
    [STATUS_TYPES.STORE.UNREGISTERED]: { label: '상태 정보 없음', colorVar: 'var(--color-status-gray)' },
  },
  CONGESTION: {
    [STATUS_TYPES.CONGESTION.RELAXED]: { label: '여유', colorVar: 'var(--color-status-green)' },
    [STATUS_TYPES.CONGESTION.NORMAL]: { label: '보통', colorVar: 'var(--color-status-yellow)' },
    [STATUS_TYPES.CONGESTION.BUSY]: { label: '혼잡', colorVar: 'var(--color-status-orange)' },
    [STATUS_TYPES.CONGESTION.VERY_BUSY]: { label: '매우 혼잡', colorVar: 'var(--color-status-red)' },
  }
};

export const CATEGORIES = {
  STORE: ['음식점', '카페', '편의점', '대형마트', '약국', '병원', '기타'],
  PUBLIC: ['공공기관', '문화시설', '학교', '지하철역', '주차장', '기타']
};

export function normalizeStoreStatus(status) {
  switch (status) {
    case 'BREAK':
      return STATUS_TYPES.STORE.BREAK_TIME;
    case 'EARLY_CLOSE':
      return STATUS_TYPES.STORE.EARLY_CLOSED;
    case 'PREPARING':
      return STATUS_TYPES.STORE.CLOSED;
    default:
      return status;
  }
}
