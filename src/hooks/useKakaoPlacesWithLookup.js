import { useEffect, useState } from 'react';
import { fetchNearbyVerifiedStores, lookupStoresByExternalPlaceIds } from '../lib/stores';
import { lookupPublicInstitutions } from '../lib/publicInstitutions';
import { createMergedPreviewPlace } from '../lib/mappers';
import {
  getAggregateCategoryCodes,
  getAggregateSearchKeywords,
  getSearchMode,
  KAKAO_CATEGORY_MAP,
  matchesUiCategory,
  normalizeUiCategory,
} from '../lib/placeCategories';

const KAKAO_MAX_PAGE_SIZE = 15;

function dedupePlaces(items) {
  const seen = new Map();

  items.forEach((item) => {
    const key = item?.id || `${item?.place_name}-${item?.x}-${item?.y}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  });

  return [...seen.values()];
}

function sortPlacesByDistance(items) {
  return [...items].sort((a, b) => Number(a.distance || Number.MAX_SAFE_INTEGER) - Number(b.distance || Number.MAX_SAFE_INTEGER));
}

function mergePageResults(items, targetSize) {
  return sortPlacesByDistance(dedupePlaces(items)).slice(0, targetSize);
}

function runCategorySearch(placesService, categoryCode, searchOptions) {
  return new Promise((resolve) => {
    placesService.categorySearch(categoryCode, (data, status, pagination) => {
      if (status === window.kakao.maps.services.Status.OK && data) {
        resolve({ data, pagination });
        return;
      }

      resolve({ data: [], pagination: null });
    }, searchOptions);
  });
}

function runKeywordSearch(placesService, query, searchOptions) {
  return new Promise((resolve) => {
    placesService.keywordSearch(query, (data, status, pagination) => {
      if (status === window.kakao.maps.services.Status.OK && data) {
        resolve({ data, pagination });
        return;
      }

      resolve({ data: [], pagination: null });
    }, searchOptions);
  });
}

async function fetchPagedSearchResults(searchPageFn, targetSize) {
  const normalizedTargetSize = Math.max(1, Number(targetSize || KAKAO_MAX_PAGE_SIZE));
  const pageSize = Math.min(normalizedTargetSize, KAKAO_MAX_PAGE_SIZE);
  const maxPages = Math.min(Math.ceil(normalizedTargetSize / pageSize), 45);
  const collected = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, pagination } = await searchPageFn({ page, size: pageSize });
    collected.push(...data);

    if (collected.length >= normalizedTargetSize) {
      break;
    }

    if (!pagination?.hasNextPage || data.length < pageSize) {
      break;
    }
  }

  return mergePageResults(collected, normalizedTargetSize);
}

/**
 * 카카오 플레이스 검색 결과를 가져오고, 바로 Toggle Backend의 lookup API를 통해
 * 라이브 영업 상태(liveBusinessStatus) 또는 공공기관 혼잡도 정보를 병합하여 리스트로 반환하는 훅입니다.
 */
export function useKakaoPlacesWithLookup(center, keyword, category, options = { radius: 2000, size: 15 }, refreshToken = 0) {
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const centerLat = center?.lat;
  const centerLng = center?.lng;

  useEffect(() => {
    // init check
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services || centerLat == null || centerLng == null) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const ps = new window.kakao.maps.services.Places();
    const targetSize = Math.max(1, Number(options.size || KAKAO_MAX_PAGE_SIZE));
    const baseSearchOptions = {
      location: new window.kakao.maps.LatLng(centerLat, centerLng),
      sort: window.kakao.maps.services.SortBy.DISTANCE,
      radius: options.radius,
      size: Math.min(targetSize, KAKAO_MAX_PAGE_SIZE),
    };

    const fetchPlaces = async () => {
      let rawPlaces = [];

      try {
        const searchMode = getSearchMode(category, keyword);
        const categoryCode = KAKAO_CATEGORY_MAP[category];

        if (!keyword?.trim() && category === '전체') {
          const nearbyStores = await fetchNearbyVerifiedStores({
            latitude: centerLat,
            longitude: centerLng,
            radiusMeters: options.radius,
            limit: targetSize,
          });

          if (cancelled) return;

          setPlaces(nearbyStores.map((store) => createMergedPreviewPlace({
            id: store.externalPlaceId,
            place_name: store.name,
            category_group_name: store.categoryName,
            category_name: store.categoryName,
            road_address_name: store.roadAddress || store.address,
            address_name: store.address,
            phone: store.phone,
            y: String(store.latitude),
            x: String(store.longitude),
            distance: 0,
          }, store, null, false)));
          return;
        }

        if (searchMode === 'keyword') {
          const keywordOptions = categoryCode
            ? { ...baseSearchOptions, category_group_code: categoryCode }
            : baseSearchOptions;
          rawPlaces = await fetchPagedSearchResults(
            ({ page, size }) => runKeywordSearch(ps, keyword.trim(), { ...keywordOptions, page, size }),
            targetSize
          );
        } else if (searchMode === 'single-category' && categoryCode) {
          rawPlaces = await fetchPagedSearchResults(
            ({ page, size }) => runCategorySearch(ps, categoryCode, { ...baseSearchOptions, page, size }),
            targetSize
          );
        } else if (searchMode === 'keyword-seed') {
          const keywordResults = await Promise.all(
            getAggregateSearchKeywords('기타').map((seed) =>
              fetchPagedSearchResults(
                ({ page, size }) => runKeywordSearch(ps, seed, { ...baseSearchOptions, page, size }),
                targetSize
              )
            )
          );
          rawPlaces = dedupePlaces(keywordResults.flat());
        } else {
          const categoryResults = await Promise.all(
            getAggregateCategoryCodes().map((code) => runCategorySearch(ps, code, baseSearchOptions).then(({ data }) => data))
          );
          rawPlaces = dedupePlaces(categoryResults.flat());
        }

        if (cancelled) return;

        if (!rawPlaces.length) {
          setPlaces([]);
          return;
        }

        const publicCandidates = rawPlaces.filter((item) => normalizeUiCategory(item) === '공공기관');
        const storeCandidates = rawPlaces.filter((item) => normalizeUiCategory(item) !== '공공기관');

        const publicRequestItems = publicCandidates.map((item) => ({
          externalPlaceId: item.id,
          name: item.place_name,
          address: item.road_address_name || item.address_name,
          latitude: Number(item.y),
          longitude: Number(item.x),
        }));

        const [matchedStores, matchedPublics] = await Promise.all([
          storeCandidates.length
            ? lookupStoresByExternalPlaceIds('KAKAO', storeCandidates.map((item) => item.id))
            : Promise.resolve([]),
          publicRequestItems.length
            ? lookupPublicInstitutions('KAKAO', publicRequestItems)
            : Promise.resolve([]),
        ]);

        if (cancelled) return;

        const mergedPlaces = rawPlaces.map((kakaoItem) => {
          const storeMatch = matchedStores.find((store) => store.externalPlaceId === kakaoItem.id);
          const publicMatch = matchedPublics.find((institution) => institution.externalPlaceId === kakaoItem.id);

          return createMergedPreviewPlace(kakaoItem, storeMatch, publicMatch, false);
        });

        const finalFiltered = mergePageResults(
          mergedPlaces.filter((place) => matchesUiCategory(place, category)),
          targetSize
        );

        setPlaces(finalFiltered);
      } catch (error) {
        console.error('Lookup failed:', error);
        if (!cancelled) {
          setPlaces([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPlaces();

    return () => {
      cancelled = true;
    };
  }, [centerLat, centerLng, keyword, category, options.radius, options.size, refreshToken]);

  return { places, isLoading };
}
