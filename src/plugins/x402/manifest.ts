import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import {
  X402_SIGN_TEMPLATE,
  x402Sign,
  X402SignOutputSchema,
} from './commands/sign';

export const x402PluginManifest: PluginManifest = {
  name: 'x402',
  version: '1.0.0',
  displayName: 'x402 Plugin',
  description: 'Sign x402 payment challenges using hiero-cli managed keys',
  commands: [
    {
      name: 'sign',
      summary: 'Sign an x402 payment challenge',
      description:
        'Decode a PAYMENT-REQUIRED challenge, build and KMS-sign a Hedera transfer, and return the PAYMENT-SIGNATURE header. The private key never leaves the KMS.',
      options: [
        {
          name: 'challenge',
          short: 'c',
          type: OptionType.STRING,
          required: true,
          description:
            'Value of the PAYMENT-REQUIRED header from the 402 response',
        },
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: false,
          description:
            'Payer account/key (accountId:privateKey pair, key reference, or account name). Defaults to operator.',
        },
        {
          name: 'asset',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Asset to pay with when the challenge offers several (0.0.0 = HBAR, or an HTS token id)',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: x402Sign,
      output: {
        schema: X402SignOutputSchema,
        humanTemplate: X402_SIGN_TEMPLATE,
      },
    },
  ],
};

export default x402PluginManifest;
