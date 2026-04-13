import { z } from 'zod';

import { KeyManagerTypeSchema, KeySchema } from '@/core/schemas';
import {
  EntityIdSchema,
  EntityReferenceSchema,
} from '@/core/schemas/common-schemas';

export const MAX_REJECT_SERIALS = 10;

export const TokenRejectAirdropInputSchema = z.object({
  account: EntityReferenceSchema.describe('Owner account ID or alias'),
  token: EntityIdSchema.describe('Token ID to reject (e.g. 0.0.5867883)'),
  serial: z
    .preprocess(
      (val) => {
        if (val === undefined || val === null) return undefined;
        const str = typeof val === 'string' ? val : '';
        return str.split(',').map((s) => parseInt(s.trim(), 10));
      },
      z.array(z.number().int().min(1)).max(MAX_REJECT_SERIALS).optional(),
    )
    .describe(
      'NFT serial number(s). Required for NFT tokens. Comma-separated: 1,2,3',
    ),
  from: KeySchema.optional().describe('Signing account. Defaults to operator.'),
  keyManager: KeyManagerTypeSchema.optional(),
});

export type TokenRejectAirdropInput = z.infer<
  typeof TokenRejectAirdropInputSchema
>;
