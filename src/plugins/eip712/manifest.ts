import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import { eip712Sign } from './commands/sign/handler';
import {
  EIP712_SIGN_TEMPLATE,
  Eip712SignOutputSchema,
} from './commands/sign/output';
import { eip712Verify } from './commands/verify/handler';
import {
  EIP712_VERIFY_TEMPLATE,
  Eip712VerifyOutputSchema,
} from './commands/verify/output';

export const Eip712PluginManifest: PluginManifest = {
  name: 'eip712',
  version: '1.0.0',
  displayName: 'EIP-712 Typed Data Signing',
  description:
    'Sign and verify EIP-712 structured typed data using keys managed by the CLI KMS',

  commands: [
    {
      name: 'sign',
      summary: 'Sign an EIP-712 typed data payload',
      description:
        'Sign EIP-712 structured typed data using a KMS-managed ECDSA key and output the resulting signature components',
      options: [
        {
          name: 'key',
          short: 'K',
          type: OptionType.STRING,
          required: false,
          description:
            'Signing key. Defaults to operator when omitted. Can be {accountId}:{privateKey} pair, private key in {ed25519|ecdsa}:private:{private-key} format, key reference, or account alias.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
        {
          name: 'domain',
          short: 'd',
          type: OptionType.STRING,
          required: true,
          description: 'EIP-712 domain as inline JSON or path to a JSON file',
        },
        {
          name: 'types',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'EIP-712 types definition as inline JSON or path to a JSON file',
        },
        {
          name: 'message',
          short: 'm',
          type: OptionType.STRING,
          required: true,
          description:
            'Message object to sign as inline JSON or path to a JSON file',
        },
      ],
      handler: eip712Sign,
      output: {
        schema: Eip712SignOutputSchema,
        humanTemplate: EIP712_SIGN_TEMPLATE,
      },
    },
    {
      name: 'verify',
      summary: 'Verify an EIP-712 signature and recover the signer address',
      description:
        'Recover the EVM signer address from an EIP-712 signature and optionally assert it matches an expected address',
      options: [
        {
          name: 'domain',
          short: 'd',
          type: OptionType.STRING,
          required: true,
          description: 'EIP-712 domain as inline JSON or path to a JSON file',
        },
        {
          name: 'types',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'EIP-712 types definition as inline JSON or path to a JSON file',
        },
        {
          name: 'message',
          short: 'm',
          type: OptionType.STRING,
          required: true,
          description:
            'Signed message object as inline JSON or path to a JSON file',
        },
        {
          name: 'signature',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description: 'EIP-712 signature to verify (0x-prefixed 65-byte hex)',
        },
        {
          name: 'expected-signer',
          short: 'e',
          type: OptionType.STRING,
          required: false,
          description:
            'Account to assert against the recovered signer. Accepts an EVM address (0x...), Hedera account ID (0.0.xxx), or account alias.',
        },
      ],
      handler: eip712Verify,
      output: {
        schema: Eip712VerifyOutputSchema,
        humanTemplate: EIP712_VERIFY_TEMPLATE,
      },
    },
  ],
};

export default Eip712PluginManifest;
