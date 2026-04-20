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
        'Remove only from local CLI state; do not delete the contract on Hedera',
      ),
    transferId: AccountReferenceSchema.optional().describe(
      'Account ID or alias as the network delete transfer target (required for network delete unless --state-only)',
    ),
    transferContractId: ContractReferenceSchema.optional().describe(
      'Contract ID or alias as the network delete transfer target; alternative to --transfer-id',
    ),
    adminKey: z
      .array(KeySchema)
      .optional()
      .default([])
      .describe(
        'Optional contract admin credential(s) for signing the network delete. When omitted, the CLI derives the admin key from the mirror node and uses KMS keys that match those public keys (including M-of-N). When provided, these credentials are used as-is; if a credential is invalid, the command fails. Pass multiple times if multiple credentials are needed. Each value may be: account ID with private key in {accountId}:{private_key} format; account public key in {ed25519|ecdsa}:public:{public-key} format; account private key in {ed25519|ecdsa}:private:{private-key} format; account ID; account name/alias; or account key reference.',
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
    if (data.stateOnly && data.adminKey.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'admin-key cannot be used with --state-only',
        path: ['adminKey'],
      });
    }
  });

export type ContractDeleteInput = z.infer<typeof ContractDeleteInputSchema>;
