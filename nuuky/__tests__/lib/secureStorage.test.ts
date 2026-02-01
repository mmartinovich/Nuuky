import { encryptedStorage } from '../../lib/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('encryptedStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getItem delegates to AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-value');
    const result = await encryptedStorage.getItem('key');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('key');
    expect(result).toBe('test-value');
  });

  test('getItem returns null when not found', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await encryptedStorage.getItem('missing');
    expect(result).toBeNull();
  });

  test('setItem delegates to AsyncStorage', async () => {
    await encryptedStorage.setItem('key', 'value');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', 'value');
  });

  test('removeItem delegates to AsyncStorage', async () => {
    await encryptedStorage.removeItem('key');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key');
  });
});
