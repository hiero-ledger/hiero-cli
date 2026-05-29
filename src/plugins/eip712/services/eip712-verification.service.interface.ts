import type { Eip712VerifyOutput } from '@/plugins/eip712/commands/verify/output';
import type {
  VerifyEcdsaParams,
  VerifyEd25519Params,
} from '@/plugins/eip712/services/eip712-verification.types';

export interface Eip712VerificationService {
  verifyEcdsa(params: VerifyEcdsaParams): Promise<Eip712VerifyOutput>;
  verifyEd25519(params: VerifyEd25519Params): Promise<Eip712VerifyOutput>;
}
