import type {
  SmartContractVerifyApiErrorResponse,
  SmartContractVerifyApiOkResponse,
} from './types';

import { z } from 'zod';

const verifyResultItemSchema = z.object({
  address: z.string(),
  chainId: z.string(),
  status: z.string(),
  message: z.string(),
  libraryMap: z.record(z.string(), z.unknown()),
});

export const SmartContractVerifyApiOkResponseSchema: z.ZodType<SmartContractVerifyApiOkResponse> =
  z.object({
    result: z.array(verifyResultItemSchema).min(1),
  });

export const SmartContractVerifyApiErrorResponseSchema: z.ZodType<SmartContractVerifyApiErrorResponse> =
  z.object({
    error: z.string(),
  });
