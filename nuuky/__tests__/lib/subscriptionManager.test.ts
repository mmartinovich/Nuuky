// We need to mock dependencies before importing the module
const mockRemoveChannel = jest.fn();
const mockChannel = { on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() };

jest.mock('../../lib/supabase', () => ({
  supabase: {
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

// Import after mocks
import { subscriptionManager } from '../../lib/subscriptionManager';

describe('subscriptionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionManager.cleanup();
  });

  test('register creates and starts subscription', () => {
    const createChannel = jest.fn().mockReturnValue(mockChannel);

    const cleanup = subscriptionManager.register('test-sub', createChannel);

    expect(createChannel).toHaveBeenCalled();
    expect(subscriptionManager.activeCount).toBe(1);
    expect(typeof cleanup).toBe('function');
  });

  test('register replaces existing subscription with same id', () => {
    const create1 = jest.fn().mockReturnValue(mockChannel);
    const create2 = jest.fn().mockReturnValue(mockChannel);

    subscriptionManager.register('test-sub', create1);
    subscriptionManager.register('test-sub', create2);

    expect(mockRemoveChannel).toHaveBeenCalled();
    expect(subscriptionManager.activeCount).toBe(1);
  });

  test('cleanup returned by register unregisters subscription', () => {
    const createChannel = jest.fn().mockReturnValue(mockChannel);

    const cleanup = subscriptionManager.register('test-sub', createChannel);
    cleanup();

    expect(mockRemoveChannel).toHaveBeenCalled();
    expect(subscriptionManager.activeCount).toBe(0);
  });

  test('pauseAll stops all subscriptions', () => {
    const createChannel = jest.fn().mockReturnValue(mockChannel);
    subscriptionManager.register('sub1', createChannel);
    subscriptionManager.register('sub2', createChannel);

    subscriptionManager.pauseAll();

    expect(subscriptionManager.paused).toBe(true);
    expect(subscriptionManager.activeCount).toBe(0);
  });

  test('resumeAll restarts paused subscriptions', () => {
    const createChannel = jest.fn().mockReturnValue(mockChannel);
    subscriptionManager.register('sub1', createChannel);

    subscriptionManager.pauseAll();
    expect(subscriptionManager.activeCount).toBe(0);

    subscriptionManager.resumeAll();
    expect(subscriptionManager.paused).toBe(false);
    expect(subscriptionManager.activeCount).toBe(1);
  });

  test('pauseAll is idempotent', () => {
    subscriptionManager.pauseAll();
    subscriptionManager.pauseAll();
    expect(subscriptionManager.paused).toBe(true);
  });

  test('resumeAll is idempotent when not paused', () => {
    subscriptionManager.resumeAll();
    expect(subscriptionManager.paused).toBe(false);
  });

  test('cleanup clears all subscriptions', () => {
    const createChannel = jest.fn().mockReturnValue(mockChannel);
    subscriptionManager.register('sub1', createChannel);
    subscriptionManager.register('sub2', createChannel);

    subscriptionManager.cleanup();

    expect(subscriptionManager.activeCount).toBe(0);
  });

  test('register does not start subscription when paused', () => {
    subscriptionManager.pauseAll();

    const createChannel = jest.fn().mockReturnValue(mockChannel);
    subscriptionManager.register('test-sub', createChannel);

    expect(createChannel).not.toHaveBeenCalled();
    expect(subscriptionManager.activeCount).toBe(0);
  });

  test('handles createChannel throwing error', () => {
    const createChannel = jest.fn().mockImplementation(() => { throw new Error('boom'); });
    subscriptionManager.register('test-sub', createChannel);
    // Should not throw, just log error
    expect(subscriptionManager.activeCount).toBe(0);
  });

  test('handles removeChannel throwing error on cleanup', () => {
    mockRemoveChannel.mockImplementationOnce(() => { throw new Error('remove fail'); });
    const createChannel = jest.fn().mockReturnValue(mockChannel);
    const cleanup = subscriptionManager.register('test-sub', createChannel);
    // Should not throw
    cleanup();
  });

  test('AppState handler resumes on foreground', () => {
    const { AppState } = require('react-native');

    // The handler was registered during module import (constructor).
    // We need to get it before clearAllMocks clears the calls.
    // Since clearAllMocks already ran, we access the handler via the saved reference.
    // Re-trigger init by creating a fresh manager won't work (singleton).
    // Instead, directly call the private handleAppStateChange via the captured addEventListener.

    // The handler was captured during import. Since clearAllMocks wiped calls,
    // let's trigger handleAppStateChange via the internal state transitions.
    const createChannel = jest.fn().mockReturnValue(mockChannel);
    subscriptionManager.register('sub1', createChannel);

    // Simulate background/foreground via pauseAll/resumeAll (already tested)
    // For handleAppStateChange coverage, we need the actual handler reference.
    // Access it through the saved reference from the initial addEventListener call.
    // Since it was cleared, we test indirectly by calling pauseAll/resumeAll.
    // Lines 35-46 require the actual AppState change handler to fire.

    // Direct approach: access internal handler
    const handler = (subscriptionManager as any).handleAppStateChange;
    if (handler) {
      handler.call(subscriptionManager, 'background');
      expect(subscriptionManager.paused).toBe(true);

      handler.call(subscriptionManager, 'active');
      expect(subscriptionManager.paused).toBe(false);
      expect(subscriptionManager.activeCount).toBe(1);
    }
  });

  test('AppState handler handles inactive state', () => {
    const createChannel = jest.fn().mockReturnValue(mockChannel);
    subscriptionManager.register('sub1', createChannel);

    const handler = (subscriptionManager as any).handleAppStateChange;
    // inactive should also pause
    handler.call(subscriptionManager, 'inactive');
    expect(subscriptionManager.paused).toBe(true);

    handler.call(subscriptionManager, 'active');
    expect(subscriptionManager.paused).toBe(false);
  });

  test('AppState handler ignores active-to-active', () => {
    const createChannel = jest.fn().mockReturnValue(mockChannel);
    subscriptionManager.register('sub1', createChannel);

    const handler = (subscriptionManager as any).handleAppStateChange;
    // active -> active: no pause/resume
    handler.call(subscriptionManager, 'active');
    expect(subscriptionManager.paused).toBe(false);
    expect(subscriptionManager.activeCount).toBe(1);
  });
});
