import { renderHook, act } from '@testing-library/react-native';
import { useUserSearch } from '../../hooks/useUserSearch';

const mockSelect = jest.fn();
const mockIlike = jest.fn();
const mockLimit = jest.fn();
const mockNeq = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'blocks') {
        return { select: jest.fn().mockReturnValue({ eq: mockEq }) };
      }
      return { select: mockSelect };
    }),
  },
}));

jest.mock('../../stores/appStore', () => ({
  useAppStore: jest.fn(() => ({ currentUser: { id: 'me' } })),
}));

jest.mock('../../lib/logger', () => ({ logger: { error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockEq.mockResolvedValue({ data: [] });
  mockNeq.mockReturnValue({ then: undefined });
  // Chain: select -> ilike -> limit -> neq -> resolve
  mockSelect.mockReturnValue({ ilike: mockIlike });
  mockIlike.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ neq: mockNeq });
});

describe('useUserSearch', () => {
  test('initial state', () => {
    const { result } = renderHook(() => useUserSearch());
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  test('searchUsers returns empty for short query', async () => {
    const { result } = renderHook(() => useUserSearch());
    let res: any;
    await act(async () => { res = await result.current.searchUsers('a'); });
    expect(res).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test('searchUsers returns results', async () => {
    const users = [{ id: 'u1', username: 'alice', display_name: 'Alice' }];
    mockNeq.mockResolvedValue({ data: users, error: null });

    const { result } = renderHook(() => useUserSearch());
    let res: any;
    await act(async () => { res = await result.current.searchUsers('al'); });
    expect(res).toEqual(users);
    expect(result.current.results).toEqual(users);
    expect(mockIlike).toHaveBeenCalledWith('username', 'al%');
  });

  test('searchUsers filters blocked users', async () => {
    mockEq.mockResolvedValue({ data: [{ blocked_id: 'u2' }] });
    mockNeq.mockResolvedValue({
      data: [
        { id: 'u1', username: 'alice' },
        { id: 'u2', username: 'albert' },
      ],
      error: null,
    });

    const { result } = renderHook(() => useUserSearch());
    let res: any;
    await act(async () => { res = await result.current.searchUsers('al'); });
    expect(res).toEqual([{ id: 'u1', username: 'alice' }]);
  });

  test('searchUsers handles error', async () => {
    mockNeq.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const { result } = renderHook(() => useUserSearch());
    await act(async () => { await result.current.searchUsers('test'); });
    expect(result.current.error).toBe('Failed to search users');
    expect(result.current.results).toEqual([]);
  });

  test('getUserByUsername returns user', async () => {
    mockSelect.mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) });
    mockSingle.mockResolvedValue({ data: { id: 'u1', username: 'alice' }, error: null });

    const { result } = renderHook(() => useUserSearch());
    let res: any;
    await act(async () => { res = await result.current.getUserByUsername('Alice'); });
    expect(res).toEqual({ id: 'u1', username: 'alice' });
  });

  test('getUserByUsername returns null for empty', async () => {
    const { result } = renderHook(() => useUserSearch());
    let res: any;
    await act(async () => { res = await result.current.getUserByUsername('  '); });
    expect(res).toBeNull();
  });

  test('getUserByUsername handles PGRST116', async () => {
    mockSelect.mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) });
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    const { result } = renderHook(() => useUserSearch());
    let res: any;
    await act(async () => { res = await result.current.getUserByUsername('nobody'); });
    expect(res).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('clearResults resets state', async () => {
    mockNeq.mockResolvedValue({ data: [{ id: 'u1' }], error: null });

    const { result } = renderHook(() => useUserSearch());
    await act(async () => { await result.current.searchUsers('test'); });
    expect(result.current.results.length).toBe(1);

    act(() => { result.current.clearResults(); });
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
