import { useEffect, useState } from 'react';
import { fetchStoresByIds, lookupStoresByExternalPlaceIds } from '../lib/stores';

export function useStoreLookupByExternalPlaceId(externalPlaceId) {
  const [storeMatch, setStoreMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const normalizedExternalPlaceId = String(externalPlaceId || '').trim();

    if (!normalizedExternalPlaceId) {
      setStoreMatch(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const run = async () => {
      try {
        const stores = await lookupStoresByExternalPlaceIds('KAKAO', [normalizedExternalPlaceId]);
        if (!cancelled && stores[0]) {
          setStoreMatch(stores[0]);
          return;
        }

        const numericStoreId = Number(normalizedExternalPlaceId);
        if (Number.isFinite(numericStoreId)) {
          const fallbackStores = await fetchStoresByIds([numericStoreId]);
          if (!cancelled) {
            setStoreMatch(fallbackStores[0] || null);
          }
        } else if (!cancelled) {
          setStoreMatch(null);
        }
      } catch {
        if (!cancelled) {
          setStoreMatch(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [externalPlaceId]);

  return {
    storeMatch,
    isLoading,
  };
}
