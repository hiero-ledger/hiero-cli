/**
 * Remove Credentials Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Remove Credentials Command Output Schema
 */
export const RemoveCredentialsOutputSchema = z.object({
  keyRefId: z.string().describe('Key reference ID that was removed'),
  removed: z
    .boolean()
    .describe('Whether the credentials were successfully removed'),
});

export type RemoveCredentialsOutput = z.infer<
  typeof RemoveCredentialsOutputSchema
>;

/**
 * Human-readable template for remove credentials output
 */
export const REMOVE_CREDENTIALS_TEMPLATE = `
{{#if removed}}
✅ Credentials removed successfully
   Key Reference ID: {{keyRefId}}
{{else}}
❌ Failed to remove credentials
   Key Reference ID: {{keyRefId}}
{{/if}}
`.trim();
