import { z } from 'zod';

export const FooTestOutputSchema = z.object({
  bar: z.string().trim(),
});

export type FooTestOutput = z.infer<typeof FooTestOutputSchema>;

export const FOO_TEST_TEMPLATE = `
📝 FOO TEST Plugin
`.trim();
