import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useSpeakingAnimations } from '../../hooks/useSpeakingAnimations';

describe('useSpeakingAnimations', () => {
  test('returns animation values', () => {
    const { result } = renderHook(() =>
      useSpeakingAnimations({ isCurrentUserSpeaking: false, isMuted: false }),
    );
    expect(result.current.buttonScaleAnim).toBeInstanceOf(Animated.Value);
    expect(result.current.buttonGlowAnim).toBeInstanceOf(Animated.Value);
    expect(result.current.ringAnims).toHaveLength(4);
  });

  test('resets values when muted', () => {
    const { result } = renderHook(() =>
      useSpeakingAnimations({ isCurrentUserSpeaking: true, isMuted: true }),
    );
    // When muted, values should be reset to defaults
    expect((result.current.buttonScaleAnim as any)._value).toBe(1);
    expect((result.current.buttonGlowAnim as any)._value).toBe(1);
    result.current.ringAnims.forEach((ring: any) => {
      expect(ring._value).toBe(0);
    });
  });

  test('resets values when not speaking', () => {
    const { result } = renderHook(() =>
      useSpeakingAnimations({ isCurrentUserSpeaking: false, isMuted: false }),
    );
    expect((result.current.buttonScaleAnim as any)._value).toBe(1);
  });

  test('starts animations when speaking and not muted', () => {
    const spy = jest.spyOn(Animated, 'loop');
    renderHook(() =>
      useSpeakingAnimations({ isCurrentUserSpeaking: true, isMuted: false }),
    );
    // Should create loop animations for pulse + rings
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('stops animations on unmount', () => {
    const mockStop = jest.fn();
    jest.spyOn(Animated, 'loop').mockReturnValue({ start: jest.fn(), stop: mockStop, reset: jest.fn() } as any);

    const { unmount } = renderHook(() =>
      useSpeakingAnimations({ isCurrentUserSpeaking: true, isMuted: false }),
    );
    unmount();
    expect(mockStop).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
