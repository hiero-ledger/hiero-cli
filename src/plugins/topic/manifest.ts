/**
 * Topic Plugin Manifest
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

// Import output specifications from each command
import {
  CREATE_TOPIC_TEMPLATE,
  createTopic,
  CreateTopicOutputSchema,
} from './commands/create';
import {
  DELETE_TOPIC_TEMPLATE,
  deleteTopic,
  DeleteTopicOutputSchema,
} from './commands/delete';
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
  commands: [
    {
      name: 'create',
      summary: 'Create a new Hedera topic',
      description:
        'Create a new Hedera Consensus Service topic with optional memo and keys',
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
          type: OptionType.STRING,
          required: false,
          default: false,
          description:
            'Admin key as account name or {accountId}:{private_key} format',
          short: 'a',
        },
        {
          name: 'submit-key',
          type: OptionType.STRING,
          required: false,
          description:
            'Submit key as account name or {accountId}:{private_key} format',
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
            'Account to use for signing the message. Can be an alias or {accountId}:{private_key}. Required for public topics (without submit keys). For topics with submit keys, must be one of the authorized signers.',
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
      handler: submitMessage,
      output: {
        schema: SubmitMessageOutputSchema,
        humanTemplate: SUBMIT_MESSAGE_TEMPLATE,
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
      handler: deleteTopic,
      output: {
        schema: DeleteTopicOutputSchema,
        humanTemplate: DELETE_TOPIC_TEMPLATE,
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
      handler: findMessage,
      output: {
        schema: FindMessagesOutputSchema,
        humanTemplate: FIND_MESSAGES_TEMPLATE,
      },
    },
  ],
};

export default topicPluginManifest;
