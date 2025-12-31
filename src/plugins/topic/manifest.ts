/**
 * Topic Plugin Manifest
 */
import type { PluginManifest } from '@/core';

// Import output specifications from each command
import {
  CREATE_TOPIC_TEMPLATE,
  createTopic,
  CreateTopicOutputSchema,
} from './commands/create';
import {
  FIND_MESSAGES_TEMPLATE,
  findMessage,
  FindMessagesOutputSchema,
} from './commands/find-message';
import {
  LIST_TOPICS_TEMPLATE,
  listTopics,
  ListTopicsOutputSchema,
} from './commands/list';
import {
  SUBMIT_MESSAGE_TEMPLATE,
  submitMessage,
  SubmitMessageOutputSchema,
} from './commands/submit-message';

export const TOPIC_NAMESPACE = 'topic-topics';

export const topicPluginManifest: PluginManifest = {
  name: 'topic',
  version: '1.0.0',
  displayName: 'Topic Plugin',
  description:
    'Plugin for managing Hedera Consensus Service topics and messages',
  compatibility: {
    cli: '^1.0.0',
    core: '^1.0.0',
    api: '^1.0.0',
  },
  commands: [
    {
      name: 'create',
      summary: 'Create a new Hedera topic',
      description:
        'Create a new Hedera Consensus Service topic with optional memo and keys',
      options: [
        {
          name: 'memo',
          type: 'string',
          required: false,
          description: 'The memo',
          short: 'm',
        },
        {
          name: 'admin-key',
          type: 'string',
          required: false,
          default: false,
          description:
            'Admin key as account name or {accountId}:{private_key} format',
          short: 'a',
        },
        {
          name: 'submit-key',
          type: 'string',
          required: false,
          description:
            'Submit key as account name or {accountId}:{private_key} format',
          short: 's',
        },
        {
          name: 'name',
          short: 'n',
          type: 'string',
          required: false,
          description: 'Define the name for this topic',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
        },
      ],
      handler: createTopic,
      output: {
        schema: CreateTopicOutputSchema,
        humanTemplate: CREATE_TOPIC_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List all topics',
      description: 'List all topics stored in the state',
      options: [],
      handler: listTopics,
      output: {
        schema: ListTopicsOutputSchema,
        humanTemplate: LIST_TOPICS_TEMPLATE,
      },
    },
    {
      name: 'submit-message',
      summary: 'Submit a message to a topic',
      description: 'Submit a message to a Hedera Consensus Service topic',
      options: [
        {
          name: 'topic',
          type: 'string',
          required: true,
          description: 'The topic ID or topic name',
          short: 't',
        },
        {
          name: 'message',
          type: 'string',
          required: true,
          description: 'Submit a message to the topic',
          short: 'm',
        },
        {
          name: 'signer',
          type: 'string',
          required: false,
          description:
            'Account to use for signing the message. Can be an alias or {accountId}:{private_key}. Required for public topics (without submit keys). For topics with submit keys, must be one of the authorized signers.',
          short: 's',
        },
        {
          name: 'key-manager',
          type: 'string',
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
          short: 'k',
        },
      ],
      handler: submitMessage,
      output: {
        schema: SubmitMessageOutputSchema,
        humanTemplate: SUBMIT_MESSAGE_TEMPLATE,
      },
    },
    {
      name: 'find-message',
      summary: 'Find messages in a topic',
      description: 'Find messages in a topic by sequence number or filters',
      options: [
        {
          name: 'topic',
          type: 'string',
          required: true,
          description: 'The topic ID or topic name',
          short: 't',
        },
        {
          name: 'sequence-gt',
          type: 'number',
          required: false,
          description: 'Filter by sequence number greater than',
          short: 'g',
        },
        {
          name: 'sequence-gte',
          short: 'G',
          type: 'number',
          required: false,
          description: 'Filter by sequence number greater than or equal to',
        },
        {
          name: 'sequence-lt',
          short: 'l',
          type: 'number',
          required: false,
          description: 'Filter by sequence number less than',
        },
        {
          name: 'sequence-lte',
          short: 'L',
          type: 'number',
          required: false,
          description: 'Filter by sequence number less than or equal to',
        },
        {
          name: 'sequence-eq',
          short: 'e',
          type: 'number',
          required: false,
          description: 'Filter by sequence number equal to',
        },
      ],
      handler: findMessage,
      output: {
        schema: FindMessagesOutputSchema,
        humanTemplate: FIND_MESSAGES_TEMPLATE,
      },
    },
  ],
};

export default topicPluginManifest;
