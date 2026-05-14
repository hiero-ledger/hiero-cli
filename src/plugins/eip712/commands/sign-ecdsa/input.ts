import { z } from 'zod';

import {
  HexEncodedDataSchema,
  JsonInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const Eip712SignEcdsaInputSchema = z
  .object({
    key: KeySchema.optional().describe(
      'Signing key. Defaults to operator when omitted. Can be {accountId}:{privateKey} pair, private key in {ed25519|ecdsa}:private:{private-key} format, key reference, or account alias.',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
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
      'Message object to sign as inline JSON or path to a JSON file',
    ),
  })
  .superRefine((data, ctx) => {
    const hasHash = data.hash !== undefined;
    const hasTypedData =
      data.domain !== undefined ||
      data.types !== undefined ||
      data.message !== undefined;
    const hasAllTypedData =
      data.domain !== undefined &&
      data.types !== undefined &&
      data.message !== undefined;

    if (hasHash && hasTypedData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either hash or domain+types+message, not both.',
      });
    }

    if (!hasHash && !hasTypedData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either hash or all of domain, types, and message.',
      });
    }

    if (!hasHash && !hasAllTypedData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'When providing typed data, all three fields are required.',
      });
    }
  });

export type Eip712SignEcdsaInput = z.infer<typeof Eip712SignEcdsaInputSchema>;
