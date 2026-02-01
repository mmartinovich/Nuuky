import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockFrom = jest.fn();
const mockGetSession = jest.fn();
const mockStorageFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: { getSession: () => mockGetSession() },
    storage: { from: (...args: any[]) => mockStorageFrom(...args) },
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({ logger: { error: jest.fn() } }));

import { useProfile } from '../../hooks/useProfile';
import { useAppStore } from '../../stores/appStore';
import * as ImagePicker from 'expo-image-picker';

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue(resolved),
});

const mockUser = { id: 'u1', display_name: 'Test', phone: null, avatar_url: null };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAppStore.setState({ currentUser: mockUser as any });
});

describe('useProfile', () => {
  test('updateDisplayName succeeds', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const { result } = renderHook(() => useProfile());
    let ok = false;
    await act(async () => { ok = await result.current.updateDisplayName('New Name'); });
    expect(ok).toBe(true);
    expect(useAppStore.getState().currentUser?.display_name).toBe('New Name');
  });

  test('updateDisplayName rejects empty', async () => {
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.updateDisplayName('   '); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Invalid Name', expect.stringContaining('empty'));
  });

  test('updateDisplayName rejects >50 chars', async () => {
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.updateDisplayName('a'.repeat(51)); });
    expect(ok).toBe(false);
  });

  test('updateDisplayName requires login', async () => {
    useAppStore.setState({ currentUser: null });
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.updateDisplayName('Test'); });
    expect(ok).toBe(false);
  });

  test('updateDisplayName handles error', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.updateDisplayName('Test'); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update display name');
  });

  test('updatePhone succeeds', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const { result } = renderHook(() => useProfile());
    let ok = false;
    await act(async () => { ok = await result.current.updatePhone('+15551234567'); });
    expect(ok).toBe(true);
  });

  test('updatePhone requires login', async () => {
    useAppStore.setState({ currentUser: null });
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.updatePhone('+1'); });
    expect(ok).toBe(false);
  });

  test('deleteAvatar requires login', async () => {
    useAppStore.setState({ currentUser: null });
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.deleteAvatar(); });
    expect(ok).toBe(false);
  });

  test('deleteAvatar requires existing avatar', async () => {
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.deleteAvatar(); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('No Avatar', expect.any(String));
  });

  test('deleteAvatar succeeds', async () => {
    useAppStore.setState({ currentUser: { ...mockUser, avatar_url: 'https://example.com/storage/avatars/u1/pic.jpg' } as any });
    mockStorageFrom.mockReturnValue({ remove: jest.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const { result } = renderHook(() => useProfile());
    let ok = false;
    await act(async () => { ok = await result.current.deleteAvatar(); });
    expect(ok).toBe(true);
  });

  test('completeProfile succeeds', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const { result } = renderHook(() => useProfile());
    let ok = false;
    await act(async () => { ok = await result.current.completeProfile(); });
    expect(ok).toBe(true);
    expect(useAppStore.getState().currentUser?.profile_completed).toBe(true);
  });

  test('completeProfile requires login', async () => {
    useAppStore.setState({ currentUser: null });
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.completeProfile(); });
    expect(ok).toBe(false);
  });

  test('pickAndUploadAvatar requires login', async () => {
    useAppStore.setState({ currentUser: null });
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.pickAndUploadAvatar('gallery'); });
    expect(ok).toBe(false);
  });

  test('pickAndUploadAvatar handles permission denied', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.pickAndUploadAvatar('gallery'); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Permission Required', expect.any(String));
  });

  test('pickAndUploadAvatar handles cancel', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true });
    const { result } = renderHook(() => useProfile());
    let ok = true;
    await act(async () => { ok = await result.current.pickAndUploadAvatar('gallery'); });
    expect(ok).toBe(false);
  });
});
