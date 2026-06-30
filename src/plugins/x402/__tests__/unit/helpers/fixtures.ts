import type { PaymentRequirements } from '@x402/core/types';

import { encodePaymentRequiredHeader } from '@x402/core/http';

export const PAYER = '0.0.5005';
export const PAY_TO = '0.0.1234';
export const FEE_PAYER = '0.0.98';
export const ASSET_HBAR = '0.0.0';
export const ASSET_TOKEN = '0.0.429274';
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
