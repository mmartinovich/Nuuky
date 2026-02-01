import { validatePhone, formatPhoneDisplay, getDialCode, getPhonePlaceholder, getMaxPhoneLength } from '../../lib/phoneUtils';

describe('phoneUtils', () => {
  describe('getDialCode', () => {
    test('returns +1 for US', () => {
      expect(getDialCode('US' as any)).toBe('+1');
    });

    test('returns +44 for GB', () => {
      expect(getDialCode('GB' as any)).toBe('+44');
    });

    test('returns +1 for unknown country', () => {
      expect(getDialCode('ZZ' as any)).toBe('+1');
    });
  });

  describe('validatePhone', () => {
    test('valid US number', () => {
      const result = validatePhone('5551234567', 'US' as any);
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+15551234567');
    });

    test('empty number is invalid', () => {
      const result = validatePhone('', 'US' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('too short number is invalid', () => {
      const result = validatePhone('123', 'US' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is too short');
    });

    test('too long number is invalid', () => {
      const result = validatePhone('1234567890123456', 'US' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is too long');
    });

    test('strips leading 0 for non-US countries', () => {
      const result = validatePhone('07911123456', 'GB' as any);
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+447911123456');
    });

    test('does not strip leading 0 for US', () => {
      const result = validatePhone('0551234567', 'US' as any);
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+10551234567');
    });

    test('strips non-digit characters', () => {
      const result = validatePhone('(555) 123-4567', 'US' as any);
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+15551234567');
    });
  });

  describe('formatPhoneDisplay', () => {
    test('formats US number', () => {
      expect(formatPhoneDisplay('5551234567', 'US' as any)).toBe('(555) 123-4567');
    });

    test('formats partial US number', () => {
      expect(formatPhoneDisplay('555', 'US' as any)).toBe('555');
      expect(formatPhoneDisplay('555123', 'US' as any)).toBe('(555) 123');
    });

    test('formats GB number', () => {
      expect(formatPhoneDisplay('79111234567', 'GB' as any)).toBe('7911 123 4567');
    });

    test('formats other countries in groups of 3', () => {
      expect(formatPhoneDisplay('123456789', 'DE' as any)).toBe('123 456 789');
    });

    test('returns empty for empty input', () => {
      expect(formatPhoneDisplay('', 'US' as any)).toBe('');
    });
  });

  describe('getPhonePlaceholder', () => {
    test('returns placeholder for US', () => {
      expect(getPhonePlaceholder('US' as any)).toBe('(555) 123-4567');
    });

    test('returns placeholder for GB', () => {
      expect(getPhonePlaceholder('GB' as any)).toBe('7911 123456');
    });

    test('returns default for unknown', () => {
      expect(getPhonePlaceholder('ZZ' as any)).toBe('123 456 7890');
    });
  });

  describe('getMaxPhoneLength', () => {
    test('returns 10 for US', () => {
      expect(getMaxPhoneLength('US' as any)).toBe(10);
    });

    test('returns 11 for GB', () => {
      expect(getMaxPhoneLength('GB' as any)).toBe(11);
    });

    test('returns 15 for unknown', () => {
      expect(getMaxPhoneLength('ZZ' as any)).toBe(15);
    });
  });
});
