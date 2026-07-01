import type {
  CreateSignerParams,
  KmsClientSigner,
} from './payment-signer.types';

export interface PaymentSignerService {
  createSigner(params: CreateSignerParams): KmsClientSigner;
}
