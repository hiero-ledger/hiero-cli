/**
 * Schedule transaction plugin (ScheduleCreate / ScheduleSign / ScheduleDelete + verify)
 */
import type { PluginManifest } from '@/core';

import { OptionType } from '@/core/types/shared.types';

import {
  SCHEDULE_CREATE_TEMPLATE,
  scheduleCreate,
  ScheduleCreateOutputSchema,
} from './commands/create';
import {
  SCHEDULE_DELETE_TEMPLATE,
  scheduleDelete,
  ScheduleDeleteOutputSchema,
} from './commands/delete';
import {
  SCHEDULE_SIGN_TEMPLATE,
  scheduleSign,
  ScheduleSignOutputSchema,
} from './commands/sign';
import {
  SCHEDULE_VERIFY_TEMPLATE,
  scheduleVerify,
  ScheduleVerifyOutputSchema,
} from './commands/verify';
import { ScheduledHook } from './hooks/scheduled/handler';

export { SCHEDULE_NAMESPACE } from './schema';

export const schedulePluginManifest: PluginManifest = {
  name: 'schedule',
  version: '1.0.0',
  displayName: 'Schedule Plugin',
  description:
    'Register schedule options in state, wrap transactions via the scheduled hook, then sign/delete/verify on chain',
  hooks: [
    {
      name: 'scheduled',
      hook: new ScheduledHook(),
      options: [
        {
          name: 'scheduled',
          short: 'X',
          type: OptionType.STRING,
          description:
            'Local schedule name (from schedule create). Wraps this command transaction in ScheduleCreateTransaction with stored options.',
        },
      ],
    },
  ],
  commands: [
    {
      name: 'create',
      summary: 'Register a named schedule in local state',
      description:
        'Like batch create: stores a name and schedule options (admin, execution payer, memo, expiration, wait-for-expiry). Use --scheduled <name> on a supported transaction command to submit ScheduleCreateTransaction.',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Local alias for this schedule',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Admin key for the schedule (optional; enables delete later; omit for immutable schedule)',
        },
        {
          name: 'payer-account',
          short: 'p',
          type: OptionType.STRING,
          required: false,
          description:
            'Account id or key reference for the execution fee payer (optional)',
        },
        {
          name: 'memo',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description: 'Public schedule memo (max 100 bytes)',
        },
        {
          name: 'expiration',
          short: 'e',
          type: OptionType.STRING,
          required: false,
          description: 'Expiration time (ISO 8601). Max 62 days from now.',
        },
        {
          name: 'wait-for-expiry',
          short: 'w',
          type: OptionType.BOOLEAN,
          required: false,
          description:
            'Execute at expiration time instead of when signatures are complete',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager (local or local_encrypted)',
        },
      ],
      handler: scheduleCreate,
      output: {
        schema: ScheduleCreateOutputSchema,
        humanTemplate: SCHEDULE_CREATE_TEMPLATE,
      },
    },
    {
      name: 'sign',
      summary: 'Add a signature to a scheduled transaction',
      description:
        'Submit a ScheduleSignTransaction for the schedule given by --schedule (entity id or local alias)',
      options: [
        {
          name: 'schedule',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Schedule id (0.0.x) or local alias from schedule create',
        },
        {
          name: 'key',
          short: 'k',
          type: OptionType.STRING,
          required: true,
          description: 'Key whose signature to add to the schedule',
        },
        {
          name: 'key-manager',
          short: 'K',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager (local or local_encrypted)',
        },
      ],
      handler: scheduleSign,
      output: {
        schema: ScheduleSignOutputSchema,
        humanTemplate: SCHEDULE_SIGN_TEMPLATE,
      },
    },
    {
      name: 'delete',
      summary: 'Delete a scheduled transaction',
      description:
        'Submit ScheduleDeleteTransaction for the schedule given by --schedule (entity id or local alias); requires admin key if one was set at create',
      options: [
        {
          name: 'schedule',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description:
            'Schedule id (0.0.x) or local alias from schedule create',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description: 'Admin key that was set on schedule create',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager (local or local_encrypted)',
        },
      ],
      handler: scheduleDelete,
      output: {
        schema: ScheduleDeleteOutputSchema,
        humanTemplate: SCHEDULE_DELETE_TEMPLATE,
      },
    },
    {
      name: 'verify',
      summary: 'Query schedule execution state',
      description:
        'Run ScheduleInfoQuery to see whether the schedule executed, was deleted, expiration, etc.',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Local alias from schedule create',
        },
        {
          name: 'schedule-id',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description: 'Schedule id (0.0.x)',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager (local or local_encrypted)',
        },
      ],
      handler: scheduleVerify,
      output: {
        schema: ScheduleVerifyOutputSchema,
        humanTemplate: SCHEDULE_VERIFY_TEMPLATE,
      },
    },
  ],
};

export default schedulePluginManifest;
