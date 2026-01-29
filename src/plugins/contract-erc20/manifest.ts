/**
 * Contract ERC-20 Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  CONTRACT_ERC20_CALL_DECIMALS_CREATE_TEMPLATE,
  ContractErc20CallDecimalsOutputSchema,
  decimals,
} from '@/plugins/contract-erc20/commands/decimals';
import {
  CONTRACT_ERC20_CALL_NAME_CREATE_TEMPLATE,
  ContractErc20CallNameOutputSchema,
  name,
} from '@/plugins/contract-erc20/commands/name';

export const contractErc20PluginManifest: PluginManifest = {
  name: 'contract-erc20',
  version: '1.0.0',
  displayName: 'Smart Contract ERC20 Plugin',
  description: "Plugin designed for calling ERC-20 contract's functions",
  commands: [
    {
      name: 'decimals',
      summary: 'Call decimals function',
      description: 'Command for calling ERC-20 decimals function',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description:
            'Smart contract ID represented by alias or contract ID. Option required',
        },
      ],
      handler: decimals,
      output: {
        schema: ContractErc20CallDecimalsOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_DECIMALS_CREATE_TEMPLATE,
      },
    },
    {
      name: 'name',
      summary: 'Call name function',
      description: 'Command for calling ERC-20 name function',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description:
            'Smart contract ID represented by alias or contract ID. Option required',
        },
      ],
      handler: name,
      output: {
        schema: ContractErc20CallNameOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_NAME_CREATE_TEMPLATE,
      },
    },
  ],
};

export default contractErc20PluginManifest;
