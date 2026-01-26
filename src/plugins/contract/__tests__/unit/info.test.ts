/**
 * Contract Info Command Handler Tests
 * Basic tests for input validation and output schema
 */
import { ContractInfoInputSchema } from '@/plugins/contract/commands/info/input';
import { ContractInfoOutputSchema } from '@/plugins/contract/commands/info/output';

describe('contract plugin - info command', () => {
  describe('input validation', () => {
    test('validates required contract parameter', () => {
      const result = ContractInfoInputSchema.safeParse({
        // Missing contract
      });
      expect(result.success).toBe(false);
    });

    test('accepts valid contract ID', () => {
      const result = ContractInfoInputSchema.safeParse({
        contract: '0.0.123456',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('output schema', () => {
    test('validates output format with all fields', () => {
      const output = {
        contractId: '0.0.123456',
        evmAddress: '0x1234567890abcdef1234567890abcdef12345678',
        balance: '1',
        deleted: false,
        memo: 'Test Contract',
        adminKey: '302a300506032b6570...',
        autoRenewAccountId: '0.0.789',
        autoRenewPeriod: 7776000,
        createdTimestamp: '1706035200.123456789',
        expirationTimestamp: '1706640000.000000000',
        maxAutomaticTokenAssociations: 10,
      };

      const result = ContractInfoOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    test('accepts output with only required fields', () => {
      const output = {
        contractId: '0.0.123456',
        balance: '0',
        deleted: true,
      };

      const result = ContractInfoOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    test('requires contractId', () => {
      const output = {
        balance: '0',
        deleted: false,
        // Missing contractId
      };

      const result = ContractInfoOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    test('requires balance', () => {
      const output = {
        contractId: '0.0.123456',
        deleted: false,
        // Missing balance
      };

      const result = ContractInfoOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });

    test('requires deleted boolean', () => {
      const output = {
        contractId: '0.0.123456',
        balance: '0',
        // Missing deleted
      };

      const result = ContractInfoOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });
  });
});
