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
import { DefaultTemplateSchema } from '@/plugins/contract/utils/contract-file-helpers';

export const ContractCreateSchema = z
  .object({
    name: AliasNameSchema.describe('Optional name/alias for the contract'),
    file: FilePathSchema.optional().describe(
      'Filesystem path to Solidity file containing smart contract definition',
    ),
    default: DefaultTemplateSchema.optional().describe(
      'Use built-in contract template: erc20 or erc721',
    ),
    gas: GasInputSchema.default(2000000).describe(
      'Gas for contract creation. Default: 2000000',
    ),
    basePath: FilePathSchema.optional().describe(
      'Base path to main directory of smart contract path',
    ),
    adminKey: KeySchema.optional().describe(
      'Admin key as account ID with private key in {accountId}:{private_key} format, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, account ID, account name/alias or account key reference.',
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
  .refine((data) => (data.file ? !data.default : !!data.default), {
    message: 'Either --file or --default must be provided, but not both',
  })
  .transform((data) => ({
    name: data.name,
    file: data.file,
    defaultTemplate: data.default,
    gas: data.gas,
    basePath: data.basePath,
    adminKey: data.adminKey,
    memo: data.memo,
    solidityVersion: data.solidityVersion,
    constructorParameters: data.constructorParameter,
    keyManager: data.keyManager,
  }));
