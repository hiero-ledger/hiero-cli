/**
 * Verify Command Output Schema and Template
 */
import { z } from 'zod';

const CheckResultSchema = z.object({
  name: z.string(),
  status: z.enum(['pass', 'fail', 'skip']),
  message: z.string(),
});

export const VerifyOutputSchema = z.object({
  network: z.string(),
  overallStatus: z.enum(['healthy', 'warning', 'error']),
  checks: z.array(CheckResultSchema),
  timestamp: z.string(),
});

export type VerifyOutput = z.infer<typeof VerifyOutputSchema>;
export type CheckResult = z.infer<typeof CheckResultSchema>;

export const VERIFY_TEMPLATE = `
{{#if (eq overallStatus "healthy")}}
✅ Environment Verification: HEALTHY
{{else if (eq overallStatus "warning")}}
⚠️ Environment Verification: WARNING
{{else}}
❌ Environment Verification: ERROR
{{/if}}

📡 Network: {{network}}
⏰ Checked: {{timestamp}}

📋 Diagnostic Checks:
{{#each checks}}
   {{#if (eq status "pass")}}✅{{else if (eq status "fail")}}❌{{else}}⏭️{{/if}} {{name}}: {{message}}
{{/each}}
`.trim();
