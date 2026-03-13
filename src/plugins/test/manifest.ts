/**
 * Test Plugin Manifest
 * Provides commands to list, get and set configuration options
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';
import { TEST_MEMO_TEMPLATE, testMemo } from '@/plugins/test/commands/memo';
import { TestMemoOutputSchema } from '@/plugins/test/commands/memo/output';

import {
  TEST_FOO_TEMPLATE,
  testFoo,
  TestFooOutputSchema,
} from './commands/foo';

export const MEMO_NAMESPACE = 'memo-memos';

export const testPluginManifest: PluginManifest = {
  name: 'test',
  version: '1.0.0',
  displayName: 'Test Plugin',
  description: 'For integration plugin',
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
          type: OptionType.STRING,
          required: true,
          description: 'Message to print. Max size should be 100 characters',
        },
      ],
      handler: testFoo,
      output: {
        schema: TestFooOutputSchema,
        humanTemplate: TEST_FOO_TEMPLATE,
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
          type: OptionType.STRING,
          required: true,
          description: 'Account alias present in state',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: true,
          description: 'Memo for an account. Max size should be 100 characters',
        },
      ],
      handler: testMemo,
      output: {
        schema: TestMemoOutputSchema,
        humanTemplate: TEST_MEMO_TEMPLATE,
      },
    },
  ],
};

export default testPluginManifest;
