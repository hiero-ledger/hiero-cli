/**
 * CSV Parser Unit Tests
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  parseCSVFile,
  parseHbarTransferCSV,
  parseTokenTransferCSV,
} from '@/plugins/batch/utils/csv-parser';

describe('CSV Parser', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const writeTestFile = (filename: string, content: string): string => {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  describe('parseCSVFile', () => {
    test('parses basic CSV with headers', () => {
      const filePath = writeTestFile(
        'basic.csv',
        'to,amount,memo\n0.0.12345,100,Test\n0.0.12346,200,',
      );

      const rows = parseCSVFile(filePath);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ to: '0.0.12345', amount: '100', memo: 'Test' });
      expect(rows[1]).toEqual({ to: '0.0.12346', amount: '200', memo: '' });
    });

    test('handles quoted fields', () => {
      const filePath = writeTestFile(
        'quoted.csv',
        'to,amount,memo\n0.0.12345,100,"Hello, World"\n0.0.12346,200,"Test ""quoted"""\n',
      );

      const rows = parseCSVFile(filePath);

      expect(rows).toHaveLength(2);
      expect(rows[0].memo).toBe('Hello, World');
      expect(rows[1].memo).toBe('Test "quoted"');
    });

    test('ignores comment lines starting with #', () => {
      const filePath = writeTestFile(
        'comments.csv',
        '# This is a comment\nto,amount,memo\n0.0.12345,100,Test\n# Another comment\n0.0.12346,200,Test2\n',
      );

      const rows = parseCSVFile(filePath);

      expect(rows).toHaveLength(2);
    });

    test('throws error for non-existent file', () => {
      expect(() => parseCSVFile('/nonexistent/file.csv')).toThrow(
        'File not found',
      );
    });

    test('throws error for empty file', () => {
      const filePath = writeTestFile('empty.csv', 'to,amount,memo\n');

      expect(() => parseCSVFile(filePath)).toThrow(
        'CSV file must contain a header row and at least one data row',
      );
    });
  });

  describe('parseHbarTransferCSV', () => {
    test('parses valid HBAR transfer CSV', () => {
      const filePath = writeTestFile(
        'hbar.csv',
        'to,amount,memo\n0.0.12345,100,Payment\n0.0.12346,50.5,\n',
      );

      const { rows, errors } = parseHbarTransferCSV(filePath);

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        to: '0.0.12345',
        amount: '100',
        memo: 'Payment',
      });
      expect(rows[1].to).toBe('0.0.12346');
      expect(rows[1].amount).toBe('50.5');
      // memo can be empty string or undefined depending on schema processing
    });

    test('handles tinybar amounts', () => {
      const filePath = writeTestFile(
        'hbar-tiny.csv',
        'to,amount,memo\n0.0.12345,100t,Tinybars\n',
      );

      const { rows, errors } = parseHbarTransferCSV(filePath);

      expect(errors).toHaveLength(0);
      expect(rows[0].amount).toBe('100t');
    });

    test('reports validation errors with line numbers', () => {
      const filePath = writeTestFile(
        'hbar-invalid.csv',
        'to,amount,memo\n0.0.12345,100,OK\ninvalid-account,50,Bad\n0.0.12347,not-a-number,\n',
      );

      const { rows, errors } = parseHbarTransferCSV(filePath);

      expect(rows).toHaveLength(1);
      expect(errors).toHaveLength(2);
      expect(errors[0].line).toBe(3);
      expect(errors[0].error).toContain('to');
      expect(errors[1].line).toBe(4);
      expect(errors[1].error).toContain('amount');
    });
  });

  describe('parseTokenTransferCSV', () => {
    test('parses valid token transfer CSV', () => {
      const filePath = writeTestFile(
        'token.csv',
        'to,amount,memo\n0.0.12345,1000,Airdrop\n0.0.12346,500,\n',
      );

      const { rows, errors } = parseTokenTransferCSV(filePath);

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        to: '0.0.12345',
        amount: '1000',
        memo: 'Airdrop',
      });
    });

    test('validates account IDs', () => {
      const filePath = writeTestFile(
        'token-invalid.csv',
        'to,amount,memo\nbad-id,1000,Test\n',
      );

      const { rows, errors } = parseTokenTransferCSV(filePath);

      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('to');
    });
  });
});
