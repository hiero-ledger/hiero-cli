/**
 * Test Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import {
  FOO_TEST_TEMPLATE,
  fooTestOptions,
  FooTestOutputSchema,
} from './commands/foo';

export const testPluginManifest: PluginManifest = {
  name: 'test',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'For integration plugin',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  capabilities: ['test:read'],
  commands: [
    {
      name: 'foo',
      summary: 'Foo Test',
      description:
        'Does nothing, integration test only for plugin registration',
      options: [],
      handler: fooTestOptions,
      output: {
        schema: FooTestOutputSchema,
        humanTemplate: FOO_TEST_TEMPLATE,
      },
    },
  ],
  stateSchemas: [],
  init: () => {
    console.log('[TEST PLUGIN] Initializing foo plugin...');
  },
  teardown: () => {
    console.log('[TEST PLUGIN] Tearing down foo plugin...');
  },
};

export default testPluginManifest;
