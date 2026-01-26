import { z } from 'zod';

/**
 * Input schema for contract deploy command
 * Validates all user-provided arguments
 */
export const DeployContractInputSchema = z.object({
  'bytecode-file': z.string().min(1, 'Bytecode file path is required'),
  gas: z
    .number()
    .positive('Gas must be a positive number')
    .int('Gas must be an integer'),
  'constructor-params': z.string().optional(),
  'initial-balance': z.string().optional(),
  memo: z.string().max(100, 'Memo must be 100 bytes or less').optional(),
  'admin-key': z.string().optional(),
});

export type DeployContractInput = z.infer<typeof DeployContractInputSchema>;
