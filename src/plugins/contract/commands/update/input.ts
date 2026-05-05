import { z } from 'zod';

import {
  AccountReferenceSchema,
  AutoRenewPeriodSecondsSchema,
  ContractReferenceObjectSchema,
  EntityIdSchema,
  IsoTimestampSchema,
  KeyManagerTypeSchema,
  KeyThresholdOptionalSchema,
  MaxAutoAssociationsSchema,
  MemoSchema,
  NodeIdSchema,
  NullLiteralSchema,
  OptionalDefaultEmptyKeyListSchema,
} from '@/core/schemas';
import { NULL_TOKEN } from '@/core/shared/constants';

const UPDATE_FIELDS = [
  'newAdminKey',
  'memo',
  'autoRenewPeriod',
  'autoRenewAccountId',
  'maxAutomaticTokenAssociations',
  'stakedAccountId',
  'stakedNodeId',
  'declineStakingReward',
  'expirationTime',
] as const;

export const ContractUpdateInputSchema = z
  .object({
    contract: ContractReferenceObjectSchema.describe(
      'Contract ID (0.0.xxx), alias or evm address of the contract to update',
    ),
    adminKey: OptionalDefaultEmptyKeyListSchema.describe(
      'Current contract admin credential(s) used to sign the update. Pass multiple times for multiple keys. Each value may be: account ID with private key in {accountId}:{private_key} format; account public key in {ed25519|ecdsa}:public:{public-key} format; account private key in {ed25519|ecdsa}:private:{private-key} format; account ID; account name/alias; or account key reference.',
    ),
    newAdminKey: OptionalDefaultEmptyKeyListSchema.describe(
      'New Admin key(s). Pass multiple times for multiple keys. Each value may be: account ID with private key in {accountId}:{private_key} format; account public key in {ed25519|ecdsa}:public:{public-key} format; account private key in {ed25519|ecdsa}:private:{private-key} format; account ID; account name',
    ),
    newAdminKeyThreshold: KeyThresholdOptionalSchema.describe(
      'Number of admin keys required to sign (M-of-N)',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager to use: local or local_encrypted (defaults to config setting)',
    ),
    memo: z
      .preprocess(
        (v) => (v === NULL_TOKEN || v === '' ? null : v),
        MemoSchema.nullable().optional(),
      )
      .describe(
        'Contract memo (max 100 characters). Pass "null" or "" to clear.',
      ),
    autoRenewPeriod: AutoRenewPeriodSecondsSchema.describe(
      'Auto-renew period: integer seconds, or with suffix s/m/h/d (e.g. 500, 500s, 50m, 2h, 30d)',
    ),
    autoRenewAccountId: AccountReferenceSchema.or(NullLiteralSchema)
      .optional()
      .describe(
        'Account ID (0.0.xxx) that will pay for auto-renewal. Pass "null" to clear.',
      ),
    maxAutomaticTokenAssociations: MaxAutoAssociationsSchema,
    stakedAccountId: EntityIdSchema.optional().describe(
      'Account ID (0.0.xxx) to stake this contract to. Mutually exclusive with --staked-node-id.',
    ),
    stakedNodeId: NodeIdSchema.describe(
      'Node ID to stake this contract to. Mutually exclusive with --staked-account-id.',
    ),
    declineStakingReward: z
      .boolean()
      .optional()
      .describe('Decline staking reward'),
    expirationTime: IsoTimestampSchema.optional().describe(
      'Expiration time as ISO datetime string',
    ),
  })
  .superRefine((data, ctx) => {
    if (data.stakedAccountId !== undefined && data.stakedNodeId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot specify both --staked-account-id and --staked-node-id',
        path: ['stakedNodeId'],
      });
    }

    const hasUpdateField = UPDATE_FIELDS.some((field) => {
      const value = (data as Record<string, unknown>)[field];
      return Array.isArray(value) ? value.length > 0 : value !== undefined;
    });
    if (!hasUpdateField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'At least one field to update must be provided (new-admin-key, memo, auto-renew-period, auto-renew-account-id, max-automatic-token-associations, staked-account-id, staked-node-id, decline-staking-reward, expiration-time)',
        path: [],
      });
    }
  });

export type ContractUpdateInput = z.infer<typeof ContractUpdateInputSchema>;
