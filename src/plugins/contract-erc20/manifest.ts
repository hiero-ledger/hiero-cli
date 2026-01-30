/**
 * Contract ERC-20 Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  CONTRACT_ERC20_CALL_NAME_CREATE_TEMPLATE,
  ContractErc20CallNameOutputSchema,
  nameFunctionCall,
} from '@/plugins/contract-erc20/commands/name';
import {
  CONTRACT_ERC20_CALL_SYMBOL_CREATE_TEMPLATE,
  ContractErc20CallSymbolOutputSchema,
  symbolFunctionCall,
} from '@/plugins/contract-erc20/commands/symbol';
import {
  CONTRACT_ERC20_CALL_TOTAL_SUPPLY_CREATE_TEMPLATE,
  ContractErc20CallTotalSupplyOutputSchema,
  totalSupplyFunctionCall,
} from '@/plugins/contract-erc20/commands/total-supply';

export const contractErc20PluginManifest: PluginManifest = {
  name: 'contract-erc20',
  version: '1.0.0',
  displayName: 'Smart Contract ERC20 Plugin',
  description: "Plugin designed for calling ERC-20 contract's functions",
  commands: [
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
      handler: nameFunctionCall,
      output: {
        schema: ContractErc20CallNameOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_NAME_CREATE_TEMPLATE,
      },
    },
    {
      name: 'symbol',
      summary: 'Call symbol function',
      description: 'Command for calling ERC-20 symbol function',
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
      handler: symbolFunctionCall,
      output: {
        schema: ContractErc20CallSymbolOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_SYMBOL_CREATE_TEMPLATE,
      },
    },
    {
      name: 'total-supply',
      summary: 'Call totalSupply function',
      description: 'Command for calling ERC-20 totalSupply function',
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
      handler: totalSupplyFunctionCall,
      output: {
        schema: ContractErc20CallTotalSupplyOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_TOTAL_SUPPLY_CREATE_TEMPLATE,
      },
    },
  ],
};

export default contractErc20PluginManifest;
