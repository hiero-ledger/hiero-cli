import { z } from 'zod';

import { AliasNameSchema, KeyRefIdSchema } from '@/core/schemas';

/**
 * Input schema for credentials remove command.
 * A credential is removed by either its key reference id OR its alias.
 * The exactly-one-of constraint is enforced here so it surfaces as a
 * ValidationError with a precise message.
 */
export const CredentialsRemoveInputSchema = z
  .object({
    id: KeyRefIdSchema.describe(
      'Key reference ID to remove from KMS',
    ).optional(),
    alias: AliasNameSchema.describe('Key alias to remove').optional(),
  })
  .superRefine(({ id, alias }, ctx) => {
    if (!id && !alias) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either --id or --alias',
      });
    } else if (id && alias) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide only one of --id or --alias, not both',
      });
    }
  });

export type CredentialsRemoveInput = z.infer<
  typeof CredentialsRemoveInputSchema
>;
