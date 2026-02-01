import { validateEmail, maskEmail, OTP_ERROR_MESSAGES, getOTPErrorMessage } from '../../lib/emailUtils';

describe('validateEmail', () => {
  test('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true);
  });

  test('trims whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true);
  });

  test('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  test('rejects no domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  test('rejects no local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  test('rejects spaces in email', () => {
    expect(validateEmail('us er@example.com')).toBe(false);
  });

  test('rejects no TLD', () => {
    expect(validateEmail('user@example')).toBe(false);
  });
});

describe('maskEmail', () => {
  test('masks standard email', () => {
    expect(maskEmail('john@gmail.com')).toBe('j**n@gmail.com');
  });

  test('handles short local part (2 chars)', () => {
    expect(maskEmail('jo@gmail.com')).toBe('jo@gmail.com');
  });

  test('handles single char local part', () => {
    expect(maskEmail('j@gmail.com')).toBe('j@gmail.com');
  });

  test('handles no @ sign', () => {
    expect(maskEmail('noemail')).toBe('noemail');
  });

  test('masks long local part', () => {
    const result = maskEmail('longusername@example.com');
    expect(result).toBe('l***e@example.com');
  });
});

describe('getOTPErrorMessage', () => {
  test('returns rate limit message for rate limit errors', () => {
    const result = getOTPErrorMessage({ message: 'rate limit exceeded' });
    expect(result).toContain('Too many');
  });

  test('returns rate limit message for "too many" errors', () => {
    const result = getOTPErrorMessage({ message: 'Too many requests' });
    expect(result).toContain('Too many');
  });

  test('returns mapped message for known error code', () => {
    const result = getOTPErrorMessage({ code: 'otp_expired' });
    expect(result).toBe(OTP_ERROR_MESSAGES['otp_expired']);
  });

  test('returns error message as fallback', () => {
    const result = getOTPErrorMessage({ message: 'Something went wrong' });
    expect(result).toBe('Something went wrong');
  });

  test('returns default for unknown error', () => {
    const result = getOTPErrorMessage({});
    expect(result).toBe('An error occurred. Please try again.');
  });
});
