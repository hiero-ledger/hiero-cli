import { ValidationError } from '@/core/errors';
import { selectHederaRequirement } from '@/plugins/x402/utils/select-requirement';

import {
  ASSET_HBAR,
  ASSET_TOKEN,
  makePaymentRequirement,
} from './helpers/fixtures';

test('returns the single matching hedera exact requirement', () => {
  const hbar = makePaymentRequirement();
  expect(selectHederaRequirement([hbar])).toBe(hbar);
});

test('ignores non-hedera and non-exact entries', () => {
  const hbar = makePaymentRequirement();
  const evm = makePaymentRequirement({ network: 'eip155:1' });
  const upto = makePaymentRequirement({ scheme: 'upto' });
  expect(selectHederaRequirement([evm, upto, hbar])).toBe(hbar);
});

test('throws when no hedera exact requirement is present', () => {
  const evm = makePaymentRequirement({ network: 'eip155:1' });
  expect(() => selectHederaRequirement([evm])).toThrow(ValidationError);
});

test('throws on ambiguity without asset', () => {
  const hbar = makePaymentRequirement({ asset: ASSET_HBAR });
  const usdc = makePaymentRequirement({ asset: ASSET_TOKEN });
  expect(() => selectHederaRequirement([hbar, usdc])).toThrow(ValidationError);
});

test('disambiguates by asset', () => {
  const hbar = makePaymentRequirement({ asset: ASSET_HBAR });
  const usdc = makePaymentRequirement({ asset: ASSET_TOKEN });
  expect(selectHederaRequirement([hbar, usdc], ASSET_TOKEN)).toBe(usdc);
});

test('throws when asset matches nothing', () => {
  const hbar = makePaymentRequirement({ asset: ASSET_HBAR });
  expect(() => selectHederaRequirement([hbar], '0.0.999')).toThrow(
    ValidationError,
  );
});
