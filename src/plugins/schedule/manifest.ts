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
  description: 'Plugin for managing Hedera scheduled transaction',
  hooks: [
    {
      name: 'scheduled',
      hook: new ScheduledHook(),
      options: [
        {
          name: 'scheduled',
          short: 'X',
          type: OptionType.STRING,
          description: 'Name of the schedule record in the local state',
        },
      ],
    },
  ],
  commands: [
    {
      name: 'create',
      summary: 'Register a named schedule in local state',
      description:
        'Create a new schedule record by providing parameters for scheduled transaction creation',
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: true,
          description: 'Name of the schedule. Option required',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Admin key for the schedule for managing scheduled transaction on Hedera chain',
        },
        {
          name: 'payer-account',
          short: 'p',
          type: OptionType.STRING,
          required: false,
          description:
            'Payer account of token. Must be resolved to account ID with private key. Defaults to operator.',
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
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
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
      description: 'Signs scheduled transaction with the given key',
      registeredHooks: [
        {
          hook: 'account-create-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'account-update-state',
          phase: 'postOutputPreparation',
        },
      ],
      options: [
        {
          name: 'schedule',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description: 'Schedule ID in format (0.0.x) or local schedule name',
        },
        {
          name: 'key',
          short: 'k',
          type: OptionType.STRING,
          required: true,
          description:
            'Key whose signature to add to the schedule. Key must be resolved to private key',
        },
        {
          name: 'key-manager',
          short: 'K',
          type: OptionType.STRING,
          required: false,
          description:
            'Key manager to use: local or local_encrypted (defaults to config setting)',
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
        'Delete schedule record from local state and from Hedera chain if it was created and executed. Admin key must be set to perform this operation',
      options: [
        {
          name: 'schedule',
          short: 's',
          type: OptionType.STRING,
          required: true,
          description: 'Schedule id (0.0.x) or local schedule name',
        },
        {
          name: 'admin-key',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Admin key to sign the transaction. If not provided the admin key from state is used to perform this operation.',
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
      handler: scheduleDelete,
      output: {
        schema: ScheduleDeleteOutputSchema,
        humanTemplate: SCHEDULE_DELETE_TEMPLATE,
      },
    },
    {
      name: 'verify',
      summary: 'Verify schedule execution state',
      description:
        'Verify if scheduled transaction was executed and/or import scheduled transaction information to the local state',
      registeredHooks: [
        {
          hook: 'account-create-state',
          phase: 'postOutputPreparation',
        },
        {
          hook: 'account-update-state',
          phase: 'postOutputPreparation',
        },
      ],
      options: [
        {
          name: 'name',
          short: 'n',
          type: OptionType.STRING,
          required: false,
          description: 'Local name of schedule record',
        },
        {
          name: 'schedule-id',
          short: 's',
          type: OptionType.STRING,
          required: false,
          description: 'Schedule ID in format (0.0.x)',
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
      handler: scheduleVerify,
      output: {
        schema: ScheduleVerifyOutputSchema,
        humanTemplate: SCHEDULE_VERIFY_TEMPLATE,
      },
    },
  ],
};

export default schedulePluginManifest;
