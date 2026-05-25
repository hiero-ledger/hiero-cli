import { z } from 'zod';

import { BooleanStringSchema } from '@/core';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { LogLevel } from '@/core/types/shared.types';

export const ConfigSetInputSchema = z
  .object({
    default_key_manager: z
      .enum(KeyManager)
      .optional()
      .describe(
        'Default key manager - allowed values: local | local_encrypted',
      ),
    ed25519_support: BooleanStringSchema.optional().describe(
      'ED25519 support - true or false',
    ),
    log_level: z
      .enum(LogLevel)
      .optional()
      .describe(
        "Log level - allowed values: silent | error | warn | info | debug',",
      ),
    skip_confirmations: BooleanStringSchema.optional(),
  })
  .refine(
    (data) => Object.values(data).filter((v) => v !== undefined).length === 1,
    {
      message:
        'Exactly one config option flag must be provided. Use --<option> <value>',
    },
  );

export type ConfigSetInput = z.infer<typeof ConfigSetInputSchema>;
