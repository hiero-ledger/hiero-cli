import { z } from 'zod';

export const TestFooOutputSchema = z.object({
  bar: z.string().trim(),
});

export type TestFooOutput = z.infer<typeof TestFooOutputSchema>;

export const TEST_FOO_TEMPLATE = `
📝 FOO TEST Plugin {{bar}}
`.trim();
