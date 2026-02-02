/**
 * Contract ERC-20 Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  balanceOfFunctionCall,
  CONTRACT_ERC20_CALL_BALANCE_OF_CREATE_TEMPLATE,
  ContractErc20CallBalanceOfOutputSchema,
} from '@/plugins/contract-erc20/commands/balance-of';
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
  CONTRACT_ERC20_CALL_TRANSFER_TEMPLATE,
  ContractErc20CallTransferOutputSchema,
  transferFunctionCall,
} from '@/plugins/contract-erc20/commands/transfer';

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
      name: 'balance-of',
      summary: 'Call balanceOf function',
      description: 'Command for calling ERC-20 balanceOf(address) function',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description:
            'Smart contract ID represented by alias or contract ID. Option required',
        },
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Account represented by alias, account ID, or EVM address. Option required',
        },
      ],
      handler: balanceOfFunctionCall,
      output: {
        schema: ContractErc20CallBalanceOfOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_BALANCE_OF_CREATE_TEMPLATE,
      },
    },
    {
      name: 'transfer',
      summary: 'Call transfer function',
      description: 'Command for calling ERC-20 transfer function',
      options: [
        {
          name: 'contract',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description:
            'Smart contract ID represented by alias, contract ID or EVM address. Option required',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: true,
          default: 100000,
          description: 'Gas for function call. Default: 1000000',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "to" in transfer function represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.NUMBER,
          required: true,
          description:
            'Parameter "amount" in transfer function. Option required',
        },
      ],
      handler: transferFunctionCall,
      output: {
        schema: ContractErc20CallTransferOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_TRANSFER_TEMPLATE,
      },
    },
  ],
};

export default contractErc20PluginManifest;
