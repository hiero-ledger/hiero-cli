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
          description:
            'Smart contract name represented in the state. Option required',
        },
        {
          name: 'file',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Smart contract definition file path (absolute or relative) to a Solidity file. Option required',
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
          description:
            'Smart contract admin key as account ID with private key in {accountId}:{private_key} format, account public key in {ed25519|ecdsa}:{public-key} format, account private key in {ed25519|ecdsa}:{private-key} format, account ID, account name/alias or account key reference.',
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
  ],
};

export default contractPluginManifest;
