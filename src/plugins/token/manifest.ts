/**
 * Token Plugin Manifest
 * Defines the token plugin according to ADR-001
 * Updated for ADR-003 compliance with output specifications
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { SupplyType } from '@/core/types/shared.types';
import {
  CREATE_NFT_TEMPLATE,
  createNft,
  CreateNftOutputSchema,
} from '@/plugins/token/commands/create-nft';

import {
  ASSOCIATE_TOKEN_TEMPLATE,
  associateToken,
  AssociateTokenOutputSchema,
} from './commands/associate';
import {
  CREATE_FUNGIBLE_TOKEN_TEMPLATE,
  CreateFungibleTokenOutputSchema,
  createToken,
} from './commands/create-ft';
import {
  CREATE_FUNGIBLE_TOKEN_FROM_FILE_TEMPLATE,
  CreateFungibleTokenFromFileOutputSchema,
  createTokenFromFile,
} from './commands/create-ft-from-file';
import {
  CREATE_NFT_FROM_FILE_TEMPLATE,
  createNftFromFile,
  CreateNftFromFileOutputSchema,
} from './commands/create-nft-from-file';
import {
  LIST_TOKENS_TEMPLATE,
  listTokens,
  ListTokensOutputSchema,
} from './commands/list';
import {
  MINT_FT_TEMPLATE,
  mintFt,
  MintFtOutputSchema,
} from './commands/mint-ft';
import {
  MINT_NFT_TEMPLATE,
  mintNft,
  MintNftOutputSchema,
} from './commands/mint-nft';
import {
  TRANSFER_FUNGIBLE_TOKEN_TEMPLATE,
  TransferFungibleTokenOutputSchema,
  transferToken,
} from './commands/transfer-ft';
import {
  TRANSFER_NFT_TEMPLATE,
  transferNft,
  TransferNftOutputSchema,
} from './commands/transfer-nft';
import {
  VIEW_TOKEN_TEMPLATE,
  viewToken,
  ViewTokenOutputSchema,
} from './commands/view';

export const TOKEN_NAMESPACE = 'token-tokens';

export const tokenPluginManifest: PluginManifest = {
  name: 'token',
  version: '1.0.0',
  displayName: 'Token Plugin',
  description: 'Plugin for managing Hedera fungible and non-fungible tokens',
  commands: [
    {
      name: 'mint-ft',
      summary: 'Mint fungible tokens',
      description: 'Mint additional fungible tokens to increase supply.',
      options: [
        {
          name: 'token',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'amount',
          short: 'a',
          type: 'string',
          required: true,
          description:
            'Amount to mint. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "100t")',
        },
        {
          name: 'supply-key',
          short: 's',
          type: 'string',
          required: true,
          description:
            'Supply key as account name or {accountId}:{private_key} format',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: mintFt,
      output: {
        schema: MintFtOutputSchema,
        humanTemplate: MINT_FT_TEMPLATE,
      },
    },
    {
      name: 'mint-nft',
      summary: 'Mint NFT',
      description: 'Mint a new NFT to an existing NFT collection.',
      options: [
        {
          name: 'token',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'metadata',
          short: 'm',
          type: 'string',
          required: true,
          description: 'NFT metadata (string, max 100 bytes)',
        },
        {
          name: 'supply-key',
          short: 's',
          type: 'string',
          required: true,
          description:
            'Supply key as account name or {accountId}:{private_key} format',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: mintNft,
      output: {
        schema: MintNftOutputSchema,
        humanTemplate: MINT_NFT_TEMPLATE,
      },
    },
    {
      name: 'transfer-ft',
      summary: 'Transfer a fungible token',
      description: 'Transfer a fungible token from one account to another',
      options: [
        {
          name: 'token',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Fungible token: either a token alias or token-id',
        },
        {
          name: 'to',
          short: 't',
          type: 'string',
          required: true,
          description: 'Destination account: either an alias or account-id',
        },
        {
          name: 'from',
          short: 'f',
          type: 'string',
          required: false,
          description:
            'Source account: either a stored alias or account-id:private-key or account-id:key-type:private-key pair',
        },
        {
          name: 'amount',
          short: 'a',
          type: 'string',
          required: true,
          description:
            'Amount to transfer. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "100t")',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: transferToken,
      output: {
        schema: TransferFungibleTokenOutputSchema,
        humanTemplate: TRANSFER_FUNGIBLE_TOKEN_TEMPLATE,
      },
    },
    {
      name: 'transfer-nft',
      summary: 'Transfer a non-fungible token',
      description: 'Transfer one or more NFTs from one account to another',
      options: [
        {
          name: 'token',
          short: 'T',
          type: 'string',
          required: true,
          description: 'NFT token: either a token alias or token-id',
        },
        {
          name: 'to',
          short: 't',
          type: 'string',
          required: true,
          description: 'Destination account: either an alias or account-id',
        },
        {
          name: 'from',
          short: 'f',
          type: 'string',
          required: false,
          description:
            'Source account: either a stored alias or account-id:private-key pair',
        },
        {
          name: 'serials',
          short: 's',
          type: 'string',
          required: true,
          description:
            'NFT serial numbers to transfer (comma-separated list, e.g., "1,2,3")',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: transferNft,
      output: {
        schema: TransferNftOutputSchema,
        humanTemplate: TRANSFER_NFT_TEMPLATE,
      },
    },
    {
      name: 'create-ft',
      summary: 'Create a new fungible token',
      description: 'Create a new fungible token with specified properties',
      options: [
        {
          name: 'token-name',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Fungible token name. Option required.',
        },
        {
          name: 'symbol',
          short: 'Y',
          type: 'string',
          required: true,
          description: 'Fungible token symbol. Option required.',
        },
        {
          name: 'treasury',
          short: 't',
          type: 'string',
          required: false,
          description:
            'Treasury account: either an alias or treasury-id:treasury-key pair',
        },
        {
          name: 'decimals',
          short: 'd',
          type: 'number',
          required: false,
          default: 0,
          description: 'Decimals for the fungible token. Default: 0',
        },
        {
          name: 'initial-supply',
          short: 'i',
          type: 'string',
          required: false,
          default: 1000000,
          description:
            'Initial supply amount. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "1000t")',
        },
        {
          name: 'supply-type',
          type: 'string',
          short: 'S',
          required: false,
          default: SupplyType.INFINITE,
          description: 'Set supply type: INFINITE(default) or FINITE',
        },
        {
          name: 'max-supply',
          short: 'm',
          type: 'string',
          required: false,
          description:
            'Maximum supply of the fungible token to be set upon creation. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "1000t")',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: 'string',
          required: false,
          description:
            'Admin key as account name or {accountId}:{private_key} format. If not set, operator key is used.',
        },
        {
          name: 'supply-key',
          short: 's',
          type: 'string',
          required: false,
          description:
            'Optional supply key as account name or {accountId}:{private_key} format.',
        },
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: false,
          description: 'Optional name to register for the fungible token',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'memo',
          short: 'M',
          type: 'string',
          required: false,
          description:
            'Optional memo for the fungible token (max 100 characters)',
        },
      ],
      handler: createToken,
      output: {
        schema: CreateFungibleTokenOutputSchema,
        humanTemplate: CREATE_FUNGIBLE_TOKEN_TEMPLATE,
      },
    },

    {
      name: 'create-nft',
      summary: 'Create a new non-fungible token',
      description: 'Create a new non-fungible token with specified properties',
      options: [
        {
          name: 'token-name',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Token name. Option required.',
        },
        {
          name: 'symbol',
          short: 'Y',
          type: 'string',
          required: true,
          description: 'Token symbol. Option required.',
        },
        {
          name: 'treasury',
          short: 't',
          type: 'string',
          required: false,
          description:
            'Treasury account: either an alias or treasury-id:treasury-key pair',
        },
        {
          name: 'supply-type',
          type: 'string',
          short: 'S',
          required: false,
          default: SupplyType.INFINITE,
          description: 'Set supply type: INFINITE(default) or FINITE',
        },
        {
          name: 'max-supply',
          short: 'm',
          type: 'string',
          required: false,
          description:
            'Maximum supply of the token to be set upon creation. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "1000t")',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: 'string',
          required: false,
          description:
            'Admin key as account name or {accountId}:{private_key} format. If not set, operator key is used.',
        },
        {
          name: 'supply-key',
          short: 's',
          type: 'string',
          required: false,
          description:
            'Supply key as account name or {accountId}:{private_key} format. If not set, operator key is used.',
        },
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: false,
          description: 'Optional name to register for the token',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'memo',
          short: 'M',
          type: 'string',
          required: false,
          description: 'Optional memo for the token (max 100 characters)',
        },
      ],
      handler: createNft,
      output: {
        schema: CreateNftOutputSchema,
        humanTemplate: CREATE_NFT_TEMPLATE,
      },
    },
    {
      name: 'associate',
      summary: 'Associate a token with an account',
      description: 'Associate a token with an account to enable transfers',
      options: [
        {
          name: 'token',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'account',
          short: 'a',
          type: 'string',
          required: true,
          description:
            'Account: either an alias or account-id:account-key pair',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: associateToken,
      output: {
        schema: AssociateTokenOutputSchema,
        humanTemplate: ASSOCIATE_TOKEN_TEMPLATE,
      },
    },
    {
      name: 'create-ft-from-file',
      summary: 'Create a new fungible token from a file',
      description:
        'Create a new fungible token from a JSON file definition with advanced features',
      options: [
        {
          name: 'file',
          short: 'f',
          type: 'string',
          required: true,
          description:
            'Fungible token definition file path (absolute or relative) to a JSON file',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: createTokenFromFile,
      output: {
        schema: CreateFungibleTokenFromFileOutputSchema,
        humanTemplate: CREATE_FUNGIBLE_TOKEN_FROM_FILE_TEMPLATE,
      },
    },
    {
      name: 'create-nft-from-file',
      summary: 'Create a new NFT token from a file',
      description:
        'Create a new non-fungible token from a JSON file definition with advanced features',
      options: [
        {
          name: 'file',
          short: 'f',
          type: 'string',
          required: true,
          description:
            'NFT token definition file path (absolute or relative) to a JSON file',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: createNftFromFile,
      output: {
        schema: CreateNftFromFileOutputSchema,
        humanTemplate: CREATE_NFT_FROM_FILE_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all tokens',
      description:
        'List all tokens (FT and NFT) stored in state for all networks',
      options: [
        {
          name: 'keys',
          short: 'k',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Show token key information (admin, supply, wipe, etc.)',
        },
      ],
      handler: listTokens,
      output: {
        schema: ListTokensOutputSchema,
        humanTemplate: LIST_TOKENS_TEMPLATE,
      },
    },
    {
      name: 'view',
      summary: 'View token information',
      description:
        'View detailed information about fungible or non-fungible tokens',
      options: [
        {
          name: 'token',
          short: 'T',
          type: 'string',
          required: true,
          description: 'Token identifier: either a token alias or token-id',
        },
        {
          name: 'serial',
          short: 'S',
          type: 'string',
          required: false,
          description: 'Serial number of a specific NFT instance',
        },
      ],
      handler: viewToken,
      output: {
        schema: ViewTokenOutputSchema,
        humanTemplate: VIEW_TOKEN_TEMPLATE,
      },
    },
  ],
};

export default tokenPluginManifest;
