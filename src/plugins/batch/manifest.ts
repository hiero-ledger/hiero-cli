/**
 * Batch Plugin Manifest
 * Defines the batch plugin for CSV-driven bulk operations on the Hedera network.
 *
 * Commands:
 *   batch transfer-hbar  — Batch HBAR transfers from CSV
 *   batch transfer-ft    — Batch fungible token transfers from CSV
 *   batch mint-nft       — Batch NFT mints from CSV
 *   batch airdrop        — Batch airdrop tokens from CSV (auto-handles association)
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType } from '@/core/types/shared.types';

import {
  BATCH_AIRDROP_TEMPLATE,
  batchAirdrop,
  BatchAirdropOutputSchema,
} from './commands/airdrop';
import {
  BATCH_MINT_NFT_TEMPLATE,
  batchMintNft,
  BatchMintNftOutputSchema,
} from './commands/mint-nft';
import {
  BATCH_TRANSFER_FT_TEMPLATE,
  batchTransferFt,
  BatchTransferFtOutputSchema,
} from './commands/transfer-ft';
import {
  BATCH_TRANSFER_HBAR_TEMPLATE,
  batchTransferHbar,
  BatchTransferHbarOutputSchema,
} from './commands/transfer-hbar';

export const batchPluginManifest: PluginManifest = {
  name: 'batch',
  version: '1.0.0',
  displayName: 'Batch Operations Plugin',
  description:
    'CSV-driven bulk operations: transfers, mints, and distributions on the Hedera network',
  commands: [
    {
      name: 'transfer-hbar',
      summary: 'Batch transfer HBAR from a CSV file',
      description:
        'Read a CSV file with columns "to" and "amount", then execute HBAR transfers sequentially. ' +
        'Outputs a results report with transaction links. Use --dry-run to validate without executing.',
      options: [
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Path to CSV file. Required columns: to, amount. Optional: memo',
        },
        {
          name: 'from',
          short: 'F',
          type: OptionType.STRING,
          required: false,
          description:
            'Source account: alias or AccountID:privateKey pair (defaults to operator)',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Default memo applied to all transfers (overridden by per-row memo in CSV)',
        },
        {
          name: 'dry-run',
          short: 'd',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Validate CSV and resolve accounts without executing transactions',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: batchTransferHbar,
      output: {
        schema: BatchTransferHbarOutputSchema,
        humanTemplate: BATCH_TRANSFER_HBAR_TEMPLATE,
      },
    },
    {
      name: 'transfer-ft',
      summary: 'Batch transfer fungible tokens from a CSV file',
      description:
        'Read a CSV file with columns "to" and "amount", then transfer a specified fungible token ' +
        'to each recipient. Outputs a results report with transaction links. Use --dry-run to validate.',
      options: [
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description: 'Path to CSV file. Required columns: to, amount',
        },
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token to transfer: either a token alias or token-id',
        },
        {
          name: 'from',
          short: 'F',
          type: OptionType.STRING,
          required: false,
          description:
            'Source account: alias or AccountID:privateKey pair (defaults to operator)',
        },
        {
          name: 'dry-run',
          short: 'd',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Validate CSV and resolve accounts without executing transactions',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: batchTransferFt,
      output: {
        schema: BatchTransferFtOutputSchema,
        humanTemplate: BATCH_TRANSFER_FT_TEMPLATE,
      },
    },
    {
      name: 'mint-nft',
      summary: 'Batch mint NFTs from a CSV file',
      description:
        'Read a CSV file with column "metadata", then mint NFTs to an existing collection. ' +
        'Each row becomes one NFT with the given metadata string (max 100 bytes). ' +
        'Outputs serial numbers and transaction links. Use --dry-run to validate.',
      options: [
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description: 'Path to CSV file. Required column: metadata',
        },
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'NFT token collection: either a token alias or token-id',
        },
        {
          name: 'supply-key',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Supply key as account name or {accountId}:{private_key} format',
        },
        {
          name: 'dry-run',
          short: 'd',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Validate CSV and verify token/supply key without executing transactions',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: batchMintNft,
      output: {
        schema: BatchMintNftOutputSchema,
        humanTemplate: BATCH_MINT_NFT_TEMPLATE,
      },
    },
    {
      name: 'airdrop',
      summary: 'Batch airdrop fungible tokens from a CSV file',
      description:
        'Read a CSV file with columns "to" and "amount", then airdrop a fungible token ' +
        "using Hedera's native TokenAirdropTransaction. Unlike transfer-ft, airdrop " +
        'auto-handles association: recipients do NOT need to pre-associate with the token. ' +
        'Only the sender signs. Use --dry-run to validate.',
      options: [
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description: 'Path to CSV file. Required columns: to, amount',
        },
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token to airdrop: either a token alias or token-id',
        },
        {
          name: 'from',
          short: 'F',
          type: OptionType.STRING,
          required: false,
          description:
            'Source account: alias or AccountID:privateKey pair (defaults to operator)',
        },
        {
          name: 'dry-run',
          short: 'd',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Validate CSV and resolve accounts without executing transactions',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: batchAirdrop,
      output: {
        schema: BatchAirdropOutputSchema,
        humanTemplate: BATCH_AIRDROP_TEMPLATE,
      },
    },
  ],
};

export default batchPluginManifest;
