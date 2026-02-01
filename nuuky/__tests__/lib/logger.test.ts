describe('logger', () => {
  const originalDEV = (global as any).__DEV__;
  const originalConsole = { ...console };

  afterEach(() => {
    (global as any).__DEV__ = originalDEV;
    jest.resetModules();
  });

  test('log calls console.log in dev mode', () => {
    (global as any).__DEV__ = true;
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();

    const { logger } = require('../../lib/logger');
    logger.log('test message');

    expect(spy).toHaveBeenCalledWith('test message');
    spy.mockRestore();
  });

  test('warn calls console.warn in dev mode', () => {
    (global as any).__DEV__ = true;
    jest.resetModules();
    const spy = jest.spyOn(console, 'warn').mockImplementation();

    const { logger } = require('../../lib/logger');
    logger.warn('warning');

    expect(spy).toHaveBeenCalledWith('warning');
    spy.mockRestore();
  });

  test('error always calls console.error', () => {
    (global as any).__DEV__ = false;
    jest.resetModules();
    const spy = jest.spyOn(console, 'error').mockImplementation();

    const { logger } = require('../../lib/logger');
    logger.error('error message');

    expect(spy).toHaveBeenCalledWith('error message');
    spy.mockRestore();
  });

  test('debug includes [DEBUG] prefix', () => {
    (global as any).__DEV__ = true;
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();

    const { logger } = require('../../lib/logger');
    logger.debug('debug info');

    expect(spy).toHaveBeenCalledWith('[DEBUG]', 'debug info');
    spy.mockRestore();
  });
});
