import type { PaymentRequirements } from '@x402/core/types';

import { encodePaymentRequiredHeader } from '@x402/core/http';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_TO,
  MOCK_TOKEN_ID,
} from '@/__tests__/mocks/fixtures';

export const PAYER = MOCK_ACCOUNT_ID;
export const PAY_TO = MOCK_ACCOUNT_ID_TO;
export const FEE_PAYER = '0.0.98';
export const ASSET_HBAR = '0.0.0';
export const ASSET_TOKEN = MOCK_TOKEN_ID;
export const KR_PAYER = 'kr_payer';

export const makePaymentRequirement = (
  over: Partial<PaymentRequirements> = {},
): PaymentRequirements => ({
  scheme: 'exact',
  network: 'hedera:testnet',
  asset: ASSET_HBAR,
  amount: '250',
  payTo: PAY_TO,
  maxTimeoutSeconds: 60,
  extra: { feePayer: FEE_PAYER },
  ...over,
});

export const makeChallenge = (
  over: Partial<PaymentRequirements> = {},
): string =>
  encodePaymentRequiredHeader({
    x402Version: 2,
    resource: { url: 'https://api.example.com/data' },
    accepts: [makePaymentRequirement(over)],
  });
