import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAppStore } from '../stores/appStore';

// Start listening to network changes and update the store
let unsubscribe: (() => void) | null = null;

export const startNetworkMonitor = () => {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    useAppStore.getState().setIsOnline(state.isConnected ?? false);
  });
};

export const stopNetworkMonitor = () => {
  unsubscribe?.();
  unsubscribe = null;
};

// Fetch wrapper with exponential backoff retry
export const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelay?: number }
): Promise<T> => {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = delay * (0.5 + Math.random() * 0.5); // 50-100% of delay
        await new Promise((resolve) =>
          setTimeout(resolve, jitter)
        );
      }
    }
  }
  throw lastError;
};
