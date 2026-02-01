// Chainable query builder mock
const createQueryBuilder = (resolvedValue: { data: any; error: any } = { data: null, error: null }) => {
  const builder: any = {
    _resolved: resolvedValue,
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    maybeSingle: jest.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
  return builder;
};

export const createMockSupabase = () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  };

  const supabase = {
    from: jest.fn().mockReturnValue(createQueryBuilder()),
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'token' } },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com', user_metadata: {}, app_metadata: {} } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: { session: {}, user: {} }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  };

  return supabase;
};

/**
 * Helper to make supabase.from(table) resolve with specific data.
 * Usage: mockFromReturn(supabase, { data: [...], error: null })
 */
export const mockFromReturn = (
  supabase: any,
  resolvedValue: { data: any; error: any },
) => {
  supabase.from.mockReturnValue(createQueryBuilder(resolvedValue));
};

export { createQueryBuilder };
