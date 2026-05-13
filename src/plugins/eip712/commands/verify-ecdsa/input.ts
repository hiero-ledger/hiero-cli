import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  Eip712DomainSchema,
  Eip712EcdsaSignatureSchema,
  Eip712TypesSchema,
  HashSchema,
  typedJsonInput,
} from '@/core/schemas';

export const Eip712VerifyEcdsaInputSchema = z
  .object({
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
    signature: Eip712EcdsaSignatureSchema.describe(
      'EIP-712 signature to verify (0x-prefixed 65-byte hex)',
    ),
    expectedSigner: AccountReferenceObjectSchema.optional().describe(
      'Account to assert against the recovered signer. Accepts an EVM address (0x...), Hedera account ID (0.0.xxx), or account alias',
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

export type Eip712VerifyEcdsaInput = z.infer<
  typeof Eip712VerifyEcdsaInputSchema
>;
