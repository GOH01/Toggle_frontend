import { useEffect, useRef } from 'react';
import { FAVORITES_REVISION_KEY } from '../lib/session';

export default function useFavoriteRefreshChannel(onRefresh) {
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const triggerRefresh = () => {
      onRefreshRef.current?.();
    };

    const handleFavoritesChanged = () => {
      triggerRefresh();
    };

    const handleStorage = (event) => {
      if (event.key === FAVORITES_REVISION_KEY) {
        triggerRefresh();
      }
    };

    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
}
