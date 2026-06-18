/**
 * Remove Credentials Command Output Schema and Template
 */
import { z } from 'zod';

/**
 * Remove Credentials Command Output Schema
 */
export const CredentialsRemoveOutputSchema = z.object({
  keyRefId: z.string().describe('Key reference ID that was removed'),
});

export type CredentialsRemoveOutput = z.infer<
  typeof CredentialsRemoveOutputSchema
>;

/**
 * Human-readable template for remove credentials output
 */
export const CREDENTIALS_REMOVE_TEMPLATE = `
✅ Credentials removed successfully
   Key Reference ID: {{keyRefId}}
`.trim();
