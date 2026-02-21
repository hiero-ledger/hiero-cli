import { z } from 'zod';

export const SubgraphStartNodeOutputSchema = z.object({
  dir: z.string().describe('Project directory'),
  composeFile: z.string().describe('Path to docker-compose.yaml'),
  message: z.string().describe('Status message'),
});

export type SubgraphStartNodeOutput = z.infer<
  typeof SubgraphStartNodeOutputSchema
>;

export const SUBGRAPH_START_NODE_TEMPLATE = `
✅ Graph node starting

Project: {{dir}}
Compose file: {{composeFile}}

{{message}}
`.trim();
