import { renderHook, act } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

jest.mock('../../lib/logger', () => ({ logger: { error: jest.fn() } }));

import { useInviteLink } from '../../hooks/useInviteLink';
import { useAppStore } from '../../stores/appStore';

const mockUser = { id: 'u1', display_name: 'Test' };

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolved),
  maybeSingle: jest.fn().mockResolvedValue(resolved),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAppStore.setState({ currentUser: mockUser as any });
});

describe('useInviteLink', () => {
  test('getInviteUrl returns correct URL', () => {
    const { result } = renderHook(() => useInviteLink());
    expect(result.current.getInviteUrl('abc123')).toBe('nuuky://r/abc123');
  });

  test('createInviteLink requires login', async () => {
    useAppStore.setState({ currentUser: null });
    const { result } = renderHook(() => useInviteLink());
    let link: any;
    await act(async () => { link = await result.current.createInviteLink('room1'); });
    expect(link).toBeNull();
  });

  test('createInviteLink succeeds', async () => {
    const mockLink = { id: 'link1', token: 'tok1', room_id: 'room1' };
    mockFrom.mockReturnValue(createChain({ data: mockLink, error: null }));
    const { result } = renderHook(() => useInviteLink());
    let link: any;
    await act(async () => { link = await result.current.createInviteLink('room1'); });
    expect(link).toEqual(mockLink);
  });

  test('createInviteLink handles error', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));
    const { result } = renderHook(() => useInviteLink());
    let link: any;
    await act(async () => { link = await result.current.createInviteLink('room1'); });
    expect(link).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to create invite link');
  });

  test('getInviteLinkInfo returns null for not found', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: { code: 'PGRST116' } }));
    const { result } = renderHook(() => useInviteLink());
    let info: any;
    await act(async () => { info = await result.current.getInviteLinkInfo('bad'); });
    expect(info).toBeNull();
  });

  test('getInviteLinkInfo detects expired link', async () => {
    const expired = new Date(Date.now() - 86400000).toISOString();
    mockFrom.mockReturnValue(createChain({
      data: {
        token: 'tok1',
        expires_at: expired,
        max_uses: null,
        use_count: 0,
        room: { id: 'r1', name: 'R', is_active: true },
        creator: { id: 'u1', display_name: 'Bob' },
      },
      error: null,
    }));
    const { result } = renderHook(() => useInviteLink());
    let info: any;
    await act(async () => { info = await result.current.getInviteLinkInfo('tok1'); });
    expect(info.isValid).toBe(false);
    expect(info.reason).toContain('expired');
  });

  test('getInviteLinkInfo detects max uses reached', async () => {
    mockFrom.mockReturnValue(createChain({
      data: {
        token: 'tok1',
        expires_at: null,
        max_uses: 5,
        use_count: 5,
        room: { id: 'r1', name: 'R', is_active: true },
        creator: { id: 'u1', display_name: 'Bob' },
      },
      error: null,
    }));
    const { result } = renderHook(() => useInviteLink());
    let info: any;
    await act(async () => { info = await result.current.getInviteLinkInfo('tok1'); });
    expect(info.isValid).toBe(false);
    expect(info.reason).toContain('maximum uses');
  });

  test('getLinksForRoom returns links', async () => {
    const mockLinks = [{ id: 'l1' }, { id: 'l2' }];
    mockFrom.mockReturnValue(createChain({ data: mockLinks, error: null }));
    const { result } = renderHook(() => useInviteLink());
    let links: any;
    await act(async () => { links = await result.current.getLinksForRoom('room1'); });
    expect(links).toEqual(mockLinks);
  });

  test('deleteInviteLink succeeds', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: null }));
    const { result } = renderHook(() => useInviteLink());
    let ok = false;
    await act(async () => { ok = await result.current.deleteInviteLink('link1'); });
    expect(ok).toBe(true);
  });

  test('deleteInviteLink handles error', async () => {
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));
    const { result } = renderHook(() => useInviteLink());
    let ok = true;
    await act(async () => { ok = await result.current.deleteInviteLink('link1'); });
    expect(ok).toBe(false);
  });

  test('shareInviteLink calls Share.share', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    const { result } = renderHook(() => useInviteLink());
    let ok = false;
    await act(async () => { ok = await result.current.shareInviteLink('tok1', 'My Room'); });
    expect(ok).toBe(true);
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ url: 'nuuky://r/tok1' }));
  });

  test('copyInviteLink calls Share.share', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    const { result } = renderHook(() => useInviteLink());
    let ok = false;
    await act(async () => { ok = await result.current.copyInviteLink('tok1'); });
    expect(ok).toBe(true);
  });
});
