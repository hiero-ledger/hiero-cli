/**
 * Topic Plugin Manifest
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

// Import output specifications from each command
import {
  TOPIC_CREATE_TEMPLATE,
  topicCreate,
  TopicCreateOutputSchema,
} from './commands/create';
import {
  TOPIC_DELETE_TEMPLATE,
  topicDelete,
  TopicDeleteOutputSchema,
} from './commands/delete';
import {
  TOPIC_FIND_MESSAGE_TEMPLATE,
  topicFindMessage,
  TopicFindMessageOutputSchema,
} from './commands/find-message';
import {
  TOPIC_IMPORT_TEMPLATE,
  topicImport,
  TopicImportOutputSchema,
} from './commands/import';
import {
  TOPIC_LIST_TEMPLATE,
  topicList,
  TopicListOutputSchema,
} from './commands/list';
import {
  TOPIC_SUBMIT_MESSAGE_TEMPLATE,
  topicSubmitMessage,
  TopicSubmitMessageOutputSchema,
} from './commands/submit-message';

export const TOPIC_NAMESPACE = 'topic-topics';

export const topicPluginManifest: PluginManifest = {
  name: 'topic',
  version: '1.0.0',
  displayName: 'Topic Plugin',
  description:
    'Plugin for managing Hedera Consensus Service topics and messages',
  commands: [
    {
      name: 'create',
      summary: 'Create a new Hedera topic',
      description:
        'Create a new Hedera Consensus Service topic with optional memo and keys',
      registeredHooks: ['batchify'],
      options: [
        {
          name: 'memo',
          type: OptionType.STRING,
          required: false,
          description: 'The memo',
          short: 'm',
        },
        {
          name: 'admin-key',
          type: OptionType.REPEATABLE,
          required: false,
          description:
            'Admin key(s) of topic. Pass multiple times for multiple keys (any one can sign). Format: {accountId}:{privateKey}, private key in {ed25519|ecdsa}:private:{key} format, key reference or account alias',
          short: 'a',
        },
        {
          name: 'submit-key',
          type: OptionType.REPEATABLE,
          required: false,
          description:
            'Submit key(s) of topic. Pass multiple times for multiple keys (any one can sign). Format: {accountId}:{privateKey}, public/private key in {ed25519|ecdsa}:public|private:{key} format, key reference or account alias',
          short: 's',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Define the name for this topic',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: topicCreate,
      output: {
        schema: TopicCreateOutputSchema,
        humanTemplate: TOPIC_CREATE_TEMPLATE,
      },
    },
    {
      name: 'import',
      summary: 'Import an existing topic',
      description:
        'Import an existing topic into state. Provide topic ID (e.g., 0.0.123456).',
      options: [
        {
          name: 'topic',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Topic ID to import (e.g., 0.0.123456)',
        },
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Name/alias for the topic',
        },
      ],
      handler: topicImport,
      output: {
        schema: TopicImportOutputSchema,
        humanTemplate: TOPIC_IMPORT_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all topics',
      description: 'List all topics stored in the state',
      options: [],
      handler: topicList,
      output: {
        schema: TopicListOutputSchema,
        humanTemplate: TOPIC_LIST_TEMPLATE,
      },
    },
    {
      name: 'submit-message',
      summary: 'Submit a message to a topic',
      description: 'Submit a message to a Hedera Consensus Service topic',
      registeredHooks: ['batchify'],
      options: [
        {
          name: 'topic',
          type: OptionType.STRING,
          required: true,
          description: 'The topic ID or topic name',
          short: 't',
        },
        {
          name: 'message',
          type: OptionType.STRING,
          required: true,
          description: 'Submit a message to the topic',
          short: 'm',
        },
        {
          name: 'signer',
          type: OptionType.STRING,
          required: false,
          description:
            'Key to sign the message with. Can be {accountId}:{privateKey} pair, account private key in {ed25519|ecdsa}:private:{private-key} format, key reference or account alias.',
          short: 's',
        },
        {
          name: 'key-manager',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
          short: 'k',
        },
      ],
      handler: topicSubmitMessage,
      output: {
        schema: TopicSubmitMessageOutputSchema,
        humanTemplate: TOPIC_SUBMIT_MESSAGE_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete a topic',
      description:
        'Delete a topic from state. Specify topic by name or topic ID',
      options: [
        {
          name: 'topic',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Topic name or topic ID to delete from state',
        },
      ],
      handler: topicDelete,
      output: {
        schema: TopicDeleteOutputSchema,
        humanTemplate: TOPIC_DELETE_TEMPLATE,
      },
      requireConfirmation:
        'Are you sure you want to delete topic {{topic}}? This action cannot be undone.',
    },
    {
      name: 'find-message',
      summary: 'Find messages in a topic',
      description: 'Find messages in a topic by sequence number or filters',
      options: [
        {
          name: 'topic',
          type: OptionType.STRING,
          required: true,
          description: 'The topic ID or topic name',
          short: 't',
        },
        {
          name: 'sequence-gt',
          type: OptionType.NUMBER,
          required: false,
          description: 'Filter by sequence number greater than',
          short: 'g',
        },
        {
          name: 'sequence-gte',
          short: 'G',
          type: OptionType.NUMBER,
          required: false,
          description: 'Filter by sequence number greater than or equal to',
        },
        {
          name: 'sequence-lt',
          short: 'l',
          type: OptionType.NUMBER,
          required: false,
          description: 'Filter by sequence number less than',
        },
        {
          name: 'sequence-lte',
          short: 'L',
          type: OptionType.NUMBER,
          required: false,
          description: 'Filter by sequence number less than or equal to',
        },
        {
          name: 'sequence-eq',
          short: 'e',
          type: OptionType.NUMBER,
          required: false,
          description: 'Filter by sequence number equal to',
        },
      ],
      handler: topicFindMessage,
      output: {
        schema: TopicFindMessageOutputSchema,
        humanTemplate: TOPIC_FIND_MESSAGE_TEMPLATE,
      },
    },
  ],
};

export default topicPluginManifest;
