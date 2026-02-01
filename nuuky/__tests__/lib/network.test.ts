import { startNetworkMonitor, stopNetworkMonitor, fetchWithRetry } from '../../lib/network';
import { useAppStore } from '../../stores/appStore';
import { resetStore } from '../__utils__/mockStore';

const mockAddEventListener = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (...args: any[]) => {
    mockAddEventListener(...args);
    return mockUnsubscribe;
  },
}));

describe('network', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    stopNetworkMonitor(); // Ensure clean state
  });

  describe('startNetworkMonitor', () => {
    test('subscribes to network changes', () => {
      startNetworkMonitor();
      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });

    test('does not subscribe twice', () => {
      startNetworkMonitor();
      startNetworkMonitor();
      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });

    test('updates store on network change', () => {
      startNetworkMonitor();

      const callback = mockAddEventListener.mock.calls[0][0];
      callback({ isConnected: false });

      expect(useAppStore.getState().isOnline).toBe(false);

      callback({ isConnected: true });
      expect(useAppStore.getState().isOnline).toBe(true);
    });

    test('handles null isConnected', () => {
      startNetworkMonitor();
      const callback = mockAddEventListener.mock.calls[0][0];
      callback({ isConnected: null });
      expect(useAppStore.getState().isOnline).toBe(false);
    });
  });

  describe('stopNetworkMonitor', () => {
    test('unsubscribes from network changes', () => {
      startNetworkMonitor();
      stopNetworkMonitor();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    test('is safe to call when not monitoring', () => {
      expect(() => stopNetworkMonitor()).not.toThrow();
    });
  });

  describe('fetchWithRetry', () => {
    test('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('data');

      const result = await fetchWithRetry(fn);

      expect(result).toBe('data');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('data');

      const result = await fetchWithRetry(fn, { maxRetries: 3, baseDelay: 1 });

      expect(result).toBe('data');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('throws after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(fetchWithRetry(fn, { maxRetries: 2, baseDelay: 1 })).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('uses default retry options', async () => {
      const fn = jest.fn().mockResolvedValue('ok');

      const result = await fetchWithRetry(fn);

      expect(result).toBe('ok');
    });
  });
});
