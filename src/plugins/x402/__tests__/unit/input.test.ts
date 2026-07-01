import { X402SignInputSchema } from '@/plugins/x402/commands/sign/input';

test('parses a minimal valid input', () => {
  const parsed = X402SignInputSchema.parse({ challenge: 'abc123' });
  expect(parsed.challenge).toBe('abc123');
  expect(parsed.from).toBeUndefined();
});

test('rejects an empty challenge', () => {
  expect(() => X402SignInputSchema.parse({ challenge: '' })).toThrow();
});

test('accepts an optional asset', () => {
  const parsed = X402SignInputSchema.parse({
    challenge: 'abc',
    asset: '0.0.429274',
  });
  expect(parsed.asset).toBe('0.0.429274');
});
