import { ValidationError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';

const CAIP2_TO_NETWORK: Record<string, SupportedNetwork> = {
  'hedera:mainnet': SupportedNetwork.MAINNET,
  'hedera:testnet': SupportedNetwork.TESTNET,
};

export function caip2ToSupportedNetwork(caip2: string): SupportedNetwork {
  const network = CAIP2_TO_NETWORK[caip2];
  if (!network) {
    throw new ValidationError(
      `Unsupported x402 network "${caip2}". Only hedera:mainnet and hedera:testnet are supported.`,
      { context: { network: caip2 } },
    );
  }
  return network;
}
