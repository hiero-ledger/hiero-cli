/**
 * Token Plugin Structure Tests
 * Validates the plugin structure and exports
 */
import {
  associateToken,
  createToken,
  createTokenFromFile,
  transferToken,
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
    expect(transferToken).toBeDefined();
    expect(createToken).toBeDefined();
    expect(associateToken).toBeDefined();
    expect(createTokenFromFile).toBeDefined();
  });

  test('command handlers should be functions', () => {
    expect(typeof transferToken).toBe('function');
    expect(typeof createToken).toBe('function');
    expect(typeof associateToken).toBe('function');
    expect(typeof createTokenFromFile).toBe('function');
  });
});
