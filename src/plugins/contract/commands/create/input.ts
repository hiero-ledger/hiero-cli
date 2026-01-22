import { z } from 'zod';

import {
  AliasNameSchema,
  FilePathSchema,
  KeyManagerTypeSchema,
  KeyOrAccountAliasSchema,
  MemoSchema,
} from '@/core/schemas';

/**
 * Input schema for plugin-management add command
 * Validates arguments for adding a plugin from filesystem path
 */
export const CreateContractSchema = z
  .object({
    name: AliasNameSchema.describe('Optional name/alias for the contract'),
    file: FilePathSchema.describe(
      'Filesystem path to Solidity file containing smart contract definition',
    ),
    gas: z
      .number()
      .min(0)
      .default(1000000)
      .describe('Gas for contract creation. Default: 1000000'),
    basePath: FilePathSchema.describe(
      'Base path to main directory of smart contract path',
    ),
    adminKey: KeyOrAccountAliasSchema.optional().describe(
      'Admin key as account name or {accountId}:{private_key} format.',
    ),
    memo: MemoSchema.describe(
      'Optional memo for the contract (max 100 characters)',
    ),
    constructorParameter: z
      .array(z.string())
      .optional()
      .default([])
      .describe('Parameters that are out inside smart contract constructor'),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type for storing private keys (defaults to config setting)',
    ),
  })
  .transform((data) => ({
    name: data.name,
    file: data.file,
    gas: data.gas,
    basePath: data.basePath,
    adminKey: data.adminKey,
    memo: data.memo,
    constructorParameters: data.constructorParameter,
    keyManager: data.keyManager,
  }));

export type CreateContractInput = z.infer<typeof CreateContractSchema>;
