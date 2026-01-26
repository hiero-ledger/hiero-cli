/**
 * Contract Plugin Manifest
 * Provides commands for deploying and interacting with Hedera smart contracts
 */
import type { PluginManifest } from '@/core/plugins/plugin.interface';

import {
  DEPLOY_CONTRACT_TEMPLATE,
  deployContractHandler,
  DeployContractOutputSchema,
} from './commands/deploy';

import {
  CALL_CONTRACT_TEMPLATE,
  callContractHandler,
  CallContractOutputSchema,
} from './commands/call';

import {
  CONTRACT_INFO_TEMPLATE,
  contractInfoHandler,
  ContractInfoOutputSchema,
} from './commands/info';

export const CONTRACT_NAMESPACE = 'contract-data';

export const contractPluginManifest: PluginManifest = {
  name: 'contract',
  version: '1.0.0',
  displayName: 'Smart Contract Plugin',
  description:
    'Deploy, call, and manage Hedera smart contracts from the command line',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  commands: [
    {
      name: 'deploy',
      summary: 'Deploy a smart contract',
      description:
        'Deploy a smart contract to the Hedera network using bytecode from a file. ' +
        'The bytecode is automatically chunked and uploaded if larger than 2KB.',
      options: [
        {
          name: 'bytecode-file',
          short: 'b',
          type: 'string',
          required: true,
          description:
            'Path to file containing contract bytecode (hex-encoded or binary)',
        },
        {
          name: 'gas',
          short: 'g',
          type: 'number',
          required: true,
          description: 'Gas limit for contract deployment (e.g., 100000)',
        },
        {
          name: 'constructor-params',
          short: 'p',
          type: 'string',
          required: false,
          description:
            'Constructor parameters as JSON array (e.g., \'["param1", 123]\')',
        },
        {
          name: 'initial-balance',
          short: 'i',
          type: 'string',
          required: false,
          description:
            'Initial HBAR balance for the contract (e.g., "10" or "10t" for tinybars)',
        },
        {
          name: 'memo',
          short: 'm',
          type: 'string',
          required: false,
          description: 'Contract memo (max 100 bytes)',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: 'string',
          required: false,
          description:
            'Admin key for the contract (account name or account-id:private-key format)',
        },
      ],
      handler: deployContractHandler,
      output: {
        schema: DeployContractOutputSchema,
        humanTemplate: DEPLOY_CONTRACT_TEMPLATE,
      },
    },
    {
      name: 'call',
      summary: 'Call a smart contract function (query)',
      description:
        'Execute a read-only call to a smart contract function. ' +
        'This does not create a transaction and is free of charge.',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: 'string',
          required: true,
          description: 'Contract ID (e.g., 0.0.123456)',
        },
        {
          name: 'function',
          short: 'f',
          type: 'string',
          required: true,
          description: 'Function name to call (e.g., "balanceOf")',
        },
        {
          name: 'params',
          short: 'p',
          type: 'string',
          required: false,
          description:
            'Function parameters as JSON array (e.g., \'["0x123...", 100]\')',
        },
        {
          name: 'gas',
          short: 'g',
          type: 'number',
          required: false,
          default: 30000,
          description: 'Gas limit for the call (default: 30000)',
        },
      ],
      handler: callContractHandler,
      output: {
        schema: CallContractOutputSchema,
        humanTemplate: CALL_CONTRACT_TEMPLATE,
      },
    },
    {
      name: 'info',
      summary: 'Get contract information',
      description:
        'Query the Mirror Node for detailed information about a smart contract, ' +
        'including its balance, bytecode hash, and creation details.',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: 'string',
          required: true,
          description: 'Contract ID (e.g., 0.0.123456)',
        },
      ],
      handler: contractInfoHandler,
      output: {
        schema: ContractInfoOutputSchema,
        humanTemplate: CONTRACT_INFO_TEMPLATE,
      },
    },
  ],
};

export default contractPluginManifest;
