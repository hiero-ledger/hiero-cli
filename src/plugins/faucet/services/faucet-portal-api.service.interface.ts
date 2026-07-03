import type {
  FaucetRequestFundsParams,
  FaucetRequestFundsResult,
} from './faucet-portal-api.service.types';

export interface FaucetPortalApiService {
  requestFunds(
    params: FaucetRequestFundsParams,
  ): Promise<FaucetRequestFundsResult>;
}
