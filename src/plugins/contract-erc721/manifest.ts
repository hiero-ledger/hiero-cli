/**
 * Contract ERC721 Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import {
  approveFunctionCall,
  CONTRACT_ERC721_CALL_APPROVE_TEMPLATE,
  ContractErc721CallApproveOutputSchema,
} from '@/plugins/contract-erc721/commands/approve';
import {
  balanceOfFunctionCall,
  CONTRACT_ERC721_CALL_BALANCE_OF_CREATE_TEMPLATE,
  ContractErc721CallBalanceOfOutputSchema,
} from '@/plugins/contract-erc721/commands/balance-of';
import {
  CONTRACT_ERC721_CALL_GET_APPROVED_TEMPLATE,
  ContractErc721CallGetApprovedOutputSchema,
  getApprovedFunctionCall,
} from '@/plugins/contract-erc721/commands/get-approved';
import {
  CONTRACT_ERC721_CALL_IS_APPROVED_FOR_ALL_TEMPLATE,
  ContractErc721CallIsApprovedForAllOutputSchema,
  isApprovedForAllFunctionCall,
} from '@/plugins/contract-erc721/commands/is-approved-for-all';
import {
  CONTRACT_ERC721_CALL_MINT_TEMPLATE,
  ContractErc721CallMintOutputSchema,
  mintFunctionCall,
} from '@/plugins/contract-erc721/commands/mint';
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
  CONTRACT_ERC721_CALL_SAFE_TRANSFER_FROM_TEMPLATE,
  ContractErc721CallSafeTransferFromOutputSchema,
  safeTransferFromFunctionCall,
} from '@/plugins/contract-erc721/commands/safe-transfer-from';
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
import {
  CONTRACT_ERC721_CALL_TRANSFER_FROM_TEMPLATE,
  ContractErc721CallTransferFromOutputSchema,
  transferFromFunctionCall,
} from '@/plugins/contract-erc721/commands/transfer-from';

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
      name: 'approve',
      summary: 'Call approve function',
      description:
        'Command for calling ERC-721 approve(address to, uint256 tokenId) function',
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
          description: 'Gas for function call. Default: 100000',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "to" in approve - address to approve for token transfer. Alias, account ID or EVM address. Option required',
        },
        {
          name: 'tokenId',
          short: 'T',
          type: OptionType.NUMBER,
          required: true,
          description:
            'Parameter "tokenId" in approve - token ID (uint256) to approve. Option required',
        },
      ],
      handler: approveFunctionCall,
      output: {
        schema: ContractErc721CallApproveOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_APPROVE_TEMPLATE,
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
      name: 'get-approved',
      summary: 'Call getApproved function',
      description:
        'Command for calling ERC-721 getApproved(uint256 tokenId) function (returns approved address for a token)',
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
          description:
            'Token ID (uint256) to query approved address for. Option required',
        },
      ],
      handler: getApprovedFunctionCall,
      output: {
        schema: ContractErc721CallGetApprovedOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_GET_APPROVED_TEMPLATE,
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
    {
      name: 'safe-transfer-from',
      summary: 'Call safeTransferFrom function',
      description:
        'Command for calling ERC-721 safeTransferFrom(address from, address to, uint256 tokenId) or safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
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
            'Parameter "from" (current owner) represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Parameter "to" (new owner) represented by alias, account ID or EVM address. Option required',
        },
        {
          name: 'tokenId',
          short: 'i',
          type: OptionType.NUMBER,
          required: true,
          description: 'Token ID (uint256) to transfer. Option required',
        },
        {
          name: 'data',
          short: 'd',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional arbitrary data for safeTransferFrom(address,address,uint256,bytes)',
        },
      ],
      handler: safeTransferFromFunctionCall,
      output: {
        schema: ContractErc721CallSafeTransferFromOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_SAFE_TRANSFER_FROM_TEMPLATE,
      },
    },
    {
      name: 'mint',
      summary: 'Call mint function (experimental)',
      description:
        "⚠️ EXPERIMENTAL: Command for calling custom ERC-721 mint(address to, uint256 tokenId) function based on internal _mint. This is an experimental function designed for testing token minting in ERC721 contracts. It relies on a custom implementation of the mint method in the ERC721 contract, which internally uses OpenZeppelin's _mint function.",
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
            'Parameter "to" - address to mint token to. Alias, account ID or EVM address. Option required',
        },
        {
          name: 'tokenId',
          short: 'T',
          type: OptionType.NUMBER,
          required: true,
          description:
            'Parameter "tokenId" - token ID (uint256) to mint. Option required',
        },
      ],
      handler: mintFunctionCall,
      output: {
        schema: ContractErc721CallMintOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_MINT_TEMPLATE,
      },
    },
    {
      name: 'transfer-from',
      summary: 'Call transferFrom function',
      description: 'Command for calling the ERC-721 transferFrom function',
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
          name: 'tokenId',
          short: 'T',
          type: OptionType.NUMBER,
          required: true,
          description:
            'Parameter "tokenId" in transferFrom function represented by a number. Option required',
        },
      ],
      handler: transferFromFunctionCall,
      output: {
        schema: ContractErc721CallTransferFromOutputSchema,
        humanTemplate: CONTRACT_ERC721_CALL_TRANSFER_FROM_TEMPLATE,
      },
    },
  ],
};

export default contractErc721PluginManifest;
