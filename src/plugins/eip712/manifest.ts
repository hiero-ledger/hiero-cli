import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import { eip712Hash } from './commands/hash/handler';
import {
  EIP712_HASH_TEMPLATE,
  Eip712HashOutputSchema,
} from './commands/hash/output';
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
  skipWizardInitialization: true,
  commands: [
    {
      name: 'hash',
      summary: 'Compute the EIP-712 hash for a typed data payload',
      description:
        'Compute the EIP-712 structured-data hash from domain, types, and message without signing',
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
          description: 'Message object as inline JSON or path to a JSON file',
        },
      ],
      handler: eip712Hash,
      output: {
        schema: Eip712HashOutputSchema,
        humanTemplate: EIP712_HASH_TEMPLATE,
      },
    },
    {
      name: 'sign',
      summary: 'Sign an EIP-712 typed data payload',
      description:
        'Sign EIP-712 structured typed data using a KMS-managed key. Algorithm (ECDSA or ED25519) is auto-detected from the key type.',
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
          name: 'hash',
          short: 'H',
          type: OptionType.STRING,
          required: false,
          description:
            'Pre-computed EIP-712 digest (0x-prefixed hex). Provide this OR domain+types+message, not both.',
        },
        {
          name: 'domain',
          short: 'd',
          type: OptionType.STRING,
          required: false,
          description: 'EIP-712 domain as inline JSON or path to a JSON file',
        },
        {
          name: 'types',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'EIP-712 types definition as inline JSON or path to a JSON file',
        },
        {
          name: 'message',
          short: 'm',
          type: OptionType.STRING,
          required: false,
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
      summary: 'Verify an EIP-712 signature',
      description:
        'Verify an EIP-712 signature. Algorithm is auto-detected from signature length: 65-byte (ECDSA) recovers the signer address; 64-byte (ED25519) verifies against a KMS-managed public key.',
      options: [
        {
          name: 'key',
          short: 'K',
          type: OptionType.STRING,
          required: false,
          description:
            'Public key to verify against (ED25519 only). Can be a key reference, account alias, or account ID.',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting, ED25519 only)',
        },
        {
          name: 'hash',
          short: 'H',
          type: OptionType.STRING,
          required: false,
          description:
            'Pre-computed EIP-712 digest (0x-prefixed hex). Provide this OR domain+types+message, not both.',
        },
        {
          name: 'domain',
          short: 'd',
          type: OptionType.STRING,
          required: false,
          description: 'EIP-712 domain as inline JSON or path to a JSON file',
        },
        {
          name: 'types',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'EIP-712 types definition as inline JSON or path to a JSON file',
        },
        {
          name: 'message',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Signed message object as inline JSON or path to a JSON file',
        },
        {
          name: 'signature',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Signature to verify: 0x-prefixed 65-byte hex (ECDSA) or 64-byte hex (ED25519)',
        },
        {
          name: 'expected-signer',
          short: 'e',
          type: OptionType.STRING,
          required: false,
          description:
            'Account to assert against the recovered signer (ECDSA only). Accepts an EVM address (0x...), Hedera account ID (0.0.xxx), or account alias.',
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
