import { z } from 'zod';

import { BooleanStringSchema } from '@/core';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { LogLevel } from '@/core/types/shared.types';
import { processBalanceInput } from '@/core/utils/process-balance-input';

/**
 * Validates a max-transaction-fee input and normalises a zero value to '' (clear).
 * Accepts HBAR ('20') or tinybars ('200000000t'); rejects negative/malformed
 * values via processBalanceInput. A value of 0 ('0' / '0t') clears the setting.
 */
const MaxTransactionFeeSchema = z
  .string()
  .superRefine((value, ctx) => {
    try {
      processBalanceInput(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          error instanceof Error
            ? error.message
            : 'Invalid max transaction fee',
      });
    }
  })
  .transform((value) => {
    // 0 (or 0t) clears the setting back to the unset sentinel.
    try {
      return processBalanceInput(value) === 0n ? '' : value;
    } catch {
      return value;
    }
  });

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
    default_max_transaction_fee: MaxTransactionFeeSchema.optional().describe(
      'Default max transaction fee ceiling - HBAR (e.g. "20") or tinybars ("200000000t"); 0 clears it',
    ),
  })
  .refine(
    (data) => Object.values(data).filter((v) => v !== undefined).length === 1,
    {
      message:
        'Exactly one config option flag must be provided. Use --<option> <value>',
    },
  );

export type ConfigSetInput = z.infer<typeof ConfigSetInputSchema>;
