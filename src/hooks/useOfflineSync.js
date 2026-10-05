import { useEffect } from 'react';
import { incidentAPI } from '../services/api';
import { getOfflineIncidents, clearOfflineIncidents } from '../utils/constants';

// Firestore has built-in offline support. This hook just syncs any incidents
// that were queued while the user was offline before Firebase was available.
export function useOfflineSync() {
  useEffect(() => {
    const sync = async () => {
      const queue = getOfflineIncidents();
      if (!queue.length || !navigator.onLine) return;
      const uid = localStorage.getItem('guardmee_uid');
      if (!uid) return;
      try {
        await incidentAPI.sync(queue);
        clearOfflineIncidents();
      } catch {
        // will retry on next online event
      }
    };

    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, []);
}
