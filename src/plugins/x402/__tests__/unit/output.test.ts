import { SupportedNetwork } from '@/core/types/shared.types';
import {
  X402_SIGN_TEMPLATE,
  X402SignOutputSchema,
} from '@/plugins/x402/commands/sign/output';

import { ASSET_HBAR, FEE_PAYER, PAY_TO, PAYER } from './helpers/fixtures';

test('validates a complete output object', () => {
  const value = {
    paymentSignatureHeader: 'base64header',
    payer: PAYER,
    payTo: PAY_TO,
    amount: '250',
    asset: ASSET_HBAR,
    network: SupportedNetwork.TESTNET,
    feePayer: FEE_PAYER,
    transactionId: `${FEE_PAYER}@1700000000.000000000`,
  };
  expect(X402SignOutputSchema.parse(value)).toEqual(value);
});

test('template references the header field', () => {
  expect(X402_SIGN_TEMPLATE).toContain('paymentSignatureHeader');
});
