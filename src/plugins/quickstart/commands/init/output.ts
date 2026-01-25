/**
 * Init Command Output Schema and Template
 */
import { z } from 'zod';

export const InitOutputSchema = z.object({
  network: z.string(),
  previousNetwork: z.string().optional(),
  operatorId: z.string(),
  operatorBalance: z.string(),
  mirrorNodeUrl: z.string(),
  networkStatus: z.enum(['connected', 'error']),
  message: z.string(),
});

export type InitOutput = z.infer<typeof InitOutputSchema>;

export const INIT_TEMPLATE = `
{{#if (eq networkStatus "connected")}}
✅ Quickstart initialized successfully!

📡 Network Configuration:
   Network:         {{network}}
   {{#if previousNetwork}}Previous Network: {{previousNetwork}}{{/if}}
   Mirror Node:     {{mirrorNodeUrl}}

👤 Operator Account:
   Account ID:      {{operatorId}}
   Balance:         {{operatorBalance}} HBAR

{{message}}
{{else}}
❌ Quickstart initialization failed!

Network: {{network}}
Status:  {{networkStatus}}
Message: {{message}}
{{/if}}
`.trim();
