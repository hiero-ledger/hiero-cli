import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  Eip712EcdsaSignatureSchema,
  Eip712Ed25519SignatureSchema,
  HexEncodedDataSchema,
  JsonInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';
import {
  isEcdsaSignature,
  isEd25519Signature,
} from '@/plugins/eip712/util/detect-signature-algorithm';
import { hasTypedData } from '@/plugins/eip712/util/has-typed-data';

export const Eip712VerifyInputSchema = z
  .object({
    key: KeySchema.optional().describe(
      'Public key to verify against (ED25519 only). Can be a key reference, account alias, or account ID.',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting, ED25519 only)',
    ),
    hash: HexEncodedDataSchema.optional().describe(
      'Pre-computed EIP-712 digest (0x-prefixed hex). Provide this OR domain+types+message, not both.',
    ),
    domain: JsonInputSchema.optional().describe(
      'EIP-712 domain as inline JSON or path to a JSON file',
    ),
    types: JsonInputSchema.optional().describe(
      'EIP-712 types definition as inline JSON or path to a JSON file',
    ),
    message: JsonInputSchema.optional().describe(
      'Signed message object as inline JSON or path to a JSON file',
    ),
    signature: z
      .union([Eip712EcdsaSignatureSchema, Eip712Ed25519SignatureSchema])
      .describe(
        'Signature to verify: 0x-prefixed 65-byte hex (ECDSA) or 64-byte hex (ED25519)',
      ),
    expectedSigner: AccountReferenceObjectSchema.optional().describe(
      'Account to assert against the recovered signer (ECDSA only). Accepts an EVM address (0x...), Hedera account ID (0.0.xxx), or account alias',
    ),
  })
  .superRefine((data, ctx) => {
    const hasHash = data.hash !== undefined;
    const typedData = hasTypedData(data);

    if (hasHash && typedData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either hash or domain+types+message, not both.',
      });
    }

    if (!hasHash && !typedData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either hash or all of domain, types, and message.',
      });
    }

    if (!hasHash && typedData) {
      const missing = (['domain', 'types', 'message'] as const).filter(
        (k) => data[k] === undefined,
      );
      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `When providing typed data, all three fields are required. Missing: ${missing.join(', ')}.`,
        });
      }
    }

    if (data.signature) {
      if (
        isEcdsaSignature(data.signature) &&
        (data.key !== undefined || data.keyManager !== undefined)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            '--key and --key-manager are only valid with an ED25519 (64-byte) signature.',
        });
      }

      if (
        isEd25519Signature(data.signature) &&
        data.expectedSigner !== undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            '--expected-signer is only valid with an ECDSA (65-byte) signature.',
        });
      }
    }
  });

export type Eip712VerifyInput = z.infer<typeof Eip712VerifyInputSchema>;
