import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  Fields: { PhoneNumbers: 'phoneNumbers', Name: 'name' },
}));

jest.mock('../../lib/logger', () => ({ logger: { error: jest.fn() } }));

import { useContactSync } from '../../hooks/useContactSync';
import * as Contacts from 'expo-contacts';

const createChain = (resolved: any = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  then: (resolve: any) => Promise.resolve(resolved).then(resolve),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('useContactSync', () => {
  test('returns initial state', () => {
    const { result } = renderHook(() => useContactSync());
    expect(result.current.loading).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.hasSynced).toBe(false);
    expect(result.current.matches).toEqual({ onNuuky: [], notOnNuuky: [] });
  });

  test('requestPermission sets hasPermission on grant', async () => {
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => useContactSync());
    let granted: boolean = false;
    await act(async () => { granted = await result.current.requestPermission(); });
    expect(granted).toBe(true);
    expect(result.current.hasPermission).toBe(true);
  });

  test('requestPermission shows alert on deny', async () => {
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useContactSync());
    let granted: boolean = true;
    await act(async () => { granted = await result.current.requestPermission(); });
    expect(granted).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Permission Required', expect.any(String), expect.any(Array));
  });

  test('checkPermission returns status', async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => useContactSync());
    let granted: boolean = false;
    await act(async () => { granted = await result.current.checkPermission(); });
    expect(granted).toBe(true);
  });

  test('syncContacts with no contacts shows alert', async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useContactSync());
    await act(async () => { await result.current.syncContacts(); });
    expect(Alert.alert).toHaveBeenCalledWith('No Contacts', expect.any(String));
  });

  test('syncContacts matches registered users', async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
      data: [
        { id: 'c1', name: 'Bob', phoneNumbers: [{ number: '(555) 123-4567' }] },
        { id: 'c2', name: 'Alice', phoneNumbers: [{ number: '(555) 987-6543' }] },
      ],
    });
    mockFrom.mockReturnValue(createChain({
      data: [{ phone: '+15551234567', id: 'u1', display_name: 'Bob' }],
      error: null,
    }));

    const { result } = renderHook(() => useContactSync());
    await act(async () => { await result.current.syncContacts(); });
    expect(result.current.hasSynced).toBe(true);
    expect(result.current.matches.onNuuky).toHaveLength(1);
    expect(result.current.matches.notOnNuuky).toHaveLength(1);
  });

  test('syncContacts handles no valid phone numbers', async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
      data: [{ id: 'c1', name: 'Bob', phoneNumbers: [{ number: '123' }] }],
    });
    const { result } = renderHook(() => useContactSync());
    await act(async () => { await result.current.syncContacts(); });
    expect(Alert.alert).toHaveBeenCalledWith('No Phone Numbers', expect.any(String));
  });

  test('syncContacts handles permission denied then request denied', async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useContactSync());
    await act(async () => { await result.current.syncContacts(); });
    expect(result.current.loading).toBe(false);
  });

  test('clearMatches resets state', async () => {
    const { result } = renderHook(() => useContactSync());
    await act(async () => { result.current.clearMatches(); });
    expect(result.current.hasSynced).toBe(false);
    expect(result.current.matches).toEqual({ onNuuky: [], notOnNuuky: [] });
  });

  test('syncContacts handles supabase error gracefully', async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
      data: [{ id: 'c1', name: 'Bob', phoneNumbers: [{ number: '(555) 123-4567' }] }],
    });
    mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'fail' } }));

    const { result } = renderHook(() => useContactSync());
    await act(async () => { await result.current.syncContacts(); });
    expect(result.current.matches.onNuuky).toHaveLength(0);
  });
});
