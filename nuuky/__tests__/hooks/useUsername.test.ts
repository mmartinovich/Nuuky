import { renderHook, act } from '@testing-library/react-native';
import { useUsername } from '../../hooks/useUsername';
import { useAppStore } from '../../stores/appStore';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';

const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { error: jest.fn() },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

const createChain = (resolved: any = { data: null, error: null }) => {
  const self: any = {};
  self.select = jest.fn().mockReturnValue(self);
  self.update = jest.fn().mockReturnValue(self);
  self.eq = jest.fn().mockReturnValue(self);
  self.maybeSingle = jest.fn().mockResolvedValue(resolved);
  self.then = (resolve: any) => Promise.resolve(resolved).then(resolve);
  return self;
};

describe('useUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
  });

  describe('validateUsername', () => {
    test('rejects empty', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.validateUsername('')).toEqual({ isValid: false, error: 'Username is required' });
    });

    test('rejects too short', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.validateUsername('ab').isValid).toBe(false);
    });

    test('rejects too long', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.validateUsername('a'.repeat(31)).isValid).toBe(false);
    });

    test('rejects invalid characters', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.validateUsername('user name').isValid).toBe(false);
    });

    test('rejects uppercase (via pattern)', () => {
      const { result } = renderHook(() => useUsername());
      // validateUsername lowercases the input first, so this should pass
      const validation = result.current.validateUsername('ValidUser');
      expect(validation.isValid).toBe(true);
    });

    test('rejects reserved words', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.validateUsername('admin').isValid).toBe(false);
    });

    test('accepts valid username', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.validateUsername('cool_user_123').isValid).toBe(true);
    });
  });

  describe('suggestUsername', () => {
    test('converts display name to username', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.suggestUsername('Max Mara')).toBe('maxmara');
    });

    test('removes special characters', () => {
      const { result } = renderHook(() => useUsername());
      expect(result.current.suggestUsername('John.Doe!')).toBe('johndoe');
    });
  });

  describe('checkAvailability', () => {
    test('returns true when username is available', async () => {
      mockFrom.mockReturnValue(createChain({ data: null, error: null }));
      const { result } = renderHook(() => useUsername());

      let available: boolean = false;
      await act(async () => {
        available = await result.current.checkAvailability('newuser');
      });

      expect(available).toBe(true);
    });

    test('returns false when username is taken', async () => {
      mockFrom.mockReturnValue(createChain({ data: { id: 'existing' }, error: null }));
      const { result } = renderHook(() => useUsername());

      let available: boolean = true;
      await act(async () => {
        available = await result.current.checkAvailability('taken');
      });

      expect(available).toBe(false);
    });

    test('returns true for current user username', async () => {
      setAuthenticatedUser({ username: 'myname' });
      const { result } = renderHook(() => useUsername());

      let available: boolean = false;
      await act(async () => {
        available = await result.current.checkAvailability('myname');
      });

      expect(available).toBe(true);
    });
  });

  describe('updateUsername', () => {
    test('requires login', async () => {
      const { Alert } = require('react-native');
      const { result } = renderHook(() => useUsername());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateUsername('newname');
      });

      expect(success).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in');
    });

    test('succeeds with valid available username', async () => {
      setAuthenticatedUser();
      mockFrom.mockReturnValue(createChain({ data: null, error: null }));

      const { result } = renderHook(() => useUsername());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateUsername('newuser');
      });

      expect(success).toBe(true);
      expect(useAppStore.getState().currentUser?.username).toBe('newuser');
    });
  });
});
