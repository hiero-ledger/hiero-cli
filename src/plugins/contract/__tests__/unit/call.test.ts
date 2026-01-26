/**
 * Contract Call Command Handler Tests
 * Basic tests for input validation and output schema
 */
import { CallContractInputSchema } from '@/plugins/contract/commands/call/input';
import { CallContractOutputSchema } from '@/plugins/contract/commands/call/output';

describe('contract plugin - call command', () => {
  describe('input validation', () => {
    test('validates required contract parameter', () => {
      const result = CallContractInputSchema.safeParse({
        function: 'getValue',
        gas: 30000,
        // Missing contract
      });
      expect(result.success).toBe(false);
    });

    test('validates required function parameter', () => {
      const result = CallContractInputSchema.safeParse({
        contract: '0.0.123456',
        gas: 30000,
        // Missing function
      });
      expect(result.success).toBe(false);
    });

    test('accepts valid input with all parameters', () => {
      const result = CallContractInputSchema.safeParse({
        contract: '0.0.123456',
        function: 'getValue',
        gas: 50000,
        params: '["test"]',
      });
      expect(result.success).toBe(true);
    });

    test('accepts input with default gas', () => {
      const result = CallContractInputSchema.safeParse({
        contract: '0.0.123456',
        function: 'getValue',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gas).toBe(30000);
      }
    });
  });

  describe('output schema', () => {
    test('validates output format', () => {
      const output = {
        contractId: '0.0.123456',
        functionName: 'getValue',
        result: 'uint256: 42',
        resultHex:
          '0x000000000000000000000000000000000000000000000000000000000000002a',
        gasUsed: 25000,
      };

      const result = CallContractOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    test('requires all output fields', () => {
      const output = {
        contractId: '0.0.123456',
        functionName: 'getValue',
        // Missing result, resultHex, gasUsed
      };

      const result = CallContractOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });
  });
});
