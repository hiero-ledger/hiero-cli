import * as fs from 'node:fs';

import { parseCsvFile } from '@/plugins/batch/utils/csv-parser';

// Mock node:fs
jest.mock('node:fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('csv-parser (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  test('parses a simple CSV with required headers', () => {
    mockFs.readFileSync.mockReturnValue(
      'to,amount\n0.0.12345,10\n0.0.67890,20',
    );

    const result = parseCsvFile('/test/data.csv', ['to', 'amount']);

    expect(result.headers).toEqual(['to', 'amount']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ to: '0.0.12345', amount: '10' });
    expect(result.rows[1]).toEqual({ to: '0.0.67890', amount: '20' });
  });

  test('handles headers case-insensitively', () => {
    mockFs.readFileSync.mockReturnValue('TO,AMOUNT\n0.0.12345,10');

    const result = parseCsvFile('/test/data.csv', ['to', 'amount']);

    expect(result.headers).toEqual(['to', 'amount']);
    expect(result.rows[0]).toEqual({ to: '0.0.12345', amount: '10' });
  });

  test('trims whitespace from fields', () => {
    mockFs.readFileSync.mockReturnValue('to, amount\n  0.0.12345 , 10  ');

    const result = parseCsvFile('/test/data.csv', ['to', 'amount']);

    expect(result.rows[0]).toEqual({ to: '0.0.12345', amount: '10' });
  });

  test('handles quoted fields with commas', () => {
    mockFs.readFileSync.mockReturnValue(
      'metadata\n"hello, world"\n"another, value"',
    );

    const result = parseCsvFile('/test/data.csv', ['metadata']);

    expect(result.rows[0]).toEqual({ metadata: 'hello, world' });
    expect(result.rows[1]).toEqual({ metadata: 'another, value' });
  });

  test('handles escaped quotes in fields', () => {
    mockFs.readFileSync.mockReturnValue('metadata\n"say ""hello"""\nsimple');

    const result = parseCsvFile('/test/data.csv', ['metadata']);

    expect(result.rows[0]).toEqual({ metadata: 'say "hello"' });
    expect(result.rows[1]).toEqual({ metadata: 'simple' });
  });

  test('handles Windows-style line endings', () => {
    mockFs.readFileSync.mockReturnValue(
      'to,amount\r\n0.0.12345,10\r\n0.0.67890,20',
    );

    const result = parseCsvFile('/test/data.csv', ['to', 'amount']);

    expect(result.rows).toHaveLength(2);
  });

  test('skips blank lines', () => {
    mockFs.readFileSync.mockReturnValue(
      'to,amount\n0.0.12345,10\n\n0.0.67890,20\n',
    );

    const result = parseCsvFile('/test/data.csv', ['to', 'amount']);

    expect(result.rows).toHaveLength(2);
  });

  test('throws when file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);

    expect(() => parseCsvFile('/test/missing.csv', ['to'])).toThrow(
      'CSV file not found',
    );
  });

  test('throws when file is empty', () => {
    mockFs.readFileSync.mockReturnValue('');

    expect(() => parseCsvFile('/test/empty.csv', ['to'])).toThrow(
      'CSV file is empty',
    );
  });

  test('throws when file has only headers', () => {
    mockFs.readFileSync.mockReturnValue('to,amount');

    expect(() => parseCsvFile('/test/headers-only.csv', ['to'])).toThrow(
      'CSV file contains only headers and no data rows',
    );
  });

  test('throws when required headers are missing', () => {
    mockFs.readFileSync.mockReturnValue('name,value\nfoo,bar');

    expect(() => parseCsvFile('/test/data.csv', ['to', 'amount'])).toThrow(
      'CSV file is missing required headers: to, amount',
    );
  });

  test('throws when row has wrong number of fields', () => {
    mockFs.readFileSync.mockReturnValue('to,amount\n0.0.12345,10,extra');

    expect(() => parseCsvFile('/test/data.csv', ['to', 'amount'])).toThrow(
      'CSV row 1 has 3 fields but expected 2',
    );
  });

  test('handles optional extra columns beyond required', () => {
    mockFs.readFileSync.mockReturnValue(
      'to,amount,memo\n0.0.12345,10,test memo',
    );

    const result = parseCsvFile('/test/data.csv', ['to', 'amount']);

    expect(result.headers).toEqual(['to', 'amount', 'memo']);
    expect(result.rows[0]).toEqual({
      to: '0.0.12345',
      amount: '10',
      memo: 'test memo',
    });
  });
});
