import type {
  FaucetDisbursementParams,
  FaucetDisbursementResult,
} from './faucet-disbursement.service.types';

export interface FaucetDisbursementService {
  disburse(params: FaucetDisbursementParams): Promise<FaucetDisbursementResult>;
}
