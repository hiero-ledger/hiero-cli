import { z } from 'zod';

import {
  AccountReferenceSchema,
  ContractReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const ContractDeleteInputSchema = z
  .object({
    contract: ContractReferenceSchema.describe(
      'Contract ID (0.0.xxx) or alias',
    ),
    stateOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Remove only from local CLI state; do not submit ContractDeleteTransaction',
      ),
    transferId: AccountReferenceSchema.optional().describe(
      'Account ID or alias as the network delete transfer target (required for network delete unless --state-only)',
    ),
    transferContractId: ContractReferenceSchema.optional().describe(
      'Contract ID or alias as the network delete transfer target; alternative to --transfer-id',
    ),
    adminKey: KeySchema.optional().describe(
      'Contract admin key for signing the delete (same formats as contract create). Use when this CLI cannot sign with a key it already has for that contract',
    ),
    keyManager: KeyManagerTypeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      !data.stateOnly &&
      data.transferId === undefined &&
      data.transferContractId === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'When deleting on Hedera, pass --transfer-id (-t) or --transfer-contract-id (-r) (required unless --state-only)',
        path: ['transferId'],
      });
    }
    if (
      data.stateOnly &&
      (data.transferId !== undefined || data.transferContractId !== undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Do not use --transfer-id or --transfer-contract-id with --state-only',
        path: ['transferId'],
      });
    }
    if (
      data.transferId !== undefined &&
      data.transferContractId !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Use either transfer-id or transfer-contract-id, not both',
        path: ['transferContractId'],
      });
    }
    if (data.stateOnly && data.adminKey !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'admin-key cannot be used with --state-only',
        path: ['adminKey'],
      });
    }
  });

export type ContractDeleteInput = z.infer<typeof ContractDeleteInputSchema>;
