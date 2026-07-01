import { Client, Transaction, TransferTransaction } from '@hiero-ledger/sdk';

import { makeConfigMock, makeKmsMock } from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { TransferServiceImpl } from '@/core/services/transfer/transfer-service';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  ASSET_HBAR,
  ASSET_TOKEN,
  FEE_PAYER,
  KR_PAYER,
  makePaymentRequirement,
  PAY_TO,
  PAYER,
} from '@/plugins/x402/__tests__/unit/helpers/fixtures';
import { useTrackedClients } from '@/plugins/x402/__tests__/unit/helpers/mocks';
import { PaymentSignerServiceImpl } from '@/plugins/x402/services/payment-signer.service';

const trackClient = useTrackedClients();

const makeServiceWithKms = () => {
  const kms = makeKmsMock();
  kms.createClient.mockReturnValue(trackClient(Client.forTestnet()));
  kms.signTransaction.mockResolvedValue(undefined);
  const configService = makeConfigMock();
  // No default max transaction fee configured for these tests.
  configService.getOption.mockReturnValue('');
  const service = new PaymentSignerServiceImpl(
    kms,
    new TransferServiceImpl(),
    configService,
  );
  return { service, kms };
};

const makeSignerOf = (service: PaymentSignerServiceImpl) =>
  service.createSigner({
    keyRefId: KR_PAYER,
    accountId: PAYER,
    network: SupportedNetwork.TESTNET,
  });

test('builds, freezes and KMS-signs an HBAR transfer, returns base64', async () => {
  const { service, kms } = makeServiceWithKms();
  const { signer, getBuiltContext } = makeSignerOf(service);

  const base64 = await signer.createPartiallySignedTransferTransaction(
    makePaymentRequirement(),
  );

  expect(typeof base64).toBe('string');
  const decoded = Transaction.fromBytes(Buffer.from(base64, 'base64'));
  expect(decoded).toBeInstanceOf(TransferTransaction);
  expect(kms.signTransaction).toHaveBeenCalledTimes(1);
  expect(kms.signTransaction.mock.calls[0][1]).toBe(KR_PAYER);

  const ctx = getBuiltContext();
  expect(ctx.payer).toBe(PAYER);
  expect(ctx.payTo).toBe(PAY_TO);
  expect(ctx.amount).toBe('250');
  expect(ctx.asset).toBe(ASSET_HBAR);
  expect(ctx.feePayer).toBe(FEE_PAYER);
  expect(ctx.transactionId.startsWith(`${FEE_PAYER}@`)).toBe(true);
});

test('builds an HTS token transfer when asset is a token id', async () => {
  const { service, kms } = makeServiceWithKms();
  const { signer } = makeSignerOf(service);

  const base64 = await signer.createPartiallySignedTransferTransaction(
    makePaymentRequirement({ asset: ASSET_TOKEN }),
  );

  const decoded = Transaction.fromBytes(
    Buffer.from(base64, 'base64'),
  ) as TransferTransaction;
  expect(decoded.tokenTransfers.size).toBeGreaterThan(0);
  expect(kms.signTransaction).toHaveBeenCalledTimes(1);
});

test('throws ValidationError when extra.feePayer is missing', async () => {
  const { service } = makeServiceWithKms();
  const { signer } = makeSignerOf(service);

  await expect(
    signer.createPartiallySignedTransferTransaction(
      makePaymentRequirement({ extra: {} }),
    ),
  ).rejects.toThrow(ValidationError);
});

test('throws ValidationError when amount is not positive', async () => {
  const { service } = makeServiceWithKms();
  const { signer } = makeSignerOf(service);

  await expect(
    signer.createPartiallySignedTransferTransaction(
      makePaymentRequirement({ amount: '0' }),
    ),
  ).rejects.toThrow(ValidationError);
});

test('throws ValidationError when amount is not a valid integer', async () => {
  const { service } = makeServiceWithKms();
  const { signer } = makeSignerOf(service);

  await expect(
    signer.createPartiallySignedTransferTransaction(
      makePaymentRequirement({ amount: 'abc' }),
    ),
  ).rejects.toThrow(ValidationError);
});

test('closes the KMS client after building', async () => {
  const { service, kms } = makeServiceWithKms();
  const client = trackClient(Client.forTestnet());
  const closeSpy = jest.spyOn(client, 'close');
  kms.createClient.mockReturnValue(client);

  const { signer } = makeSignerOf(service);

  await signer.createPartiallySignedTransferTransaction(
    makePaymentRequirement(),
  );
  expect(closeSpy).toHaveBeenCalled();
});
