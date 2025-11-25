/**
 * Topic Plugin Manifest
 */
import { PluginManifest } from '../../core';
import { TOPIC_JSON_SCHEMA, TOPIC_NAMESPACE } from './schema';

// Import output specifications from each command
import {
  CreateTopicOutputSchema,
  CREATE_TOPIC_TEMPLATE,
} from './commands/create';
import { ListTopicsOutputSchema, LIST_TOPICS_TEMPLATE } from './commands/list';
import {
  SubmitMessageOutputSchema,
  SUBMIT_MESSAGE_TEMPLATE,
} from './commands/submit-message';
import {
  FindMessagesOutputSchema,
  FIND_MESSAGES_TEMPLATE,
} from './commands/find-message';
import { createTopic } from './commands/create/handler';
import { listTopics } from './commands/list/handler';
import { submitMessage } from './commands/submit-message/handler';
import { findMessage } from './commands/find-message/handler';

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
  capabilities: [
    `state:namespace:${TOPIC_NAMESPACE}`,
    'network:read',
    'network:write',
    'tx-execution:use',
  ],
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
            'Pass an admin key as name or private key for the topic. Private key can be optionally prefixed with key type (e.g., "ed25519:..." or "ecdsa:..."). Defaults to ecdsa if no prefix.',
          short: 'a',
        },
        {
          name: 'submit-key',
          type: 'string',
          required: false,
          default: false,
          description:
            'Pass a submit key as name or private key for the topic. Private key can be optionally prefixed with key type (e.g., "ed25519:..." or "ecdsa:..."). Defaults to ecdsa if no prefix.',
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
      options: [
        {
          name: 'network',
          type: 'string',
          required: false,
          description: 'Filter topics by network',
          short: 'n',
        },
      ],
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
          name: 'sequence',
          type: 'number',
          required: false,
          description: 'The sequence number of the message in topic',
          short: 's',
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
  stateSchemas: [
    {
      namespace: TOPIC_NAMESPACE,
      version: 1,
      jsonSchema: TOPIC_JSON_SCHEMA,
      scope: 'profile',
    },
  ],
};

export default topicPluginManifest;
