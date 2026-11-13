import { Client } from '@hiero-ledger/sdk';
import { x402Client } from '@x402/core/client';
import {
  decodePaymentRequiredHeader,
  encodePaymentRequiredHeader,
} from '@x402/core/http';
import {
  findDefaultAsset as findHederaDefaultAsset,
  HEDERA_TESTNET_USDC,
  HEDERA_USDC_DECIMALS,
} from '@x402/hedera';

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

import {
  ASSET_HBAR,
  KR_PAYER,
  makeChallenge,
  PAY_TO,
  PAYER,
} from './helpers/fixtures';
import { useTrackedClients } from './helpers/mocks';

const trackClient = useTrackedClients();

afterEach(() => {
  jest.restoreAllMocks();
});

/** Tinybar decimals used for HBAR when it is treated as a default asset. */
const HBAR_DECIMALS = 8;
/** HBAR amount for exactly $1 and one tinybar above it under the default cap. */
const HBAR_AMOUNT_AT_CAP = String(10 ** HBAR_DECIMALS);
const HBAR_AMOUNT_ABOVE_CAP = String(10 ** HBAR_DECIMALS + 1);
/** $2 in USDC atomic units — twice the default $1 spend cap. */
const USDC_AMOUNT_ABOVE_CAP = String(2 * 10 ** HEDERA_USDC_DECIMALS);

/**
 * Exact rejection surfaced by @x402/core >= 2.27 when spend controls are
 * enabled and no requirement passes the asset allowlist.
 */
const SPEND_CONTROLS_REJECTION =
  'All payment requirements were rejected by spendControls: only default assets or entries in spendControls.allowedAssets are allowed. Add an allowedAssets entry for non-default tokens, set allowedAssets: true, or set spendControls: false.';

/** Exact rejection surfaced by @x402/core >= 2.27 when the $1 cap is exceeded. */
const maxAmountRejection = (symbol: string) =>
  `All payment requirements were rejected by spendControls.maxAmountPerPayment ($1, including ${symbol}). Raise maxAmountPerPayment, set it to false to disable, set allowedAssets[].maxAmountPerPayment for a per-asset atomic cap, or set spendControls: false to disable all spend controls.`;

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

/** Runs `x402 sign` for a challenge and returns the validated output + kms mock. */
const signChallenge = async (challenge: string) => {
  const { kms, keyResolver, config } = setup();
  const args = makeArgs(
    { kms, keyResolver, config, transfer: new TransferServiceImpl() },
    { challenge },
  );

  const result = await x402Sign(args);
  return {
    raw: result.result,
    output: assertOutput(result.result, X402SignOutputSchema),
    kms,
  };
};

/**
 * Neutralises the handler's `setSpendControls(false)` so the @x402/core 2.27
 * defaults (spend controls enabled) stay active for the assertions.
 */
const keepSpendControlsEnabled = () =>
  jest
    .spyOn(x402Client.prototype, 'setSpendControls')
    .mockImplementation(function (this: x402Client) {
      return this;
    });

/**
 * Extends the registered scheme's default-asset lookup with HBAR — the exact
 * hook @x402/core consults to allowlist default assets.
 */
const withHbarAsDefaultAsset = () => {
  const register = x402Client.prototype.register;
  jest.spyOn(x402Client.prototype, 'register').mockImplementation(function (
    this: x402Client,
    network,
    scheme,
  ) {
    scheme.findDefaultAsset = (asset, net) =>
      asset === ASSET_HBAR && net === 'hedera:testnet'
        ? { asset: ASSET_HBAR, decimals: HBAR_DECIMALS, symbol: 'HBAR' }
        : findHederaDefaultAsset(asset, net);
    return register.call(this, network, scheme);
  });
};

test('produces a PAYMENT-SIGNATURE header for an HBAR payment with the x402 spend controls disabled', async () => {
  // The handler must disable the @x402/core >= 2.27 spend controls: HBAR
  // (0.0.0) is not one of @x402/hedera's default assets, so with the default
  // controls the very same challenge is rejected (see the spend-controls
  // tests below).
  const setSpendControls = jest.spyOn(x402Client.prototype, 'setSpendControls');

  const { output, kms } = await signChallenge(makeChallenge());

  expect(setSpendControls).toHaveBeenCalledWith(false);
  expect(output.paymentSignatureHeader.length).toBeGreaterThan(0);
  expect(output.payer).toBe(PAYER);
  expect(output.payTo).toBe(PAY_TO);
  expect(output.network).toBe(SupportedNetwork.TESTNET);
  expect(kms.signTransaction).toHaveBeenCalledTimes(1);
});

test('fails with the spendControls rejection when the x402 spend controls stay enabled', async () => {
  // Simulate a handler that does NOT call setSpendControls(false): the
  // @x402/core 2.27 defaults keep the controls enabled, @x402/hedera only
  // lists USDC as a default asset, so the HBAR challenge must be rejected
  // with this exact error.
  keepSpendControlsEnabled();

  await expect(signChallenge(makeChallenge())).rejects.toThrow(
    SPEND_CONTROLS_REJECTION,
  );
});

test('signs an HBAR payment with the spend controls enabled when HBAR is a default asset', async () => {
  keepSpendControlsEnabled();
  withHbarAsDefaultAsset();

  const { output, kms } = await signChallenge(makeChallenge());

  expect(output.paymentSignatureHeader.length).toBeGreaterThan(0);
  expect(output.asset).toBe(ASSET_HBAR);
  expect(output.payer).toBe(PAYER);
  expect(kms.signTransaction).toHaveBeenCalledTimes(1);
});

test('rejects a USDC payment above the $1 cap when the x402 spend controls stay enabled', async () => {
  // USDC is @x402/hedera's default asset, so the asset allowlist passes it
  // through — but the default $1 maxAmountPerPayment must reject $2.
  keepSpendControlsEnabled();

  const challenge = makeChallenge({
    asset: HEDERA_TESTNET_USDC,
    amount: USDC_AMOUNT_ABOVE_CAP,
  });

  await expect(signChallenge(challenge)).rejects.toThrow(
    maxAmountRejection('USDC'),
  );
});

test('signs a USDC payment above the $1 cap because the handler disables the spend controls', async () => {
  const challenge = makeChallenge({
    asset: HEDERA_TESTNET_USDC,
    amount: USDC_AMOUNT_ABOVE_CAP,
  });

  const { output, kms } = await signChallenge(challenge);

  expect(output.paymentSignatureHeader.length).toBeGreaterThan(0);
  expect(output.asset).toBe(HEDERA_TESTNET_USDC);
  expect(output.amount).toBe(USDC_AMOUNT_ABOVE_CAP);
  expect(kms.signTransaction).toHaveBeenCalledTimes(1);
});

test('rejects an HBAR payment above the $1 cap when HBAR is a default asset and the spend controls stay enabled', async () => {
  keepSpendControlsEnabled();
  withHbarAsDefaultAsset();

  const challenge = makeChallenge({ amount: HBAR_AMOUNT_ABOVE_CAP });

  await expect(signChallenge(challenge)).rejects.toThrow(
    maxAmountRejection('HBAR'),
  );
});

test('accepts an HBAR payment of exactly $1 when HBAR is a default asset and the spend controls stay enabled', async () => {
  keepSpendControlsEnabled();
  withHbarAsDefaultAsset();

  const { output, kms } = await signChallenge(
    makeChallenge({ amount: HBAR_AMOUNT_AT_CAP }),
  );

  expect(output.paymentSignatureHeader.length).toBeGreaterThan(0);
  expect(output.amount).toBe(HBAR_AMOUNT_AT_CAP);
  expect(kms.signTransaction).toHaveBeenCalledTimes(1);
});

test('never leaks a private key into the output', async () => {
  const { raw } = await signChallenge(makeChallenge());
  const serialized = JSON.stringify(raw);

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
