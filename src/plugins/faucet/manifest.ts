import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import {
  FAUCET_REQUEST_TEMPLATE,
  faucetRequest,
  FaucetRequestOutputSchema,
} from './commands/request';

export const faucetPluginManifest: PluginManifest = {
  name: 'faucet',
  version: '1.0.0',
  displayName: 'Faucet Plugin',
  description: 'Top up accounts with HBAR on testnet and previewnet',
  skipWizardInitialization: true,
  commands: [
    {
      name: 'request',
      summary: 'Request HBAR from the faucet',
      description:
        'Send HBAR to a Hedera account ID or EVM address on testnet or previewnet. Requires a Hedera Portal PAT configured via hcli config set --portal_pat.',
      options: [
        {
          name: 'recipient',
          short: 'r',
          type: OptionType.STRING,
          required: true,
          description: 'Hedera account ID (0.0.12345) or EVM address (0x...)',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.NUMBER,
          required: false,
          description: 'Amount of HBAR to request (1-100, default: 100)',
        },
      ],
      handler: faucetRequest,
      output: {
        schema: FaucetRequestOutputSchema,
        humanTemplate: FAUCET_REQUEST_TEMPLATE,
      },
    },
  ],
};

export default faucetPluginManifest;
