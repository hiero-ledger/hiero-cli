/**
 * Vanity Plugin Manifest
 * Defines the vanity address generator plugin
 */
import type { PluginManifest } from '@/core';

import { KeyAlgorithm } from '@/core/shared/constants';

import {
  generateVanity,
  VANITY_GENERATE_TEMPLATE,
  VanityGenerateOutputSchema,
} from './commands/generate';

export const vanityPluginManifest: PluginManifest = {
  name: 'vanity',
  version: '1.0.0',
  displayName: 'Vanity Address Generator',
  description:
    'Generate ECDSA accounts with EVM addresses matching a specific hex prefix',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  commands: [
    {
      name: 'generate',
      summary: 'Generate a vanity EVM address',
      description:
        'Generate an ECDSA key pair whose EVM address starts with a specified hex prefix. ' +
        'Useful for creating memorable or branded wallet addresses.',
      options: [
        {
          name: 'prefix',
          short: 'p',
          type: 'string',
          required: true,
          description:
            'Hex prefix to match (1-8 chars). Example: "dead", "1234", "cafe"',
        },
        {
          name: 'max-attempts',
          short: 'm',
          type: 'number',
          required: false,
          default: 1000000,
          description: 'Maximum key generation attempts (default: 1,000,000)',
        },
        {
          name: 'timeout',
          short: 't',
          type: 'number',
          required: false,
          default: 60,
          description: 'Timeout in seconds (default: 60)',
        },
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: false,
          description: 'Optional account name/alias for the generated key',
        },
        {
          name: 'key-type',
          short: 'k',
          type: 'string',
          required: false,
          default: KeyAlgorithm.ECDSA,
          description: 'Must be ECDSA for EVM address derivation',
        },
      ],
      handler: generateVanity,
      output: {
        schema: VanityGenerateOutputSchema,
        humanTemplate: VANITY_GENERATE_TEMPLATE,
      },
    },
  ],
};

export default vanityPluginManifest;
