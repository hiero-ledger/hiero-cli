import { Client } from '@hiero-ledger/sdk';
import {
  decodePaymentRequiredHeader,
  encodePaymentRequiredHeader,
} from '@x402/core/http';

import { MOCK_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import {
  makeArgs,
  makeConfigMock,
  makeKeyResolverMock,
  makeKmsMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { TransferServiceImpl } from '@/core/services/transfer/transfer-service';
import { SupportedNetwork } from '@/core/types/shared.types';
import { x402Sign } from '@/plugins/x402/commands/sign/handler';
import { X402SignOutputSchema } from '@/plugins/x402/commands/sign/output';

import { KR_PAYER, makeChallenge, PAY_TO, PAYER } from './helpers/fixtures';
import { useTrackedClients } from './helpers/mocks';

const trackClient = useTrackedClients();

const setup = () => {
  const kms = makeKmsMock();
  kms.createClient.mockReturnValue(trackClient(Client.forTestnet()));
  kms.signTransaction.mockResolvedValue(undefined);

  const keyResolver = makeKeyResolverMock();
  keyResolver.resolveAccountCredentials.mockResolvedValue({
    keyRefId: KR_PAYER,
    accountId: PAYER,
    publicKey: MOCK_PUBLIC_KEY,
  });

  // Return a per-option config: the default key manager plus an unset
  // default_max_transaction_fee (so signing uses the SDK default fee).
  const config = makeConfigMock();
  config.getOption.mockImplementation((name: string) =>
    name === (ConfigOptionKey.default_max_transaction_fee as string)
      ? ''
      : KeyManager.local,
  );

  return { kms, keyResolver, config };
};

test('produces a PAYMENT-SIGNATURE header for an HBAR payment', async () => {
  const { kms, keyResolver, config } = setup();
  const args = makeArgs(
    { kms, keyResolver, config, transfer: new TransferServiceImpl() },
    { challenge: makeChallenge() },
  );

  const result = await x402Sign(args);
  const output = assertOutput(result.result, X402SignOutputSchema);

  expect(output.paymentSignatureHeader.length).toBeGreaterThan(0);
  expect(output.payer).toBe(PAYER);
  expect(output.payTo).toBe(PAY_TO);
  expect(output.network).toBe(SupportedNetwork.TESTNET);
  expect(kms.signTransaction).toHaveBeenCalledTimes(1);
});

test('never leaks a private key into the output', async () => {
  const { kms, keyResolver, config } = setup();
  const args = makeArgs(
    { kms, keyResolver, config, transfer: new TransferServiceImpl() },
    { challenge: makeChallenge() },
  );

  const result = await x402Sign(args);
  const serialized = JSON.stringify(result.result);

  expect(serialized).not.toContain(KR_PAYER);
  expect(serialized.toLowerCase()).not.toContain('privatekey');
});

test('rejects a malformed challenge with ValidationError', async () => {
  const { kms, keyResolver } = setup();
  const args = makeArgs({ kms, keyResolver }, { challenge: 'not-base64-json' });

  await expect(x402Sign(args)).rejects.toThrow(ValidationError);
});

test('rejects an unsupported network with ValidationError', async () => {
  const { kms, keyResolver } = setup();
  const args = makeArgs(
    { kms, keyResolver },
    { challenge: makeChallenge({ network: 'hedera:previewnet' }) },
  );

  await expect(x402Sign(args)).rejects.toThrow(ValidationError);
});

test('rejects an unsupported x402 protocol version with ValidationError', async () => {
  const { kms, keyResolver } = setup();
  const decoded = decodePaymentRequiredHeader(makeChallenge());
  const v1Challenge = encodePaymentRequiredHeader({
    ...decoded,
    x402Version: 1,
  });
  const args = makeArgs({ kms, keyResolver }, { challenge: v1Challenge });

  await expect(x402Sign(args)).rejects.toThrow(ValidationError);
});
