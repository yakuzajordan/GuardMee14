import { useEffect } from 'react';
import { incidentAPI } from '../services/api';
import { getOfflineIncidents, clearOfflineIncidents } from '../utils/constants';

export function useOfflineSync() {
  useEffect(() => {
    const sync = async () => {
      const queue = getOfflineIncidents();
      if (!queue.length || !navigator.onLine) return;
      const token = localStorage.getItem('guardmee_token');
      if (!token) return;
      try {
        await incidentAPI.sync(queue);
        clearOfflineIncidents();
      } catch {
        // retry on next online event
      }
    };

    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, []);
}
