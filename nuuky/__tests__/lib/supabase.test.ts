// Test the supabase module exports
// We need to mock expo dependencies first

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

import { supabase, getCurrentUser, signOut } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

describe('supabase', () => {
  test('creates client with correct URL and key', () => {
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
        }),
      }),
    );
  });

  test('exports supabase client', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  test('getCurrentUser returns null when no session', async () => {
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  test('signOut calls supabase.auth.signOut', async () => {
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
