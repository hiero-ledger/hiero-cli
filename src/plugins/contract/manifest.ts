/**
 * Contract Plugin Manifest
 * Provides commands for smart contract management (create, list, import, delete)
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  CONTRACT_LIST_TEMPLATE,
  contractList,
  ContractListOutputSchema,
} from '@/plugins/contract/commands/list';

import {
  CONTRACT_CREATE_TEMPLATE,
  contractCreate,
  ContractCreateOutputSchema,
} from './commands/create';
import {
  contractDelete,
  DELETE_CONTRACT_TEMPLATE,
  DeleteContractOutputSchema,
} from './commands/delete';
import {
  contractImport,
  ContractImportOutputSchema,
  IMPORT_CONTRACT_TEMPLATE,
} from './commands/import';
import {
  CONTRACT_UPDATE_TEMPLATE,
  contractUpdate,
  ContractUpdateOutputSchema,
} from './commands/update';

export const contractPluginManifest: PluginManifest = {
  name: 'contract',
  version: '1.0.0',
  displayName: 'Smart Contract Plugin',
  description:
    'Plugin designed for managing compiling, deployment and verification of smart contract',
  commands: [
    {
      name: 'create',
      summary: 'Create smart contract',
      description:
        'Command manages smart contract creation by compiling smart contract definition file, deploy and verification',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Smart contract name represented in the state',
        },
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Smart contract definition file path (absolute or relative) to a Solidity file',
        },
        {
          name: 'default',
          short: 'd',
          type: OptionType.STRING,
          required: false,
          description:
            'Use built-in contract template: erc20 or erc721 (mutually exclusive with --file)',
        },
        {
          name: 'base-path',
          short: 'b',
          type: OptionType.STRING,
          required: false,
          description:
            'Base path to the smart contract file directory. Defaults to current directory',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 2000000,
          description: 'Gas for smart contract creation. Default: 2000000',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.REPEATABLE,
          required: false,
          description:
            'Smart contract admin key(s). Pass multiple times for multiple keys. Each value may be: account ID with private key in {accountId}:{private_key} format; account public key in {ed25519|ecdsa}:public:{public-key} format; account private key in {ed25519|ecdsa}:private:{private-key} format; account ID; account name/alias; or account key reference.',
        },
        {
          name: 'admin-key-threshold',
          short: 'A',
          type: OptionType.NUMBER,
          required: false,
          description:
            'M-of-N: number of admin keys required to sign the contract create flow (only when multiple --admin-key values are set).',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description: 'Smart contract memo.',
        },
        {
          name: 'solidity-version',
          short: 'v',
          type: OptionType.STRING,
          required: false,
          description: 'Solidity compiler version.',
        },
        {
          name: 'constructor-parameter',
          short: 'c',
          type: OptionType.REPEATABLE,
          required: false,
          description:
            'Repeatable parameter to be set for smart contract constructor',
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
          name: 'initial-balance',
          short: 'i',
          type: OptionType.STRING,
          required: false,
          description:
            'Initial HBAR balance for the contract. Format: "100" (HBAR) or "100t" (tinybars)',
        },
        {
          name: 'auto-renew-period',
          short: 'r',
          type: OptionType.STRING,
          required: false,
          description:
            'Auto-renew period: seconds as integer, or with suffix s/m/h/d (e.g. 500, 500s, 50m, 2h, 30d)',
        },
        {
          name: 'auto-renew-account-id',
          short: 'R',
          type: OptionType.STRING,
          required: false,
          description:
            'Account ID (0.0.xxx) that will pay for auto-renewal of the contract',
        },
        {
          name: 'max-automatic-token-associations',
          short: 't',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Maximum number of automatic token associations (-1 for unlimited, 0 to disable)',
        },
        {
          name: 'staked-account-id',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description:
            'Account ID (0.0.xxx) to stake this contract to (mutually exclusive with --staked-node-id)',
        },
        {
          name: 'staked-node-id',
          short: 'o',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Node ID to stake this contract to (mutually exclusive with --staked-account-id)',
        },
        {
          name: 'decline-staking-reward',
          short: 'D',
          type: OptionType.BOOLEAN,
          required: false,
          description: 'Whether to decline staking rewards for this contract',
        },
      ],
      handler: contractCreate,
      output: {
        schema: ContractCreateOutputSchema,
        humanTemplate: CONTRACT_CREATE_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all contracts',
      description: 'List all smart contracts stored in the state',
      options: [],
      handler: contractList,
      output: {
        schema: ContractListOutputSchema,
        humanTemplate: CONTRACT_LIST_TEMPLATE,
      },
    },
    {
      name: 'import',
      summary: 'Import existing contract',
      description:
        'Import contract from Hedera network by contract ID or EVM address',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description:
            'Contract ID (0.0.xxx) or EVM address (0x...) to import from Hedera network',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Optional name of the imported contract',
        },
      ],
      handler: contractImport,
      output: {
        schema: ContractImportOutputSchema,
        humanTemplate: IMPORT_CONTRACT_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete contract',
      description:
        'By default, deletes the contract on Hedera and removes it from local CLI state.',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description: 'Contract ID (0.0.xxx) or alias',
        },
        {
          name: 'state-only',
          short: 's',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description:
            'Remove from local CLI state only; no network transaction',
        },
        {
          name: 'transfer-id',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'Account receiving remaining HBAR (ID or alias). Required for network delete unless using --state-only',
        },
        {
          name: 'transfer-contract-id',
          short: 'r',
          type: OptionType.STRING,
          required: false,
          description:
            'Contract receiving remaining HBAR (ID or alias). Alternative to --transfer-id',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.REPEATABLE,
          required: false,
          description:
            'Optional admin credential(s) for signing the network delete. If omitted, the CLI uses the contract admin key from the mirror node and matches KMS keys to those public keys (including M-of-N). If provided, those credentials are used; invalid values fail the command. Pass multiple times when multiple credentials are needed. Each value may be: account ID with private key in {accountId}:{private_key} format; account public key in {ed25519|ecdsa}:public:{public-key} format; account private key in {ed25519|ecdsa}:private:{private-key} format; account ID; account name/alias; or account key reference.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager for --admin-key (default: config)',
        },
      ],
      handler: contractDelete,
      output: {
        schema: DeleteContractOutputSchema,
        humanTemplate: DELETE_CONTRACT_TEMPLATE,
      },
      requireConfirmation:
        'Are you sure you want to delete contract {{contract}}? This cannot be undone.',
    },
    {
      name: 'update',
      summary: 'Update smart contract',
      description:
        'Update smart contract properties on the Hedera network such as admin key, memo, auto-renew settings, staking configuration, and token associations.',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description:
            'Contract ID (0.0.xxx) or alias of the contract to update',
        },
        {
          name: 'admin-key',
          short: 'K',
          type: OptionType.REPEATABLE,
          required: false,
          description:
            'Current contract admin credential(s) used to sign the update. Pass multiple times for multiple keys. Each value may be: account ID with private key in {accountId}:{private_key} format; account public key in {ed25519|ecdsa}:public:{public-key} format; account private key in {ed25519|ecdsa}:private:{private-key} format; account ID; account name/alias; or account key reference.',
        },
        {
          name: 'new-admin-key',
          short: 'a',
          type: OptionType.REPEATABLE,
          required: false,
          description:
            'New admin key for the contract. Requires its private key in KMS to co-sign the update.',
        },
        {
          name: 'new-admin-key-threshold',
          short: 'A',
          type: OptionType.NUMBER,
          required: false,
          description:
            'M-of-N: number of admin keys required to sign the update transaction (only when multiple --admin-key values are set).',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Contract memo (max 100 characters). Pass "null" or "" to clear.',
        },
        {
          name: 'auto-renew-period',
          short: 'r',
          type: OptionType.STRING,
          required: false,
          description:
            'Auto-renew period: integer seconds, or with suffix s/m/h/d (e.g. 500, 500s, 50m, 2h, 30d)',
        },
        {
          name: 'auto-renew-account-id',
          short: 'R',
          type: OptionType.STRING,
          required: false,
          description:
            'Account ID (0.0.xxx) that will pay for auto-renewal. Pass "null" to clear.',
        },
        {
          name: 'max-automatic-token-associations',
          short: 't',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Maximum number of automatic token associations (-1 for unlimited, 0 to disable)',
        },
        {
          name: 'staked-account-id',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description:
            'Account ID (0.0.xxx) to stake this contract to. Mutually exclusive with --staked-node-id.',
        },
        {
          name: 'staked-node-id',
          short: 'o',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Node ID to stake this contract to. Mutually exclusive with --staked-account-id.',
        },
        {
          name: 'decline-staking-reward',
          short: 'D',
          type: OptionType.BOOLEAN,
          required: false,
          description: 'Whether to decline staking rewards for this contract',
        },
        {
          name: 'expiration-time',
          short: 'e',
          type: OptionType.STRING,
          required: false,
          description:
            'Expiration time as ISO datetime string (e.g. 2025-12-31T00:00:00Z)',
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
      handler: contractUpdate,
      output: {
        schema: ContractUpdateOutputSchema,
        humanTemplate: CONTRACT_UPDATE_TEMPLATE,
      },
    },
  ],
};

export default contractPluginManifest;
