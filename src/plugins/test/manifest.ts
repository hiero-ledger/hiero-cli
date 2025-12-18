/**
 * Test Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { createMemo, MEMO_TEST_TEMPLATE } from '@/plugins/test/commands/memo';
import { MemoTestOutputSchema } from '@/plugins/test/commands/memo/output';
import { MEMO_JSON_SCHEMA, MEMO_NAMESPACE } from '@/plugins/test/schema';

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
  capabilities: ['test:read', 'memo:create'],
  commands: [
    {
      name: 'foo',
      summary: 'Foo Test',
      description:
        'Does nothing, integration test only for plugin registration',
      options: [
        {
          name: 'message',
          short: 'm',
          type: 'string',
          required: true,
          description: 'Message to print. Max size should be 100 characters',
        },
      ],
      handler: fooTestOptions,
      output: {
        schema: FooTestOutputSchema,
        humanTemplate: FOO_TEST_TEMPLATE,
      },
    },
    {
      name: 'memo',
      summary: 'Memo create ',
      description:
        'Add simple memo for account present in store. One for an account',
      options: [
        {
          name: 'account',
          short: 'a',
          type: 'string',
          required: true,
          description: 'Account alias present in state',
        },
        {
          name: 'memo',
          short: 'm',
          type: 'string',
          required: true,
          description: 'Memo for an account. Max size should be 100 characters',
        },
      ],
      handler: createMemo,
      output: {
        schema: MemoTestOutputSchema,
        humanTemplate: MEMO_TEST_TEMPLATE,
      },
    },
  ],
  stateSchemas: [
    {
      namespace: MEMO_NAMESPACE,
      version: 1,
      jsonSchema: MEMO_JSON_SCHEMA,
      scope: 'profile',
    },
  ],
};

export default testPluginManifest;
