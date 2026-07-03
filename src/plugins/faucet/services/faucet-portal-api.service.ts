import type { FaucetPortalApiService } from './faucet-portal-api.service.interface';
import type {
  FaucetRequestFundsParams,
  FaucetRequestFundsResult,
} from './faucet-portal-api.service.types';

import { AuthorizationError } from '@/core/errors/authorization-error';
import { NetworkError } from '@/core/errors/network-error';
import { ValidationError } from '@/core/errors/validation-error';
import { parseWithSchema } from '@/core/shared/validation/parse-with-schema.zod';
import { FAUCET_API_URL, PAT_DOCS_URL } from '@/plugins/faucet/constants';

import { FaucetRequestFundsResultSchema } from './faucet-portal-api.service.types';

export class FaucetPortalApiServiceImpl implements FaucetPortalApiService {
  async requestFunds(
    params: FaucetRequestFundsParams,
  ): Promise<FaucetRequestFundsResult> {
    const { pat, address, amount, network } = params;

    const response = await fetch(FAUCET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pat}`,
      },
      body: JSON.stringify({ address, amount, network }),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, address, network);
    }

    return parseWithSchema(
      FaucetRequestFundsResultSchema,
      await response.json(),
      'Faucet API POST /api/disbursement/cli',
    );
  }

  private async handleErrorResponse(
    response: Response,
    address: string,
    network: string,
  ): Promise<never> {
    const body = await response.json().catch(() => ({ message: undefined }));
    const message = (body as { message?: string }).message;

    if (response.status === 403) {
      throw new AuthorizationError(
        `PAT authentication failed. Verify your token is valid.\nTo generate a new PAT, visit: ${PAT_DOCS_URL}`,
      );
    }

    if (response.status === 422) {
      throw new ValidationError(
        `Recipient ${address} is not fundable. Ensure the account exists on ${network}.`,
      );
    }

    if (response.status === 429) {
      throw new NetworkError(
        `Daily faucet quota exhausted. You can request up to 100 HBAR per 24 hours.`,
        { recoverable: false },
      );
    }

    throw new NetworkError(
      `Faucet API error (${response.status})${message ? `: ${message}` : ''}`,
    );
  }
}
