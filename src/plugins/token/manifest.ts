/**
 * Token Plugin Manifest
 * Defines the token plugin according to ADR-001
 * Updated for ADR-003 compliance with output specifications
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import { OptionType, SupplyType } from '@/core/types/shared.types';
import {
  TOKEN_CREATE_NFT_TEMPLATE,
  tokenCreateNft,
  TokenCreateNftOutputSchema,
} from '@/plugins/token/commands/create-nft';

import {
  TOKEN_AIRDROP_FT_TEMPLATE,
  tokenAirdropFt,
  TokenAirdropFtOutputSchema,
} from './commands/airdrop-ft';
import {
  TOKEN_AIRDROP_NFT_TEMPLATE,
  tokenAirdropNft,
  TokenAirdropNftOutputSchema,
} from './commands/airdrop-nft';
import {
  TOKEN_ALLOWANCE_FT_TEMPLATE,
  tokenAllowanceFt,
  TokenAllowanceFtOutputSchema,
} from './commands/allowance-ft';
import {
  TOKEN_ALLOWANCE_NFT_TEMPLATE,
  tokenAllowanceNft,
  TokenAllowanceNftOutputSchema,
} from './commands/allowance-nft';
import {
  TOKEN_ASSOCIATE_TEMPLATE,
  tokenAssociate,
  TokenAssociateOutputSchema,
} from './commands/associate';
import {
  TOKEN_CREATE_FT_TEMPLATE,
  tokenCreateFt,
  TokenCreateFtOutputSchema,
} from './commands/create-ft';
import {
  TOKEN_CREATE_FT_FROM_FILE_TEMPLATE,
  tokenCreateFtFromFile,
  TokenCreateFtFromFileOutputSchema,
} from './commands/create-ft-from-file';
import {
  TOKEN_CREATE_NFT_FROM_FILE_TEMPLATE,
  tokenCreateNftFromFile,
  TokenCreateNftFromFileOutputSchema,
} from './commands/create-nft-from-file';
import {
  TOKEN_DELETE_TEMPLATE,
  tokenDelete,
  TokenDeleteOutputSchema,
} from './commands/delete';
import {
  TOKEN_DELETE_ALLOWANCE_NFT_TEMPLATE,
  tokenDeleteAllowanceNft,
  TokenDeleteAllowanceNftOutputSchema,
} from './commands/delete-allowance-nft';
import {
  TOKEN_IMPORT_TEMPLATE,
  tokenImport,
  TokenImportOutputSchema,
} from './commands/import';
import {
  TOKEN_LIST_TEMPLATE,
  tokenList,
  TokenListOutputSchema,
} from './commands/list';
import {
  TOKEN_MINT_FT_TEMPLATE,
  tokenMintFt,
  TokenMintFtOutputSchema,
} from './commands/mint-ft';
import {
  TOKEN_MINT_NFT_TEMPLATE,
  tokenMintNft,
  TokenMintNftOutputSchema,
} from './commands/mint-nft';
import {
  TOKEN_PENDING_AIRDROPS_TEMPLATE,
  tokenPendingAirdrops,
  TokenPendingAirdropsOutputSchema,
} from './commands/pending-airdrops';
import {
  TOKEN_TRANSFER_FT_TEMPLATE,
  tokenTransferFt,
  TokenTransferFtOutputSchema,
} from './commands/transfer-ft';
import {
  TOKEN_TRANSFER_NFT_TEMPLATE,
  tokenTransferNft,
  TokenTransferNftOutputSchema,
} from './commands/transfer-nft';
import {
  TOKEN_VIEW_TEMPLATE,
  tokenView,
  TokenViewOutputSchema,
} from './commands/view';
import { TokenAssociateStateHook } from './hooks/token-associate-state';
import { TokenCreateFtFromFileStateHook } from './hooks/token-create-ft-from-file-state';
import { TokenCreateFtStateHook } from './hooks/token-create-ft-state';
import { TokenCreateNftFromFileStateHook } from './hooks/token-create-nft-from-file-state';
import { TokenCreateNftStateHook } from './hooks/token-create-nft-state';
import { TokenDeleteStateHook } from './hooks/token-delete-state';

export const tokenPluginManifest: PluginManifest = {
  name: 'token',
  version: '1.0.0',
  displayName: 'Token Plugin',
  description: 'Plugin for managing Hedera fungible and non-fungible tokens',
  hooks: [
    {
      name: 'token-create-ft-state',
      hook: new TokenCreateFtStateHook(),
      options: [],
    },
    {
      name: 'token-create-ft-from-file-state',
      hook: new TokenCreateFtFromFileStateHook(),
      options: [],
    },
    {
      name: 'token-create-nft-state',
      hook: new TokenCreateNftStateHook(),
      options: [],
    },
    {
      name: 'token-create-nft-from-file-state',
      hook: new TokenCreateNftFromFileStateHook(),
      options: [],
    },
    {
      name: 'token-associate-state',
      hook: new TokenAssociateStateHook(),
      options: [],
    },
    {
      name: 'token-delete-state',
      hook: new TokenDeleteStateHook(),
      options: [],
    },
  ],
  commands: [
    {
      name: 'mint-ft',
      summary: 'Mint fungible tokens',
      description: 'Mint additional fungible tokens to increase supply.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount to mint. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "100t")',
        },
        {
          name: 'supply-key',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Supply key. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
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
      handler: tokenMintFt,
      output: {
        schema: TokenMintFtOutputSchema,
        humanTemplate: TOKEN_MINT_FT_TEMPLATE,
      },
    },
    {
      name: 'mint-nft',
      summary: 'Mint NFT',
      description: 'Mint a new NFT to an existing NFT collection.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'metadata',
          short: 'm',
          type: OptionType.STRING,
          required: true,
          description: 'NFT metadata (string, max 100 bytes)',
        },
        {
          name: 'supply-key',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Supply key. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
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
      handler: tokenMintNft,
      output: {
        schema: TokenMintNftOutputSchema,
        humanTemplate: TOKEN_MINT_NFT_TEMPLATE,
      },
    },
    {
      name: 'transfer-ft',
      summary: 'Transfer a fungible token',
      description: 'Transfer a fungible token from one account to another',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Fungible token: either a token alias or token-id',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Destination to transfer to. Can be accountID or alias',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Account to transfer from. Can be {accountId}:{privateKey pair}, key reference or account alias. Defaults to operator.',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount to transfer. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "100t")',
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
      handler: tokenTransferFt,
      output: {
        schema: TokenTransferFtOutputSchema,
        humanTemplate: TOKEN_TRANSFER_FT_TEMPLATE,
      },
    },
    {
      name: 'airdrop-ft',
      summary: 'Airdrop fungible tokens to multiple recipients',
      description:
        'Airdrop fungible tokens from one account to one or more recipients in a single transaction. If a recipient lacks auto-association slots, the transfer becomes a pending airdrop.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Fungible token: either a token alias or token-id',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.REPEATABLE,
          required: true,
          description:
            'Destination account(s) to airdrop to. Can be accountID or alias. Pass multiple times for multiple recipients.',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.REPEATABLE,
          required: true,
          description:
            'Amount(s) to airdrop. Index-mapped to --to. Default: display units (with decimals applied). Append "t" for raw base units.',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Account to airdrop from. Can be {accountId}:{privateKey pair}, key reference or account alias. Defaults to operator.',
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
      handler: tokenAirdropFt,
      output: {
        schema: TokenAirdropFtOutputSchema,
        humanTemplate: TOKEN_AIRDROP_FT_TEMPLATE,
      },
    },
    {
      name: 'transfer-nft',
      summary: 'Transfer a non-fungible token',
      description: 'Transfer one or more NFTs from one account to another',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'NFT token: either a token alias or token-id',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Destination account. Can be accountID or alias',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Account to transfer from. Can be {accountId}:{privateKey pair}, key reference or account alias. Defaults to operator.',
        },
        {
          name: 'serials',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'NFT serial numbers to transfer (comma-separated list, e.g., "1,2,3")',
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
      handler: tokenTransferNft,
      output: {
        schema: TokenTransferNftOutputSchema,
        humanTemplate: TOKEN_TRANSFER_NFT_TEMPLATE,
      },
    },
    {
      name: 'airdrop-nft',
      summary: 'Airdrop NFTs to multiple recipients',
      description:
        'Airdrop specific NFT serial numbers from one account to one or more recipients in a single transaction. If a recipient lacks auto-association slots, the transfer becomes a pending airdrop.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'NFT token: either a token alias or token-id',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.REPEATABLE,
          required: true,
          description:
            'Destination account(s) to airdrop to. Can be accountID or alias. Pass multiple times for multiple recipients.',
        },
        {
          name: 'serials',
          short: 's',
          type: OptionType.REPEATABLE,
          required: true,
          description:
            'Serial numbers per recipient (comma-separated). Index-mapped to --to. Pass multiple times for multiple recipients.',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Account to airdrop from. Can be {accountId}:{privateKey pair}, key reference or account alias. Defaults to operator.',
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
      handler: tokenAirdropNft,
      output: {
        schema: TokenAirdropNftOutputSchema,
        humanTemplate: TOKEN_AIRDROP_NFT_TEMPLATE,
      },
    },
    {
      name: 'create-ft',
      summary: 'Create a new fungible token',
      description: 'Create a new fungible token with specified properties',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token-name',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Fungible token name',
        },
        {
          name: 'symbol',
          short: 'Y',
          type: OptionType.STRING,
          required: true,
          description: 'Fungible token symbol',
        },
        {
          name: 'treasury',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'Treasury account of token. Can be {accountId}:{privateKey} pair, key reference or account alias. Defaults to operator.',
        },
        {
          name: 'decimals',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 0,
          description: 'Decimals for the fungible token. Default: 0',
        },
        {
          name: 'initial-supply',
          short: 'i',
          type: OptionType.STRING,
          required: false,
          default: 1000000,
          description:
            'Initial supply amount. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "1000t")',
        },
        {
          name: 'supply-type',
          type: OptionType.STRING,
          short: 'S',
          required: false,
          default: SupplyType.INFINITE,
          description: 'Set supply type: INFINITE(default) or FINITE',
        },
        {
          name: 'max-supply',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Maximum supply of the fungible token to be set upon creation. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "1000t")',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional admin key. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias. Omit for a token without an admin key.',
        },
        {
          name: 'supply-key',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description:
            'Supply key of token. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'freeze-key',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional freeze key. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'freeze-default',
          short: 'F',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'When true and a freeze key is set, new token associations are frozen by default. Ignored without a freeze key (a warning is logged).',
        },
        {
          name: 'wipe-key',
          short: 'w',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional wipe key. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'kyc-key',
          short: 'y',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional KYC key. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'pause-key',
          short: 'p',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional pause key. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'fee-schedule-key',
          short: 'e',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional fee schedule key. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'metadata-key',
          short: 'D',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional metadata key. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Optional name to register for the fungible token',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'memo',
          short: 'M',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional memo for the fungible token (max 100 characters)',
        },
        {
          name: 'auto-renew-period',
          short: 'R',
          type: OptionType.STRING,
          required: false,
          description:
            'Auto-renew period: seconds as integer, or with suffix s/m/h/d (e.g. 500, 500s, 50m, 2h, 1d). Requires --auto-renew-account.',
        },
        {
          name: 'auto-renew-account',
          short: 'r',
          type: OptionType.STRING,
          required: false,
          description:
            'Account that pays auto-renewal (account id, alias, or key reference). Required when --auto-renew-period is set.',
        },
        {
          name: 'expiration-time',
          short: 'x',
          type: OptionType.STRING,
          required: false,
          description:
            'Absolute token expiration as ISO 8601 datetime. Ignored when --auto-renew-period and --auto-renew-account are set.',
        },
      ],
      handler: tokenCreateFt,
      output: {
        schema: TokenCreateFtOutputSchema,
        humanTemplate: TOKEN_CREATE_FT_TEMPLATE,
      },
    },

    {
      name: 'create-nft',
      summary: 'Create a new non-fungible token',
      description: 'Create a new non-fungible token with specified properties',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token-name',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token name',
        },
        {
          name: 'symbol',
          short: 'Y',
          type: OptionType.STRING,
          required: true,
          description: 'Token symbol',
        },
        {
          name: 'treasury',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'Treasury account of token. Can be {accountId}:{privateKey} pair, key reference or account alias. Defaults to operator.',
        },
        {
          name: 'supply-type',
          type: OptionType.STRING,
          short: 'S',
          required: false,
          default: SupplyType.INFINITE,
          description: 'Set supply type: INFINITE(default) or FINITE',
        },
        {
          name: 'max-supply',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Maximum supply of the token to be set upon creation. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "1000t")',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Admin key of token. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias. Defaults to operator key.',
        },
        {
          name: 'supply-key',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description:
            'Supply key of token. Can be {accountId}:{privateKey} pair, account ID, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'freeze-key',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Freeze key. Allows freezing token transfers for specific accounts.',
        },
        {
          name: 'wipe-key',
          short: 'w',
          type: OptionType.STRING,
          required: false,
          description:
            'Wipe key. Allows wiping token balance from specific accounts.',
        },
        {
          name: 'pause-key',
          short: 'p',
          type: OptionType.STRING,
          required: false,
          description: 'Pause key. Allows pausing all token transfers.',
        },
        {
          name: 'kyc-key',
          short: 'y',
          type: OptionType.STRING,
          required: false,
          description: 'KYC key. Allows granting/revoking KYC status.',
        },
        {
          name: 'fee-schedule-key',
          short: 'e',
          type: OptionType.STRING,
          required: false,
          description: 'Fee schedule key. Allows modifying custom fees.',
        },
        {
          name: 'metadata-key',
          short: 'D',
          type: OptionType.STRING,
          required: false,
          description: 'Metadata key. Allows updating token metadata.',
        },
        {
          name: 'freeze-default',
          short: 'F',
          type: OptionType.BOOLEAN,
          required: false,
          description:
            'Default freeze status for new token associations. Requires freeze-key.',
        },
        {
          name: 'auto-renew-period',
          short: 'R',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Auto-renew period in seconds (e.g. 7776000 for 90 days).',
        },
        {
          name: 'auto-renew-account-id',
          short: 'r',
          type: OptionType.STRING,
          required: false,
          description:
            'Account ID that pays for token auto-renewal fees (e.g. 0.0.12345).',
        },
        {
          name: 'expiration-time',
          short: 'x',
          type: OptionType.STRING,
          required: false,
          description:
            'Token expiration time in ISO 8601 format (e.g. 2027-01-01T00:00:00Z).',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Optional name to register for the token',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'memo',
          short: 'M',
          type: OptionType.STRING,
          required: false,
          description: 'Optional memo for the token (max 100 characters)',
        },
      ],
      handler: tokenCreateNft,
      output: {
        schema: TokenCreateNftOutputSchema,
        humanTemplate: TOKEN_CREATE_NFT_TEMPLATE,
      },
    },
    {
      name: 'associate',
      summary: 'Associate a token with an account',
      description: 'Associate a token with an account to enable transfers',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Account to associate. Can be {accountId}:{privateKey pair}, key reference or account alias.',
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
      handler: tokenAssociate,
      output: {
        schema: TokenAssociateOutputSchema,
        humanTemplate: TOKEN_ASSOCIATE_TEMPLATE,
      },
    },
    {
      name: 'create-ft-from-file',
      summary: 'Create a new fungible token from a file',
      description:
        'Create a new fungible token from a JSON file definition with advanced features',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Fungible token definition file path (absolute or relative) to a JSON file',
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
      handler: tokenCreateFtFromFile,
      output: {
        schema: TokenCreateFtFromFileOutputSchema,
        humanTemplate: TOKEN_CREATE_FT_FROM_FILE_TEMPLATE,
      },
    },
    {
      name: 'create-nft-from-file',
      summary: 'Create a new NFT token from a file',
      description:
        'Create a new non-fungible token from a JSON file definition with advanced features',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'scheduled', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'NFT token definition file path (absolute or relative) to a JSON file',
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
      handler: tokenCreateNftFromFile,
      output: {
        schema: TokenCreateNftFromFileOutputSchema,
        humanTemplate: TOKEN_CREATE_NFT_FROM_FILE_TEMPLATE,
      },
    },
    {
      name: 'allowance-ft',
      summary: 'Approve fungible token allowance',
      description:
        'Approve (or revoke by setting amount to 0) a spender allowance for fungible tokens on behalf of the owner.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'owner',
          short: 'o',
          type: OptionType.STRING,
          required: true,
          description:
            'Owner account. Can be {accountId}:{privateKey} pair, key reference or account alias. Defaults to operator.',
        },
        {
          name: 'spender',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description: 'Spender account: account-id or alias',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Allowance amount. Default: display units (with decimals applied). Append "t" for raw base units (e.g., "100t"). Set to 0 to revoke.',
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
      handler: tokenAllowanceFt,
      output: {
        schema: TokenAllowanceFtOutputSchema,
        humanTemplate: TOKEN_ALLOWANCE_FT_TEMPLATE,
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
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Show token key information (admin, supply, wipe, etc.)',
        },
      ],
      handler: tokenList,
      output: {
        schema: TokenListOutputSchema,
        humanTemplate: TOKEN_LIST_TEMPLATE,
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
          type: OptionType.STRING,
          required: true,
          description: 'Token identifier: either a token alias or token-id',
        },
        {
          name: 'serial',
          short: 'S',
          type: OptionType.STRING,
          required: false,
          description: 'Serial number of a specific NFT instance',
        },
      ],
      handler: tokenView,
      output: {
        schema: TokenViewOutputSchema,
        humanTemplate: TOKEN_VIEW_TEMPLATE,
      },
    },
    {
      name: 'pending-airdrops',
      summary: 'List pending airdrops for an account',
      description:
        'List all pending token airdrops (FT and NFT) for a given account. Airdrops are pending when the receiver has no available auto-association slots.',
      options: [
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Account ID to query (e.g. 0.0.1234)',
        },
        {
          name: 'show-all',
          short: 'A',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Fetch all pages of results instead of the first 25',
        },
      ],
      handler: tokenPendingAirdrops,
      output: {
        schema: TokenPendingAirdropsOutputSchema,
        humanTemplate: TOKEN_PENDING_AIRDROPS_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete a token from the Hedera network',
      description:
        'Delete a token from the Hedera network. Requires admin key. Also removes token from local state if present. Use --state-only to remove only from local state.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token: either a token alias or token-id',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Admin key of token. Required unless the admin key is stored in the key manager (auto-resolved by public key). Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'state-only',
          short: 's',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Remove the token only from local CLI state; do not submit TokenDeleteTransaction to the network. Mutually exclusive with --admin-key.',
        },
      ],
      handler: tokenDelete,
      output: {
        schema: TokenDeleteOutputSchema,
        humanTemplate: TOKEN_DELETE_TEMPLATE,
      },
    },
    {
      name: 'allowance-nft',
      summary: 'Approve NFT allowance',
      description:
        'Approve a spender to transfer NFTs on behalf of the owner. Use --serials for specific serial numbers or --all-serials for the entire collection.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'NFT token: either a token alias or token-id',
        },
        {
          name: 'spender',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description: 'Spender account (ID, EVM address, or alias)',
        },
        {
          name: 'owner',
          short: 'o',
          type: OptionType.STRING,
          required: false,
          description:
            'Owner account. Accepts any key format. Defaults to operator.',
        },
        {
          name: 'serials',
          type: OptionType.STRING,
          required: false,
          description:
            'Specific NFT serial numbers to approve (e.g. "1,2,3"). Mutually exclusive with --all-serials.',
        },
        {
          name: 'all-serials',
          type: OptionType.BOOLEAN,
          required: false,
          description:
            'Approve all serials in the collection. Mutually exclusive with --serials.',
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
      handler: tokenAllowanceNft,
      output: {
        schema: TokenAllowanceNftOutputSchema,
        humanTemplate: TOKEN_ALLOWANCE_NFT_TEMPLATE,
      },
    },
    {
      name: 'delete-allowance-nft',
      summary: 'Delete NFT allowance',
      description:
        'Delete NFT allowances. Use --serials to remove allowance for specific serial numbers (all spenders). Use --all-serials with --spender to revoke a blanket all-serials approval for a specific spender.',
      registeredHooks: [
        { hook: 'batchify-set-batch-key', phase: 'preSignTransaction' },
        { hook: 'batchify-add-transaction', phase: 'preExecuteTransaction' },
      ],
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'NFT token: either a token alias or token-id',
        },
        {
          name: 'owner',
          short: 'o',
          type: OptionType.STRING,
          required: false,
          description:
            'Owner account. Accepts any key format. Defaults to operator.',
        },
        {
          name: 'serials',
          type: OptionType.STRING,
          required: false,
          description:
            'Specific NFT serial numbers to delete allowance for (e.g. "1,2,3"). Removes allowance for ALL spenders. Mutually exclusive with --all-serials.',
        },
        {
          name: 'all-serials',
          type: OptionType.BOOLEAN,
          required: false,
          description:
            'Revoke the all-serials blanket approval for a specific spender. Requires --spender. Mutually exclusive with --serials.',
        },
        {
          name: 'spender',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description:
            'Spender account (ID, EVM address, or alias). Required with --all-serials, not used with --serials.',
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
      handler: tokenDeleteAllowanceNft,
      output: {
        schema: TokenDeleteAllowanceNftOutputSchema,
        humanTemplate: TOKEN_DELETE_ALLOWANCE_NFT_TEMPLATE,
      },
    },
    {
      name: 'import',
      summary: 'Import an existing token',
      description:
        'Import an existing token into state. Provide token ID (e.g., 0.0.123456).',
      options: [
        {
          name: 'token',
          short: 'T',
          type: OptionType.STRING,
          required: true,
          description: 'Token ID to import (e.g., 0.0.123456)',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Name/alias for the token',
        },
      ],
      handler: tokenImport,
      output: {
        schema: TokenImportOutputSchema,
        humanTemplate: TOKEN_IMPORT_TEMPLATE,
      },
    },
  ],
};

export default tokenPluginManifest;
