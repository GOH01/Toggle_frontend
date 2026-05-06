const KNOWN_TOP_LEVEL_CATEGORIES = [
  '음식점',
  '카페',
  '편의점',
  '대형마트',
  '약국',
  '병원',
  '공공기관',
  '문화시설',
  '학교',
  '지하철역',
  '주차장',
];

const OTHER_CATEGORY_HINTS = [
  '미용',
  '헤어',
  '네일',
  '뷰티',
  '피부',
  '메이크업',
  '마사지',
  '세탁',
  '수선',
  '사진관',
  '인쇄',
  '문구',
  '애견',
  '반려동물',
];

export const KAKAO_CATEGORY_MAP = {
  음식점: 'FD6',
  카페: 'CE7',
  편의점: 'CS2',
  대형마트: 'MT1',
  약국: 'PM9',
  병원: 'HP8',
  공공기관: 'PO3',
  문화시설: 'CT1',
  학교: 'SC4',
  지하철역: 'SW8',
  주차장: 'PK6',
};

export const OTHER_CATEGORY_KEYWORDS = [
  '미용실',
  '헤어샵',
  '네일샵',
  '피부관리',
  '뷰티샵',
  '마사지',
  '세탁소',
];

function compactTextValues(values) {
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function splitCategoryLeaf(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const normalized = text
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);

  return normalized[normalized.length - 1] || text;
}

function collectCategoryCandidates(placeLike) {
  return compactTextValues([
    placeLike?.searchCategory,
    placeLike?.normalizedCategory,
    placeLike?.category,
    placeLike?.categoryName,
    placeLike?.category_group_name,
    splitCategoryLeaf(placeLike?.category_name),
    placeLike?.rawCategoryName,
  ]);
}

export function normalizeSearchCategory(placeLike) {
  const searchFirstCandidates = compactTextValues([
    placeLike?.searchCategory,
    placeLike?.category_group_name,
    splitCategoryLeaf(placeLike?.category_name),
    placeLike?.category,
    placeLike?.categoryName,
    placeLike?.rawCategoryName,
  ]);

  for (const candidate of searchFirstCandidates) {
    const known = KNOWN_TOP_LEVEL_CATEGORIES.find((category) => candidate.includes(category));
    if (known) {
      return known;
    }
  }

  if (searchFirstCandidates.some((candidate) => OTHER_CATEGORY_HINTS.some((hint) => candidate.includes(hint)))) {
    return '기타';
  }

  return '기타';
}

export function resolveDisplayCategory(placeLike) {
  const candidates = collectCategoryCandidates(placeLike);
  const leafCandidate = candidates.find((value) => value && !KNOWN_TOP_LEVEL_CATEGORIES.includes(value));
  if (leafCandidate) {
    return splitCategoryLeaf(leafCandidate);
  }

  return candidates[0] || '기타';
}

export function normalizeUiCategory(placeLike) {
  return normalizeSearchCategory(placeLike);
}

export function matchesUiCategory(placeLike, activeCategory) {
  if (!activeCategory || activeCategory === '전체') {
    return true;
  }

  return normalizeUiCategory(placeLike) === activeCategory;
}

export function getSearchMode(category, keyword) {
  if (keyword && keyword.trim()) {
    return 'keyword';
  }

  if (category === '전체') {
    return 'aggregate-all';
  }

  if (category === '기타') {
    return 'keyword-seed';
  }

  return KAKAO_CATEGORY_MAP[category] ? 'single-category' : 'aggregate-all';
}

export function getAggregateCategoryCodes() {
  return Object.values(KAKAO_CATEGORY_MAP);
}

export function getAggregateSearchKeywords(category) {
  return category === '기타' ? OTHER_CATEGORY_KEYWORDS : [];
}

export function getOtherCategoryKeywords(category = '기타') {
  return getAggregateSearchKeywords(category);
}
