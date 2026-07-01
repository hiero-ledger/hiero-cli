import type { ClientHederaSigner } from '@x402/hedera';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface BuiltTransferContext {
  transactionId: string;
  payer: string;
  payTo: string;
  amount: string;
  asset: string;
  feePayer: string;
  network: SupportedNetwork;
}

export interface KmsClientSigner {
  signer: ClientHederaSigner;
  getBuiltContext(): BuiltTransferContext;
}

export interface CreateSignerParams {
  keyRefId: string;
  accountId: string;
  network: SupportedNetwork;
}
