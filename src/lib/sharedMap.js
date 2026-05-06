export function normalizeSharedMapSummary(record = {}) {
  return {
    ...record,
    publicMapUuid: record.publicMapUuid ?? '',
    nickname: record.nickname ?? '',
    title: record.title ?? '',
    description: record.description ?? '',
    savedPlaceCount: Number(record.savedPlaceCount ?? 0),
    profileImageUrl: record.profileImageUrl ?? '',
  };
}

export function normalizeSharedMapSearchResults(payload) {
  const rawResults = Array.isArray(payload)
    ? payload
    : payload?.content || payload?.items || payload?.results || [];

  return rawResults
    .map((item) => normalizeSharedMapSummary(item))
    .filter((item) => item.publicMapUuid);
}
