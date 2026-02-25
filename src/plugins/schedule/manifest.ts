import type { PluginManifest } from '@/core/plugins/plugin.types';

import { OptionType } from '@/core/shared/constants';

import { createSchedule } from './commands/create/handler';
import { CREATE_HUMAN_TEMPLATE, CreateOutputSchema } from './commands/create/output';
import { getScheduleStatus } from './commands/status/handler';
import { STATUS_HUMAN_TEMPLATE, StatusOutputSchema } from './commands/status/output';
import { watchSchedule } from './commands/watch/handler';
import { WATCH_HUMAN_TEMPLATE, WatchOutputSchema } from './commands/watch/output';

export const manifest: PluginManifest = {
  name: 'schedule',
  version: '1.0.0',
  displayName: 'Schedule',
  description: 'Create, inspect, and watch Hedera scheduled transactions.',

  commands: [
    {
      name: 'schedule:create',
      summary: 'Create a scheduled HBAR transfer',
      description:
        'Wraps an HBAR transfer inside a ScheduleCreateTransaction and submits it. ' +
        'The transfer is held on-chain until it is executed or the expiry window elapses.',
      options: [
        {
          name: 'to',
          type: OptionType.STRING,
          description: 'Recipient account ID (e.g. 0.0.1234)',
          required: true,
        },
        {
          name: 'amount',
          type: OptionType.STRING,
          description: 'Amount in tinybars to transfer (e.g. 50000000 = 0.5 ℏ)',
          required: true,
        },
        {
          name: 'expiry-seconds',
          type: OptionType.NUMBER,
          description: 'Seconds from now until the schedule expires (default: 2592000 = 30 days)',  
          required: false,
        },
        {
          name: 'memo',
          type: OptionType.STRING,
          description: 'Optional memo stored on the scheduled transaction (max 100 chars)',
          required: false,
        },
      ],
      handler: createSchedule,
      output: {
        schema: CreateOutputSchema,
        humanTemplate: CREATE_HUMAN_TEMPLATE,
      },
    },

    {
      name: 'schedule:status',
      summary: 'Check the current state of a scheduled transaction',
      description:
        'Queries the Hedera mirror node and returns whether the schedule is ' +
        'PENDING, EXECUTED, or DELETED.',
      options: [
        {
          name: 'schedule-id',
          type: OptionType.STRING,
          description: 'The schedule ID to look up (e.g. 0.0.5678)',
          required: true,
        },
      ],
      handler: getScheduleStatus,
      output: {
        schema: StatusOutputSchema,
        humanTemplate: STATUS_HUMAN_TEMPLATE,
      },
    },

    {
      name: 'schedule:watch',
      summary: 'Watch a scheduled transaction until it is executed or deleted',
      description:
        'Polls the mirror node at a configurable interval and exits once the ' +
        'schedule reaches a terminal state (EXECUTED / DELETED) or the timeout elapses.',
      options: [
        {
          name: 'schedule-id',
          type: OptionType.STRING,
          description: 'The schedule ID to watch (e.g. 0.0.5678)',
          required: true,
        },
        {
          name: 'poll-interval',
          type: OptionType.NUMBER,
          description: 'Polling interval in seconds (default: 3)',
          required: false,
        },
        {
          name: 'timeout',
          type: OptionType.NUMBER,
          description: 'Maximum seconds to wait before exiting (default: 3600)',
          required: false,
        },
      ],
      handler: watchSchedule,
      output: {
        schema: WatchOutputSchema,
        humanTemplate: WATCH_HUMAN_TEMPLATE,
      },
    },
  ],
};
