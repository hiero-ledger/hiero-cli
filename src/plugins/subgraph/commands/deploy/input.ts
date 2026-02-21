import { z } from 'zod';

export const SubgraphDeployInputSchema = z.object({
  dir: z
    .string()
    .min(1)
    .optional()
    .default('.')
    .describe('Subgraph project directory (must contain subgraph.yaml)'),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
    .optional()
    .default('Greeter')
    .describe('Subgraph name (must match dataSources in subgraph.yaml)'),
  versionLabel: z
    .string()
    .min(1)
    .optional()
    .default('v0.0.1')
    .describe('Version label for this deployment (e.g. v0.0.1)'),
  skipCodegen: z
    .boolean()
    .optional()
    .default(false)
    .describe('Skip graph codegen (use if already generated)'),
  skipBuild: z
    .boolean()
    .optional()
    .default(false)
    .describe('Skip graph build (use if already built)'),
});

export type SubgraphDeployInput = z.infer<typeof SubgraphDeployInputSchema>;
