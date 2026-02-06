/**
 * Contract ERC721 Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  balanceOfFunctionCall,
  CONTRACT_ERC721_CALL_BALANCE_OF_CREATE_TEMPLATE,
  ContractErc721CallBalanceOfOutputSchema,
} from '@/plugins/contract-erc721/commands/balance-of';
import {
  CONTRACT_ERC721_CALL_IS_APPROVED_FOR_ALL_TEMPLATE,
  ContractErc721CallIsApprovedForAllOutputSchema,
  isApprovedForAllFunctionCall,
} from '@/plugins/contract-erc721/commands/is-approved-for-all';
import {
  CONTRACT_ERC721_CALL_NAME_TEMPLATE,
  ContractErc721CallNameOutputSchema,
  nameFunctionCall,
} from '@/plugins/contract-erc721/commands/name';
import {
  CONTRACT_ERC721_CALL_OWNER_OF_TEMPLATE,
  ContractErc721CallOwnerOfOutputSchema,
  ownerOfFunctionCall,
} from '@/plugins/contract-erc721/commands/owner-of';
import {
  CONTRACT_ERC721_CALL_SET_APPROVAL_FOR_ALL_TEMPLATE,
  ContractErc721CallSetApprovalForAllOutputSchema,
  setApprovalForAllFunctionCall,
} from '@/plugins/contract-erc721/commands/set-approval-for-all';
import {
  CONTRACT_ERC721_CALL_SYMBOL_TEMPLATE,
  ContractErc721CallSymbolOutputSchema,
  symbolFunctionCall,
} from '@/plugins/contract-erc721/commands/symbol';
import {
  CONTRACT_ERC721_CALL_TOKEN_URI_TEMPLATE,
  ContractErc721CallTokenUriOutputSchema,
  tokenUriFunctionCall,
} from '@/plugins/contract-erc721/commands/token-uri';

export const contractErc721PluginManifest: PluginManifest = {
  name: 'contract-erc721',
  version: '1.0.0',
  displayName: 'Smart Contract ERC721 Plugin',
  description: "Plugin designed for calling ERC-721 contract's functions",
  commands: [
    {
      name: 'balance-of',
      summary: 'Call balanceOf function',
      description: 'Command for calling ERC-721 balanceOf(address) function',
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
            'Account represented by alias, account ID, or EVM address. Option required',
        },
      ],
      handler: balanceOfFunctionCall,
      output: {
        schema: ContractErc721CallBalanceOfOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_BALANCE_OF_CREATE_TEMPLATE,
      },
    },
    {
      name: 'set-approval-for-all',
      summary: 'Call setApprovalForAll function',
      description:
        'Command for calling ERC-721 setApprovalForAll(address operator, bool approved) function',
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
          name: 'operator',
          short: 'o',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "operator" in setApprovalForAll represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'approved',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "approved" in setApprovalForAll. Value must be "true" or "false". Option required',
        },
      ],
      handler: setApprovalForAllFunctionCall,
      output: {
        schema: ContractErc721CallSetApprovalForAllOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_SET_APPROVAL_FOR_ALL_TEMPLATE,
      },
    },
    {
      name: 'is-approved-for-all',
      summary: 'Call isApprovedForAll function',
      description:
        'Command for calling ERC-721 isApprovedForAll(address owner, address operator) function',
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
          name: 'owner',
          short: 'o',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "owner" represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'operator',
          short: 'p',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "operator" represented by alias, account ID or EVM address. Option required',
        },
      ],
      handler: isApprovedForAllFunctionCall,
      output: {
        schema: ContractErc721CallIsApprovedForAllOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_IS_APPROVED_FOR_ALL_TEMPLATE,
      },
    },
    {
      name: 'owner-of',
      summary: 'Call ownerOf function',
      description:
        'Command for calling ERC-721 ownerOf(uint256 tokenId) function',
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
          name: 'tokenId',
          short: 't',
          type: OptionType.NUMBER,
          required: true,
          description: 'Token ID (uint256) to query owner of. Option required',
        },
      ],
      handler: ownerOfFunctionCall,
      output: {
        schema: ContractErc721CallOwnerOfOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_OWNER_OF_TEMPLATE,
      },
    },
    {
      name: 'token-uri',
      summary: 'Call tokenURI function',
      description:
        'Command for calling ERC-721 tokenURI(uint256 tokenId) function (returns metadata URI for token)',
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
          name: 'tokenId',
          short: 't',
          type: OptionType.NUMBER,
          required: true,
          description: 'Token ID (uint256) to query URI for. Option required',
        },
      ],
      handler: tokenUriFunctionCall,
      output: {
        schema: ContractErc721CallTokenUriOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_TOKEN_URI_TEMPLATE,
      },
    },
    {
      name: 'name',
      summary: 'Call name function',
      description:
        'Command for calling ERC-721 name() function (returns contract/token name)',
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
        schema: ContractErc721CallNameOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_NAME_TEMPLATE,
      },
    },
    {
      name: 'symbol',
      summary: 'Call symbol function',
      description:
        'Command for calling ERC-721 symbol() function (returns token symbol)',
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
        schema: ContractErc721CallSymbolOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_SYMBOL_TEMPLATE,
      },
    },
  ],
};

export default contractErc721PluginManifest;
