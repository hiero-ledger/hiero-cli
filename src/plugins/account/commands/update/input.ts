import { z } from 'zod';

import {
  AccountReferenceSchema,
  AutoRenewPeriodSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MaxAutoAssociationsSchema,
  MemoSchema,
  NodeIdSchema,
} from '@/core/schemas';

const UPDATE_FIELDS = [
  'key',
  'memo',
  'maxAutoAssociations',
  'stakedAccountId',
  'stakedNodeId',
  'declineStakingReward',
  'autoRenewPeriod',
  'receiverSignatureRequired',
] as const;

export const AccountUpdateInputSchema = z
  .object({
    account: AccountReferenceSchema.describe(
      'Account ID or alias of the account to update',
    ),
    key: KeySchema.optional().describe(
      'New key for the account (private/public key, key reference, or alias). Requires private key in KMS.',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager to use: local or local_encrypted (defaults to config setting)',
    ),
    memo: z
      .preprocess(
        (v) => (v === 'null' || v === '' ? null : v),
        MemoSchema.nullable().optional(),
      )
      .describe('Account memo (max 100 characters). Pass "null" to clear.'),
    maxAutoAssociations: MaxAutoAssociationsSchema,
    stakedAccountId: z
      .preprocess(
        (v) => (v === 'null' ? null : v),
        EntityIdSchema.nullable().optional(),
      )
      .describe('Account ID to stake to. Pass "null" to clear.'),
    stakedNodeId: z
      .preprocess(
        (v) => (v === 'null' ? null : v),
        NodeIdSchema.nullable().optional(),
      )
      .describe('Node ID to stake to. Pass "null" to clear.'),
    declineStakingReward: z
      .boolean()
      .optional()
      .describe('Decline staking reward'),
    autoRenewPeriod: AutoRenewPeriodSchema,
    receiverSignatureRequired: z
      .boolean()
      .optional()
      .describe('Require receiver signature for transfers'),
  })
  .superRefine((data, ctx) => {
    const stakedAccountSet =
      data.stakedAccountId !== null && data.stakedAccountId !== undefined;
    const stakedNodeSet =
      data.stakedNodeId !== null && data.stakedNodeId !== undefined;

    if (stakedAccountSet && stakedNodeSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot specify both --staked-account-id and --staked-node-id',
        path: ['stakedNodeId'],
      });
    }

    const hasUpdateField = UPDATE_FIELDS.some(
      (field) => data[field] !== undefined,
    );
    if (!hasUpdateField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'At least one field to update must be provided (key, memo, max-auto-associations, staked-account-id, staked-node-id, decline-staking-reward, auto-renew-period, receiver-signature-required)',
        path: [],
      });
    }
  });

export type AccountUpdateInput = z.infer<typeof AccountUpdateInputSchema>;
