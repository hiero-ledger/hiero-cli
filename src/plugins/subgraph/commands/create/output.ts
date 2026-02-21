import { z } from 'zod';

export const SubgraphCreateOutputSchema = z.object({
  dir: z.string().describe('Absolute path where the subgraph was created'),
  name: z.string().describe('Subgraph name'),
  contractAddress: z.string().describe('Contract address configured'),
  startBlock: z.number().describe('Start block configured'),
  filesCreated: z.array(z.string()).describe('Paths of created files'),
  nextSteps: z.array(z.string()).describe('Suggested next steps'),
});

export type SubgraphCreateOutput = z.infer<typeof SubgraphCreateOutputSchema>;

export const SUBGRAPH_CREATE_TEMPLATE = `
✅ Subgraph project created

Directory: {{dir}}
Name: {{name}}
Contract: {{contractAddress}}
Start block: {{startBlock}}

Files created:
{{#each filesCreated}}
  • {{this}}
{{/each}}

Next steps:
{{#each nextSteps}}
  • {{this}}
{{/each}}
`.trim();
