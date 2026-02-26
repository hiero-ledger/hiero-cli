/**
 * SaucerSwap plugin: quote and execute swaps on SaucerSwap V2 (Hedera mainnet).
 */
import type { PluginManifest } from '@/core';
import { OptionType } from '@/core/types/shared.types';

import {
  swapQuoteHandler,
  SwapQuoteOutputSchema,
  SWAP_QUOTE_TEMPLATE,
} from './commands/quote';
import {
  swapExecuteHandler,
  SwapExecuteOutputSchema,
  SWAP_EXECUTE_TEMPLATE,
} from './commands/execute';

export const saucerswapPluginManifest: PluginManifest = {
  name: 'saucerswap',
  version: '1.0.0',
  displayName: 'SaucerSwap',
  description:
    'Get swap quotes and execute HBAR ↔ token or token ↔ token swaps on SaucerSwap V2 (mainnet)',
  commands: [
    {
      name: 'quote',
      summary: 'Get a swap quote (read-only)',
      description:
        'Get expected output amount for an exact input swap. Use HBAR or token ID (0.0.x) for --in and --out.',
      options: [
        {
          name: 'in',
          short: 'i',
          type: OptionType.STRING,
          required: true,
          description: 'Input: HBAR or token ID (0.0.x)',
        },
        {
          name: 'out',
          short: 'o',
          type: OptionType.STRING,
          required: true,
          description: 'Output: HBAR or token ID (0.0.x)',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount of input (e.g. 10 for 10 HBAR, or 100t for 100 tinybar)',
        },
      ],
      handler: swapQuoteHandler,
      output: {
        schema: SwapQuoteOutputSchema,
        humanTemplate: SWAP_QUOTE_TEMPLATE,
      },
    },
    {
      name: 'execute',
      summary: 'Execute a swap',
      description:
        'Execute a swap: HBAR → token or token → HBAR. Applies slippage to minimum output.',
      options: [
        {
          name: 'in',
          short: 'i',
          type: OptionType.STRING,
          required: true,
          description: 'Input: HBAR or token ID (0.0.x)',
        },
        {
          name: 'out',
          short: 'o',
          type: OptionType.STRING,
          required: true,
          description: 'Output: HBAR or token ID (0.0.x)',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'Amount of input',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.STRING,
          required: false,
          default: '0.5',
          description: 'Slippage tolerance in percent (e.g. 0.5 for 0.5%)',
        },
      ],
      handler: swapExecuteHandler,
      output: {
        schema: SwapExecuteOutputSchema,
        humanTemplate: SWAP_EXECUTE_TEMPLATE,
      },
    },
  ],
};

export default saucerswapPluginManifest;
