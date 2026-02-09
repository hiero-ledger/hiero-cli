/**
 * Contract ERC-20 Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  allowanceFunctionCall,
  CONTRACT_ERC20_CALL_ALLOWANCE_CREATE_TEMPLATE,
  ContractErc20CallAllowanceOutputSchema,
} from '@/plugins/contract-erc20/commands/allowance';
import {
  approveFunctionCall,
  CONTRACT_ERC20_CALL_APPROVE_TEMPLATE,
  ContractErc20CallApproveOutputSchema,
} from '@/plugins/contract-erc20/commands/approve';
import {
  balanceOfFunctionCall,
  CONTRACT_ERC20_CALL_BALANCE_OF_CREATE_TEMPLATE,
  ContractErc20CallBalanceOfOutputSchema,
} from '@/plugins/contract-erc20/commands/balance-of';
import {
  CONTRACT_ERC20_CALL_DECIMALS_TEMPLATE,
  ContractErc20CallDecimalsOutputSchema,
  decimalsFunctionCall,
} from '@/plugins/contract-erc20/commands/decimals';
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
import {
  CONTRACT_ERC20_CALL_TRANSFER_TEMPLATE,
  ContractErc20CallTransferOutputSchema,
  transferFunctionCall,
} from '@/plugins/contract-erc20/commands/transfer';
import {
  CONTRACT_ERC20_CALL_TRANSFER_FROM_TEMPLATE,
  ContractErc20CallTransferFromOutputSchema,
  transferFromFunctionCall,
} from '@/plugins/contract-erc20/commands/transfer-from';

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
      handler: decimalsFunctionCall,
      output: {
        schema: ContractErc20CallDecimalsOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_DECIMALS_TEMPLATE,
      },
    },
    {
      name: 'allowance',
      summary: 'Call allowance function',
      description: 'Command for calling ERC-20 allowance function',
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
          name: 'owner',
          short: 'o',
          type: OptionType.STRING,
          required: true,
          description:
            'Owner account represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'spender',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Spender account represented by alias, account ID or EVM address. Option required',
        },
      ],
      handler: allowanceFunctionCall,
      output: {
        schema: ContractErc20CallAllowanceOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_ALLOWANCE_CREATE_TEMPLATE,
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
          required: false,
          default: 100000,
          description: 'Gas for function call. Default: 100000',
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
          name: 'value',
          short: 'v',
          type: OptionType.NUMBER,
          required: true,
          description:
            'Parameter "value" in transfer function represented by a number. Option required',
        },
      ],
      handler: transferFunctionCall,
      output: {
        schema: ContractErc20CallTransferOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_TRANSFER_TEMPLATE,
      },
    },
    {
      name: 'transfer-from',
      summary: 'Call transferFrom function',
      description: 'Command for calling the ERC-20 transferFrom function',
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
          required: false,
          default: 100000,
          description: 'Gas for function call. Default: 100000',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "from" in transferFrom function represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "to" (recipient) in transferFrom function represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'value',
          short: 'v',
          type: OptionType.NUMBER,
          required: true,
          description:
            'Parameter "value" in transferFrom function represented by a number. Option required',
        },
      ],
      handler: transferFromFunctionCall,
      output: {
        schema: ContractErc20CallTransferFromOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_TRANSFER_FROM_TEMPLATE,
      },
    },
    {
      name: 'approve',
      summary: 'Call approve function',
      description: 'Command for calling the ERC-20 approve function',
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
          required: false,
          default: 100000,
          description: 'Gas for function call. Default: 100000',
        },
        {
          name: 'spender',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "spender" in approve function represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'value',
          short: 'v',
          type: OptionType.NUMBER,
          required: true,
          description:
            'Parameter "value" in approve function represented by a number. Option required',
        },
      ],
      handler: approveFunctionCall,
      output: {
        schema: ContractErc20CallApproveOutputSchema,
        humanTemplate: CONTRACT_ERC20_CALL_APPROVE_TEMPLATE,
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
