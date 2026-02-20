/**
 * Test Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  CONTRACT_LIST_TEMPLATE,
  ContractListOutputSchema,
  listContracts,
} from '@/plugins/contract/commands/list';

import {
  CONTRACT_CREATE_TEMPLATE,
  ContractCreateOutputSchema,
  createContract,
} from './commands/create';
import {
  DELETE_CONTRACT_TEMPLATE,
  deleteContract,
  DeleteContractOutputSchema,
} from './commands/delete';
import {
  IMPORT_CONTRACT_TEMPLATE,
  importContract,
  ImportContractOutputSchema,
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
          required: true,
          description:
            'Smart contract definition file path (absolute or relative) to a Solidity file',
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
          default: 1000000,
          description: 'Gas for smart contract creation. Default: 1000000',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description: 'Smart contract admin key.',
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
      handler: createContract,
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
      handler: listContracts,
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
          name: 'alias',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description: 'Optional alias for the imported contract',
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
      handler: importContract,
      output: {
        schema: ImportContractOutputSchema,
        humanTemplate: IMPORT_CONTRACT_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete contract from state',
      description:
        'Remove contract information from state by contract ID or alias',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description: 'Contract ID (0.0.xxx) or alias to delete from state',
        },
      ],
      handler: deleteContract,
      output: {
        schema: DeleteContractOutputSchema,
        humanTemplate: DELETE_CONTRACT_TEMPLATE,
      },
    },
  ],
};

export default contractPluginManifest;
