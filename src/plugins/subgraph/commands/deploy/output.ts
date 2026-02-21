import { z } from 'zod';

export const SubgraphDeployOutputSchema = z.object({
  dir: z.string().describe('Project directory'),
  name: z.string().describe('Subgraph name'),
  version: z.string().describe('Version label deployed'),
  graphqlUrl: z.string().describe('GraphQL endpoint URL'),
  stepsCompleted: z.array(z.string()).describe('Steps that ran successfully'),
});

export type SubgraphDeployOutput = z.infer<typeof SubgraphDeployOutputSchema>;

export const SUBGRAPH_DEPLOY_TEMPLATE = `
✅ Subgraph deployed

Project: {{dir}}
Name: {{name}}
Version: {{version}}

GraphQL endpoint: {{graphqlUrl}}

Steps completed:
{{#each stepsCompleted}}
  • {{this}}
{{/each}}
`.trim();
