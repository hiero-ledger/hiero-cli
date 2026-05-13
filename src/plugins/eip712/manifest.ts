import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import { eip712Hash } from './commands/hash/handler';
import {
  EIP712_HASH_TEMPLATE,
  Eip712HashOutputSchema,
} from './commands/hash/output';
import { eip712SignEcdsa } from './commands/sign-ecdsa/handler';
import {
  EIP712_SIGN_ECDSA_TEMPLATE,
  Eip712SignEcdsaOutputSchema,
} from './commands/sign-ecdsa/output';
import { ed25519Sign } from './commands/sign-ed25519/handler';
import {
  ED25519_SIGN_TEMPLATE,
  Ed25519SignOutputSchema,
} from './commands/sign-ed25519/output';
import { eip712VerifyEcdsa } from './commands/verify-ecdsa/handler';
import {
  EIP712_VERIFY_ECDSA_TEMPLATE,
  Eip712VerifyEcdsaOutputSchema,
} from './commands/verify-ecdsa/output';
import { ed25519Verify } from './commands/verify-ed25519/handler';
import {
  ED25519_VERIFY_TEMPLATE,
  Ed25519VerifyOutputSchema,
} from './commands/verify-ed25519/output';

export const Eip712PluginManifest: PluginManifest = {
  name: 'eip712',
  version: '1.0.0',
  displayName: 'EIP-712 Typed Data Signing',
  description:
    'Sign and verify EIP-712 structured typed data using keys managed by the CLI KMS',

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
      name: 'sign-ecdsa',
      summary: 'Sign an EIP-712 typed data payload using an ECDSA key',
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
      handler: eip712SignEcdsa,
      output: {
        schema: Eip712SignEcdsaOutputSchema,
        humanTemplate: EIP712_SIGN_ECDSA_TEMPLATE,
      },
    },
    {
      name: 'sign-ed25519',
      summary: 'Sign an EIP-712 typed data payload using an ED25519 key',
      description:
        'Compute the EIP-712 digest and sign it with a KMS-managed ED25519 key, outputting the raw signature bytes',
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
      handler: ed25519Sign,
      output: {
        schema: Ed25519SignOutputSchema,
        humanTemplate: ED25519_SIGN_TEMPLATE,
      },
    },
    {
      name: 'verify-ed25519',
      summary: 'Verify an EIP-712 ED25519 signature against a public key',
      description:
        'Compute the EIP-712 digest and verify the provided ED25519 signature against a KMS-managed public key',
      options: [
        {
          name: 'key',
          short: 'K',
          type: OptionType.STRING,
          required: false,
          description:
            'Public key to verify against. Can be a key reference, account alias, or account ID.',
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
            'Signed message object as inline JSON or path to a JSON file',
        },
        {
          name: 'signature',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description: 'ED25519 signature to verify (0x-prefixed 64-byte hex)',
        },
      ],
      handler: ed25519Verify,
      output: {
        schema: Ed25519VerifyOutputSchema,
        humanTemplate: ED25519_VERIFY_TEMPLATE,
      },
    },
    {
      name: 'verify-ecdsa',
      summary:
        'Verify an EIP-712 ECDSA signature and recover the signer address',
      description:
        'Recover the EVM signer address from an EIP-712 signature and optionally assert it matches an expected address',
      options: [
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
      handler: eip712VerifyEcdsa,
      output: {
        schema: Eip712VerifyEcdsaOutputSchema,
        humanTemplate: EIP712_VERIFY_ECDSA_TEMPLATE,
      },
    },
  ],
};

export default Eip712PluginManifest;
