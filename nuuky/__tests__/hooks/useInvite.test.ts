import { renderHook, act } from '@testing-library/react-native';
import { useInvite } from '../../hooks/useInvite';
import { resetStore, setAuthenticatedUser } from '../__utils__/mockStore';

const mockIsAvailableAsync = jest.fn();
const mockSendSMSAsync = jest.fn();
const mockCanOpenURL = jest.fn();
const mockOpenURL = jest.fn();
const mockShare = jest.fn();

jest.mock('expo-sms', () => ({
  isAvailableAsync: (...args: any[]) => mockIsAvailableAsync(...args),
  sendSMSAsync: (...args: any[]) => mockSendSMSAsync(...args),
}));

jest.mock('expo-linking', () => ({
  canOpenURL: (...args: any[]) => mockCanOpenURL(...args),
  openURL: (...args: any[]) => mockOpenURL(...args),
}));

jest.mock('react-native', () => ({
  Share: { share: (...args: any[]) => mockShare(...args), sharedAction: 'sharedAction' },
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));

jest.mock('../../lib/logger', () => ({
  logger: { error: jest.fn() },
}));

describe('useInvite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  test('getInviteLink returns URL with user id', () => {
    const user = setAuthenticatedUser();
    const { result } = renderHook(() => useInvite());
    expect(result.current.getInviteLink()).toBe(`https://nuuky.app/invite/${user.id}`);
  });

  test('getInviteLink uses "welcome" without user', () => {
    const { result } = renderHook(() => useInvite());
    expect(result.current.getInviteLink()).toContain('welcome');
  });

  test('getInviteMessage includes user name', () => {
    setAuthenticatedUser({ display_name: 'Alice' });
    const { result } = renderHook(() => useInvite());
    const msg = result.current.getInviteMessage();
    expect(msg).toContain('Alice');
  });

  test('getInviteMessage includes contact name greeting', () => {
    setAuthenticatedUser();
    const { result } = renderHook(() => useInvite());
    const msg = result.current.getInviteMessage('Bob');
    expect(msg).toContain('Hey Bob!');
  });

  test('sendSMSInvite returns false when SMS unavailable', async () => {
    setAuthenticatedUser();
    mockIsAvailableAsync.mockResolvedValue(false);
    const { result } = renderHook(() => useInvite());

    let success = false;
    await act(async () => {
      success = await result.current.sendSMSInvite('+1234567890');
    });

    expect(success).toBe(false);
  });

  test('sendSMSInvite returns true on sent', async () => {
    setAuthenticatedUser();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSendSMSAsync.mockResolvedValue({ result: 'sent' });
    const { result } = renderHook(() => useInvite());

    let success = false;
    await act(async () => {
      success = await result.current.sendSMSInvite('+1234567890');
    });

    expect(success).toBe(true);
  });

  test('shareInvite returns true on shared', async () => {
    setAuthenticatedUser();
    mockShare.mockResolvedValue({ action: 'sharedAction' });
    const { result } = renderHook(() => useInvite());

    let success = false;
    await act(async () => {
      success = await result.current.shareInvite();
    });

    expect(success).toBe(true);
  });

  test('sendWhatsAppInvite returns false when not installed', async () => {
    setAuthenticatedUser();
    mockCanOpenURL.mockResolvedValue(false);
    const { result } = renderHook(() => useInvite());

    let success = false;
    await act(async () => {
      success = await result.current.sendWhatsAppInvite('+1234567890');
    });

    expect(success).toBe(false);
  });

  test('sendWhatsAppInvite opens URL when installed', async () => {
    setAuthenticatedUser();
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined);
    const { result } = renderHook(() => useInvite());

    let success = false;
    await act(async () => {
      success = await result.current.sendWhatsAppInvite('+1234567890');
    });

    expect(success).toBe(true);
    expect(mockOpenURL).toHaveBeenCalled();
  });

  test('sendSMSInvite handles error', async () => {
    setAuthenticatedUser();
    mockIsAvailableAsync.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useInvite());
    let success = true;
    await act(async () => { success = await result.current.sendSMSInvite('+1234567890'); });
    expect(success).toBe(false);
  });

  test('sendWhatsAppInvite handles error', async () => {
    setAuthenticatedUser();
    mockCanOpenURL.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useInvite());
    let success = true;
    await act(async () => { success = await result.current.sendWhatsAppInvite('+1234567890'); });
    expect(success).toBe(false);
  });

  test('shareInvite handles error', async () => {
    setAuthenticatedUser();
    mockShare.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useInvite());
    let success = true;
    await act(async () => { success = await result.current.shareInvite(); });
    expect(success).toBe(false);
  });

  test('sendSMSInvite with cancelled result', async () => {
    setAuthenticatedUser();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSendSMSAsync.mockResolvedValue({ result: 'cancelled' });
    const { result } = renderHook(() => useInvite());
    let success = true;
    await act(async () => { success = await result.current.sendSMSInvite('+1234567890'); });
    expect(success).toBe(false);
  });

  test('shareInvite returns false when dismissed', async () => {
    setAuthenticatedUser();
    mockShare.mockResolvedValue({ action: 'dismissedAction' });
    const { result } = renderHook(() => useInvite());
    let success = true;
    await act(async () => { success = await result.current.shareInvite(); });
    expect(success).toBe(false);
  });
});
