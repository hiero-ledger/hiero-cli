import { Hbar } from '@hiero-ledger/sdk';

import { ValidationError } from '@/core/errors';
import { parseMaxTransactionFee } from '@/core/utils/parse-max-transaction-fee';

describe('parseMaxTransactionFee', () => {
  it('returns undefined for empty / whitespace input (unset)', () => {
    expect(parseMaxTransactionFee('')).toBeUndefined();
    expect(parseMaxTransactionFee('   ')).toBeUndefined();
  });

  it('returns undefined for zero values (reset / no override)', () => {
    expect(parseMaxTransactionFee('0')).toBeUndefined();
    expect(parseMaxTransactionFee('0t')).toBeUndefined();
  });

  it('parses an HBAR amount into the correct tinybar ceiling', () => {
    const fee = parseMaxTransactionFee('20');
    expect(fee).toBeInstanceOf(Hbar);
    expect(fee?.toTinybars().toString()).toBe('2000000000');
  });

  it('parses a fractional HBAR amount', () => {
    const fee = parseMaxTransactionFee('1.5');
    expect(fee?.toTinybars().toString()).toBe('150000000');
  });

  it('parses an explicit tinybar amount with the t suffix', () => {
    const fee = parseMaxTransactionFee('200000000t');
    expect(fee?.toTinybars().toString()).toBe('200000000');
  });

  it('throws on negative or malformed input', () => {
    expect(() => parseMaxTransactionFee('-5')).toThrow(ValidationError);
    expect(() => parseMaxTransactionFee('abc')).toThrow(ValidationError);
  });
});
