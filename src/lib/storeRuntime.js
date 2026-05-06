const DEFAULT_OPERATING_INFO = {
  openTime: '09:00',
  closeTime: '21:00',
  breakStart: '15:00',
  breakEnd: '17:00',
};

export function getStoreOperatingInfo(storeId) {
  if (!storeId || typeof window === 'undefined') {
    return DEFAULT_OPERATING_INFO;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(`storeOperatingInfo_${storeId}`) || '{}');
    return {
      openTime: parsed.openTime || DEFAULT_OPERATING_INFO.openTime,
      closeTime: parsed.closeTime || DEFAULT_OPERATING_INFO.closeTime,
      breakStart: parsed.breakStart || DEFAULT_OPERATING_INFO.breakStart,
      breakEnd: parsed.breakEnd || DEFAULT_OPERATING_INFO.breakEnd,
    };
  } catch {
    return DEFAULT_OPERATING_INFO;
  }
}

export function getStoreOperatingInfoByCandidates(candidateIds = []) {
  if (typeof window === 'undefined') {
    return DEFAULT_OPERATING_INFO;
  }

  for (const candidateId of candidateIds) {
    if (!candidateId) {
      continue;
    }

    const rawValue = localStorage.getItem(`storeOperatingInfo_${candidateId}`);
    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue);
        return {
          openTime: parsed.openTime || DEFAULT_OPERATING_INFO.openTime,
          closeTime: parsed.closeTime || DEFAULT_OPERATING_INFO.closeTime,
          breakStart: parsed.breakStart || DEFAULT_OPERATING_INFO.breakStart,
          breakEnd: parsed.breakEnd || DEFAULT_OPERATING_INFO.breakEnd,
        };
      } catch {
        return DEFAULT_OPERATING_INFO;
      }
    }
  }

  return DEFAULT_OPERATING_INFO;
}
