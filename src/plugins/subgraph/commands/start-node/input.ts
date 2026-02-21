import { z } from 'zod';

export const SubgraphStartNodeInputSchema = z.object({
  dir: z
    .string()
    .min(1)
    .optional()
    .default('.')
    .describe(
      'Subgraph project directory containing graph-node/docker-compose.yaml',
    ),
});

export type SubgraphStartNodeInput = z.infer<
  typeof SubgraphStartNodeInputSchema
>;
