/**
 * Contract Deploy Command Handler Tests
 * Basic tests for input validation and output schema
 */
import { DeployContractInputSchema } from '@/plugins/contract/commands/deploy/input';
import { DeployContractOutputSchema } from '@/plugins/contract/commands/deploy/output';

describe('contract plugin - deploy command', () => {
  describe('input validation', () => {
    test('validates required bytecode-file parameter', () => {
      const result = DeployContractInputSchema.safeParse({
        gas: 100000,
        // Missing bytecode-file
      });
      expect(result.success).toBe(false);
    });

    test('validates required gas parameter', () => {
      const result = DeployContractInputSchema.safeParse({
        'bytecode-file': '/path/to/contract.bin',
        // Missing gas
      });
      expect(result.success).toBe(false);
    });

    test('validates gas must be positive', () => {
      const result = DeployContractInputSchema.safeParse({
        'bytecode-file': '/path/to/contract.bin',
        gas: -100,
      });
      expect(result.success).toBe(false);
    });

    test('validates memo max length', () => {
      const result = DeployContractInputSchema.safeParse({
        'bytecode-file': '/path/to/contract.bin',
        gas: 100000,
        memo: 'a'.repeat(200), // Too long
      });
      expect(result.success).toBe(false);
    });

    test('accepts valid input', () => {
      const result = DeployContractInputSchema.safeParse({
        'bytecode-file': '/path/to/contract.bin',
        gas: 100000,
        memo: 'Test Contract',
        'initial-balance': '10',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('output schema', () => {
    test('validates output format', () => {
      const output = {
        contractId: '0.0.123456',
        transactionId: '0.0.2@1706035200.123456789',
        bytecodeSize: 1024,
        memo: 'Test',
        timestamp: new Date().toISOString(),
      };

      const result = DeployContractOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    test('accepts output without optional memo', () => {
      const output = {
        contractId: '0.0.123456',
        transactionId: '0.0.2@1706035200.123456789',
        bytecodeSize: 1024,
        timestamp: new Date().toISOString(),
      };

      const result = DeployContractOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });
});
