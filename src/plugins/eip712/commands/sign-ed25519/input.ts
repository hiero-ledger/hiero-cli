import { z } from 'zod';

import {
  HashSchema,
  JsonInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const Ed25519SignInputSchema = z
  .object({
    key: KeySchema.optional().describe(
      'Signing key. Defaults to operator when omitted. Can be {accountId}:{privateKey} pair, private key in {ed25519|ecdsa}:private:{private-key} format, key reference, or account alias.',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
    hash: HashSchema.optional().describe(
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

    if (!hasHash && hasTypedData) {
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
  });

export type Ed25519SignInput = z.infer<typeof Ed25519SignInputSchema>;
