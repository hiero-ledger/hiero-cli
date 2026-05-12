import { ValidationError } from '@/core/errors';
import { formatTransactionIdToDashFormat } from '@/core/utils/transaction-id-format-transformer';

describe('formatTransactionIdToDashFormat', () => {
  it('converts @ form to dash form', () => {
    expect(
      formatTransactionIdToDashFormat('0.0.7900086@1775577354.363164462'),
    ).toBe('0.0.7900086-1775577354-363164462');
  });

  it('trims whitespace', () => {
    expect(formatTransactionIdToDashFormat('  0.0.1@123.456  ')).toBe(
      '0.0.1-123-456',
    );
  });

  it('returns unchanged when already dash form', () => {
    expect(
      formatTransactionIdToDashFormat('0.0.7900086-1775577354-363164462'),
    ).toBe('0.0.7900086-1775577354-363164462');
  });

  it('throws on empty string', () => {
    expect(() => formatTransactionIdToDashFormat('')).toThrow(ValidationError);
    expect(() => formatTransactionIdToDashFormat('   ')).toThrow(
      ValidationError,
    );
  });

  it('throws on invalid format', () => {
    expect(() => formatTransactionIdToDashFormat('not-a-tx-id')).toThrow(
      ValidationError,
    );
  });
});
