import { z } from 'zod';

/**
 * Input schema for subgraph create command.
 */
export const SubgraphCreateInputSchema = z.object({
  dir: z
    .string()
    .min(1, 'Output directory is required')
    .describe('Directory where the subgraph project will be created'),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      'Subgraph name must be alphanumeric with optional - or _',
    )
    .optional()
    .default('Greeter')
    .describe('Subgraph name (used in graph create/deploy)'),
  contractAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Contract address must be 0x + 40 hex chars')
    .optional()
    .describe(
      'Deployed Greeter contract address (0x...). Omit to use placeholder.',
    ),
  startBlock: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Start block for indexing. Omit to use 1 (replace after deployment).',
    ),
});

export type SubgraphCreateInput = z.infer<typeof SubgraphCreateInputSchema>;
