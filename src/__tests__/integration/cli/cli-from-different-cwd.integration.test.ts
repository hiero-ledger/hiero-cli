/**
 * Integration test: CLI works from different working directories
 * Verifies that plugin paths are absolute
 */
import { execSync } from 'child_process';
import * as path from 'path';

describe('CLI from different working directories', () => {
  const CLI_PATH = path.resolve(__dirname, '../../../../dist/hiero-cli.js');

  it('should load plugins when run from project root', () => {
    const result = execSync(`node ${CLI_PATH} --help`, {
      cwd: path.resolve(__dirname, '../../../..'),
      encoding: 'utf-8',
    });

    expect(result).toContain('account');
    expect(result).toContain('topic');
    expect(result).not.toContain('Error');
  });

  it('should load plugins when run from /tmp', () => {
    const result = execSync(`node ${CLI_PATH} --help`, {
      cwd: '/tmp',
      encoding: 'utf-8',
    });

    expect(result).toContain('account');
    expect(result).toContain('topic');
    expect(result).not.toContain('Error');
    expect(result).not.toContain('Cannot find module');
  });

  it('should execute account command from different cwd', () => {
    const result = execSync(`node ${CLI_PATH} account --help`, {
      cwd: '/tmp',
      encoding: 'utf-8',
    });

    expect(result).toContain('list');
    expect(result).not.toContain('Error');
  });

  it('should return JSON error when required option is missing with --format json', () => {
    let stdout = '';
    try {
      execSync(`node ${CLI_PATH} --format json topic submit-message`, {
        cwd: path.resolve(__dirname, '../../../..'),
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (e: unknown) {
      const err = e as { stdout: string };
      stdout = err.stdout;
    }

    const parsed = JSON.parse(stdout) as { status: string; code: string };
    expect(parsed.status).toBe('failure');
    expect(parsed.code).toBe('VALIDATION_ERROR');
  });
});
