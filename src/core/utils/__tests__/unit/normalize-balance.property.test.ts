import BigNumber from 'bignumber.js';
import fc from 'fast-check';

import { ValidationError } from '@/core/errors';
import { normalizeBalance } from '@/core/utils/normalize-balance';

const MAX_DECIMALS = 18;
const MAX_RAW_BALANCE = 2n ** 128n - 1n;

const rawBalance = fc
  .bigInt({ min: 0n, max: MAX_RAW_BALANCE })
  .map((value) => new BigNumber(value.toString()));

const decimals = fc.integer({ min: 0, max: MAX_DECIMALS });

describe('normalizeBalance (property-based)', () => {
  it('round-trips: parsing the output and shifting it back yields the raw balance', () => {
    fc.assert(
      fc.property(rawBalance, decimals, (balance, dec) => {
        const normalized = normalizeBalance(balance, dec);
        const restored = new BigNumber(normalized).shiftedBy(dec);
        expect(restored.isEqualTo(balance)).toBe(true);
      }),
    );
  });

  it('never emits exponential notation, trailing zeros or a dangling decimal point', () => {
    fc.assert(
      fc.property(rawBalance, decimals, (balance, dec) => {
        expect(normalizeBalance(balance, dec)).toMatch(/^\d+(\.\d*[1-9])?$/);
      }),
    );
  });

  it('rejects negative balances', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -MAX_RAW_BALANCE, max: -1n }),
        decimals,
        (value, dec) => {
          const negative = new BigNumber(value.toString());
          expect(() => normalizeBalance(negative, dec)).toThrow(
            ValidationError,
          );
        },
      ),
    );
  });

  it('rejects decimals that are negative or not integers', () => {
    fc.assert(
      fc.property(
        rawBalance,
        fc.oneof(
          fc.integer({ min: -1000, max: -1 }),
          fc.double({ noInteger: true, noNaN: true, noDefaultInfinity: true }),
        ),
        (balance, dec) => {
          expect(() => normalizeBalance(balance, dec)).toThrow(ValidationError);
        },
      ),
    );
  });
});
