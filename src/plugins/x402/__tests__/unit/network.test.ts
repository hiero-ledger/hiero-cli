import { ValidationError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { caip2ToSupportedNetwork } from '@/plugins/x402/utils/network';

test('maps hedera:mainnet to MAINNET', () => {
  expect(caip2ToSupportedNetwork('hedera:mainnet')).toBe(
    SupportedNetwork.MAINNET,
  );
});

test('maps hedera:testnet to TESTNET', () => {
  expect(caip2ToSupportedNetwork('hedera:testnet')).toBe(
    SupportedNetwork.TESTNET,
  );
});

test.each(['hedera:previewnet', 'hedera:localnet', 'eip155:1', 'garbage'])(
  'rejects unsupported network %s',
  (network) => {
    expect(() => caip2ToSupportedNetwork(network)).toThrow(ValidationError);
  },
);
