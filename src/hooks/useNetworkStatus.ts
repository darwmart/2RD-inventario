import { useState, useEffect } from 'react';
import { networkMonitor, type NetworkStatus, type NetworkState } from '@/offline/networkMonitor';

// ─── Hook de estado de red ────────────────────────────────────
export function useNetworkStatus() {
  const [state, setState] = useState<NetworkState>(networkMonitor.currentState);

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe((status: NetworkStatus) => {
      setState(networkMonitor.currentState);
      void status; // consumed via currentState
    });
    return unsubscribe;
  }, []);

  return {
    status:    state.status,
    isOnline:  state.status !== 'offline',
    isOffline: state.status === 'offline',
    isSlow:    state.status === 'slow',
    rtt:       state.rtt,
    downlink:  state.downlink,
    lastOnline:  state.lastOnline,
    lastOffline: state.lastOffline,
  };
}
