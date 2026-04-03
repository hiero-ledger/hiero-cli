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

export const CONTRACT_NAMESPACE = 'contract-contracts';

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
          type: OptionType.STRING,
          required: false,
          description:
            'Smart contract admin key as account ID with private key in {accountId}:{private_key} format, account public key in {ed25519|ecdsa}:public:{public-key} format, account private key in {ed25519|ecdsa}:private:{private-key} format, account ID, account name/alias or account key reference.',
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
        {
          name: 'verified',
          short: 'v',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Whether the contract is verified on Hashscan',
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
        'By default, submits ContractDeleteTransaction on Hedera and removes the contract from local CLI state.',
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
          type: OptionType.STRING,
          required: false,
          description:
            'Admin key for signing (same formats as contract create). Network delete only',
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
  ],
};

export default contractPluginManifest;
