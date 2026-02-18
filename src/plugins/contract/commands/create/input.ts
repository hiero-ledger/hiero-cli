import { z } from 'zod';

import {
  AliasNameSchema,
  FilePathSchema,
  GasInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
  MemoSchema,
  SolidityCompilerVersion,
} from '@/core/schemas';

/**
 * Input schema for plugin-management add command
 * Validates arguments for adding a plugin from filesystem path
 */
export const ContractCreateSchema = z
  .object({
    name: AliasNameSchema.describe('Optional name/alias for the contract'),
    file: FilePathSchema.describe(
      'Filesystem path to Solidity file containing smart contract definition',
    ),
    gas: GasInputSchema.default(1000000).describe(
      'Gas for contract creation. Default: 1000000',
    ),
    basePath: FilePathSchema.optional().describe(
      'Base path to main directory of smart contract path',
    ),
    adminKey: KeySchema.optional().describe(
      'Admin key as account ID with private key in {accountId}:{private_key} format, account public key, account private key, account ID, account name/alias or account key reference.',
    ),
    memo: MemoSchema.describe(
      'Optional memo for the contract (max 100 characters)',
    ),
    solidityVersion: SolidityCompilerVersion,
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
    solidityVersion: data.solidityVersion,
    constructorParameters: data.constructorParameter,
    keyManager: data.keyManager,
  }));
