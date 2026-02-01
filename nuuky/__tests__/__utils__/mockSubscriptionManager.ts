export const createMockSubscriptionManager = () => ({
  register: jest.fn().mockReturnValue(jest.fn()),
  unregister: jest.fn(),
  pauseAll: jest.fn(),
  resumeAll: jest.fn(),
  cleanup: jest.fn(),
  get paused() { return false; },
  get activeCount() { return 0; },
});
