import { z } from 'zod';

import {
  Eip712DomainSchema,
  Eip712Ed25519SignatureSchema,
  Eip712TypesSchema,
  HashSchema,
  KeyManagerTypeSchema,
  KeySchema,
  typedJsonInput,
} from '@/core/schemas';

export const Ed25519VerifyInputSchema = z
  .object({
    key: KeySchema.optional().describe(
      'Public key to verify against. Can be a key reference, account alias, or account ID.',
    ),
    keyManager: KeyManagerTypeSchema.optional().describe(
      'Key manager type (defaults to config setting)',
    ),
    hash: HashSchema.optional().describe(
      'Pre-computed EIP-712 digest (0x-prefixed hex). Provide this OR domain+types+message, not both.',
    ),
    domain: typedJsonInput(Eip712DomainSchema)
      .optional()
      .describe('EIP-712 domain as inline JSON or path to a JSON file'),
    types: typedJsonInput(Eip712TypesSchema)
      .optional()
      .describe(
        'EIP-712 types definition as inline JSON or path to a JSON file',
      ),
    message: typedJsonInput(z.record(z.string(), z.unknown()))
      .optional()
      .describe('Signed message object as inline JSON or path to a JSON file'),
    signature: Eip712Ed25519SignatureSchema.describe(
      'Signature to verify (0x-prefixed 64-byte hex)',
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

export type Ed25519VerifyInput = z.infer<typeof Ed25519VerifyInputSchema>;
