/**
 * Remove Credentials Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Remove Credentials Command Output Schema
 */
export const CredentialsRemoveOutputSchema = z.object({
  keyRefId: z.string().describe('Key reference ID that was removed'),
  removed: z
    .boolean()
    .describe('Whether the credentials were successfully removed'),
});

export type CredentialsRemoveOutput = z.infer<
  typeof CredentialsRemoveOutputSchema
>;

/**
 * Human-readable template for remove credentials output
 */
export const CREDENTIALS_REMOVE_TEMPLATE = `
{{#if removed}}
✅ Credentials removed successfully
   Key Reference ID: {{keyRefId}}
{{else}}
❌ Failed to remove credentials
   Key Reference ID: {{keyRefId}}
{{/if}}
`.trim();
