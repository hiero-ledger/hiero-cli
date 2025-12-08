import { z } from 'zod';
import { NetworkSchema } from '../../../../core/schemas/common-schemas';

export const NetworkHealthStatusSchema = z.object({
  status: z.string(),
  code: z.number().optional(),
});

export const ListNetworksOutputSchema = z.object({
  networks: z.array(
    z.object({
      name: NetworkSchema,
      isActive: z.boolean(),
      mirrorNodeUrl: z.string(),
      rpcUrl: z.string(),
      operatorId: z.string().optional(),
      mirrorNodeHealth: NetworkHealthStatusSchema.optional(),
      rpcHealth: NetworkHealthStatusSchema.optional(),
    }),
  ),
  activeNetwork: NetworkSchema,
});

export type ListNetworksOutput = z.infer<typeof ListNetworksOutputSchema>;

export const LIST_NETWORKS_TEMPLATE = `
Available networks:

{{#each networks}}
{{#if isActive}}●{{else}}○{{/if}} {{name}}{{#if isActive}} (ACTIVE){{/if}}
   {{#if operatorId}}
   └─ Operator: {{operatorId}}
   {{else}}
   └─ Operator: Not configured
   {{/if}}
   {{#if isActive}}
   {{#if mirrorNodeHealth}}
   └─ Mirror Node: {{mirrorNodeUrl}} {{mirrorNodeHealth.status}}{{#if mirrorNodeHealth.code}} ({{mirrorNodeHealth.code}}){{/if}}
   {{/if}}
   {{#if rpcHealth}}
   └─ RPC URL: {{rpcUrl}} {{rpcHealth.status}}{{#if rpcHealth.code}} ({{rpcHealth.code}}){{/if}}
   {{/if}}
   {{/if}}

{{/each}}
`.trim();
