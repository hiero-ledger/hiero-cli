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
  CONTRACT_ERC721_CALL_OWNER_OF_TEMPLATE,
  ContractErc721CallOwnerOfOutputSchema,
  ownerOfFunctionCall,
} from '@/plugins/contract-erc721/commands/owner-of';

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
  ],
};

export default contractErc721PluginManifest;
