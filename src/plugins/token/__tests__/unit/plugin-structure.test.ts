/**
 * Token Plugin Structure Tests
 * Validates the plugin structure and exports
 */
import {
  tokenAssociate,
  tokenCreateFt,
  tokenCreateFtFromFile,
  tokenTransferFt,
} from '@/plugins/token/index';
import { tokenPluginManifest } from '@/plugins/token/manifest';

describe('Token Plugin Structure', () => {
  test('manifest should be properly defined', () => {
    expect(tokenPluginManifest).toBeDefined();
    expect(tokenPluginManifest.name).toBe('token');
    expect(tokenPluginManifest.version).toBe('1.0.0');
    expect(tokenPluginManifest.displayName).toBe('Token Plugin');
  });

  test('manifest should declare all commands', () => {
    const commandNames = tokenPluginManifest.commands.map((cmd) => cmd.name);
    expect(commandNames).toContain('create-ft');
    expect(commandNames).toContain('associate');
    expect(commandNames).toContain('transfer-ft');
    expect(commandNames).toContain('create-ft-from-file');
    expect(commandNames).toContain('list');
  });

  test('command handlers should be exported', () => {
    expect(tokenTransferFt).toBeDefined();
    expect(tokenCreateFt).toBeDefined();
    expect(tokenAssociate).toBeDefined();
    expect(tokenCreateFtFromFile).toBeDefined();
  });

  test('command handlers should be functions', () => {
    expect(typeof tokenTransferFt).toBe('function');
    expect(typeof tokenCreateFt).toBe('function');
    expect(typeof tokenAssociate).toBe('function');
    expect(typeof tokenCreateFtFromFile).toBe('function');
  });
});
