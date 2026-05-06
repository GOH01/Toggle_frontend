import { useSyncExternalStore } from 'react';
import { getCurrentUser, getCurrentUserRole, isLoggedIn } from '../lib/session';

let lastSnapshot = null;

function subscribe(callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const notify = () => callback();

  window.addEventListener('authChanged', notify);
  window.addEventListener('storage', notify);

  return () => {
    window.removeEventListener('authChanged', notify);
    window.removeEventListener('storage', notify);
  };
}

function getSnapshot() {
  const nextSnapshot = {
    isLoggedIn: isLoggedIn(),
    role: getCurrentUserRole(),
    user: getCurrentUser(),
  };

  if (
    lastSnapshot
    && lastSnapshot.isLoggedIn === nextSnapshot.isLoggedIn
    && lastSnapshot.role === nextSnapshot.role
    && JSON.stringify(lastSnapshot.user) === JSON.stringify(nextSnapshot.user)
  ) {
    return lastSnapshot;
  }

  lastSnapshot = nextSnapshot;
  return nextSnapshot;
}

function getServerSnapshot() {
  return {
    isLoggedIn: false,
    role: '',
    user: {},
  };
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
