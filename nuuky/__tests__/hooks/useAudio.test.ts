import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockInitialize = jest.fn();
const mockSetCallbacks = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(true);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockSetMic = jest.fn();
const mockIsConnected = jest.fn().mockReturnValue(false);
const mockIsMicEnabled = jest.fn().mockReturnValue(false);
const mockGetCurrentRoom = jest.fn().mockReturnValue(null);

jest.mock('../../lib/livekit', () => ({
  initializeLiveKit: () => mockInitialize(),
  setAudioEventCallbacks: (cb: any) => mockSetCallbacks(cb),
  connectToAudioRoom: (...args: any[]) => mockConnect(...args),
  disconnectFromAudioRoom: () => mockDisconnect(),
  setLocalMicrophoneEnabled: (v: any) => mockSetMic(v),
  isConnected: () => mockIsConnected(),
  isMicrophoneEnabled: () => mockIsMicEnabled(),
  getCurrentRoom: () => mockGetCurrentRoom(),
}));

jest.mock('../../lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

import { useAudio } from '../../hooks/useAudio';
import { useAppStore } from '../../stores/appStore';

const mockUser = { id: 'u1', display_name: 'Test' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAppStore.setState({
    currentUser: mockUser as any,
    audioConnectionStatus: 'disconnected',
    speakingParticipants: [],
  });
});

describe('useAudio', () => {
  test('returns initial disconnected state', () => {
    const { result } = renderHook(() => useAudio('room1'));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isMicrophoneEnabled).toBe(false);
  });

  test('initializes LiveKit on mount', () => {
    renderHook(() => useAudio('room1'));
    expect(mockInitialize).toHaveBeenCalled();
  });

  test('sets event callbacks on mount', () => {
    renderHook(() => useAudio('room1'));
    expect(mockSetCallbacks).toHaveBeenCalledWith(expect.objectContaining({
      onConnectionStatusChange: expect.any(Function),
      onParticipantSpeaking: expect.any(Function),
      onError: expect.any(Function),
      onAllMuted: expect.any(Function),
    }));
  });

  test('connect calls connectToAudioRoom', async () => {
    mockIsConnected.mockReturnValue(false);
    const { result } = renderHook(() => useAudio('room1'));
    let ok = false;
    await act(async () => { ok = await result.current.connect(); });
    expect(mockConnect).toHaveBeenCalledWith('room1');
    expect(ok).toBe(true);
  });

  test('connect returns false without roomId', async () => {
    const { result } = renderHook(() => useAudio(null));
    let ok = true;
    await act(async () => { ok = await result.current.connect(); });
    expect(ok).toBe(false);
  });

  test('connect enables mic when already connected', async () => {
    mockIsConnected.mockReturnValue(true);
    const { result } = renderHook(() => useAudio('room1'));
    await act(async () => { await result.current.connect(); });
    expect(mockSetMic).toHaveBeenCalledWith(true);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  test('disconnect calls disconnectFromAudioRoom', async () => {
    const { result } = renderHook(() => useAudio('room1'));
    await act(async () => { await result.current.disconnect(); });
    expect(mockDisconnect).toHaveBeenCalled();
  });

  test('mute disables mic when connected', async () => {
    mockIsConnected.mockReturnValue(true);
    const { result } = renderHook(() => useAudio('room1'));
    await act(async () => { await result.current.mute(); });
    expect(mockSetMic).toHaveBeenCalledWith(false);
  });

  test('isParticipantSpeaking checks store', () => {
    useAppStore.setState({ speakingParticipants: ['u2'] });
    const { result } = renderHook(() => useAudio('room1'));
    expect(result.current.isParticipantSpeaking('u2')).toBe(true);
    expect(result.current.isParticipantSpeaking('u3')).toBe(false);
  });

  test('connect returns false when connection fails', async () => {
    mockIsConnected.mockReturnValue(false);
    mockConnect.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useAudio('room1'));
    let ok = true;
    await act(async () => { ok = await result.current.connect(); });
    expect(ok).toBe(false);
  });
});
