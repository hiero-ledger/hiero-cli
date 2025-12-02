/**
 * Topic Create Command Handler
 * Handles topic creation using the Core API
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { ZustandTopicStateHelper } from '../../zustand-state-helper';
import { AliasRecord } from '../../../../core/services/alias/alias-service.interface';
import { CreateTopicOutput } from './output';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';
import { CreateTopicInputSchema } from './input';

/**
 * Default export handler function for topic creation
 * @param args - Command handler arguments from CLI core
 * @returns Promise resolving to CommandExecutionResult with structured output
 */
export async function createTopic(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper for topic state management
  const topicState = new ZustandTopicStateHelper(api.state, logger);

  // Extract and validate command arguments
  const validArgs = CreateTopicInputSchema.parse(args.args);

  const memo = validArgs.memo;
  const adminKey = validArgs.adminKey;
  const submitKey = validArgs.submitKey;
  const alias = validArgs.name;
  const keyManagerArg = validArgs.keyManager;

  // Check if alias already exists on the current network
  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  // Generate default name if alias not provided
  const name = alias || `topic-${Date.now()}`;

  // Log progress indicator (not final output)
  if (memo) {
    logger.info(`Creating topic with memo: ${memo}`);
  }

  try {
    const currentNetwork = api.network.getCurrentNetwork();

    // Step 1: Resolve admin and submit key aliases to account references
    let topicAdminKeyAlias: AliasRecord | undefined = undefined;
    let topicSubmitKeyAlias: AliasRecord | undefined = undefined;

    if (adminKey && typeof adminKey === 'string') {
      const adminKeyAlias = api.alias.resolve(
        adminKey,
        'account',
        currentNetwork,
      );

      if (adminKeyAlias) {
        topicAdminKeyAlias = adminKeyAlias;
      }
    }

    if (submitKey && typeof submitKey === 'string') {
      const submitKeyAlias = api.alias.resolve(
        submitKey,
        'account',
        currentNetwork,
      );

      if (submitKeyAlias) {
        topicSubmitKeyAlias = submitKeyAlias;
      }
    }

    // Step 2: Create topic transaction using Core API
    const topicCreateResult = api.topic.createTopic({
      memo,
      adminKey:
        topicAdminKeyAlias?.publicKey ||
        (typeof adminKey === 'string' ? adminKey : adminKey?.privateKey),
      submitKey:
        topicSubmitKeyAlias?.publicKey ||
        (typeof submitKey === 'string' ? submitKey : submitKey?.privateKey),
    });

    // Step 3: Import keys into KMS if they were provided directly (not via alias)
    let adminKeyRefId: string | undefined = topicAdminKeyAlias?.keyRefId;
    let submitKeyRefId: string | undefined = topicSubmitKeyAlias?.keyRefId;

    if (adminKey && !topicAdminKeyAlias && typeof adminKey !== 'string') {
      // adminKey is already parsed by schema (PrivateKeyWithTypeSchema)
      const { keyType, privateKey } = adminKey;
      const { keyRefId } = api.kms.importPrivateKey(
        keyType,
        privateKey,
        keyManager,
        ['topic:admin', `topic:${name}`],
      );
      adminKeyRefId = keyRefId;
    }

    if (submitKey && !topicSubmitKeyAlias && typeof submitKey !== 'string') {
      // submitKey is already parsed by schema (PrivateKeyWithTypeSchema)
      const { keyType, privateKey } = submitKey;
      const { keyRefId } = api.kms.importPrivateKey(
        keyType,
        privateKey,
        keyManager,
        ['topic:submit', `topic:${name}`],
      );
      submitKeyRefId = keyRefId;
    }

    // Step 4: Sign and execute transaction (with admin key if present)
    let result;
    if (topicAdminKeyAlias?.publicKey || adminKey) {
      if (!adminKeyRefId) {
        throw new Error(
          '[TOPIC-CREATE] Admin key was provided but keyRefId is undefined',
        );
      }
      result = await api.txExecution.signAndExecuteWith(
        topicCreateResult.transaction,
        [adminKeyRefId],
      );
    } else {
      result = await api.txExecution.signAndExecute(
        topicCreateResult.transaction,
      );
    }

    if (result.success) {
      // Step 5: Store topic metadata in state
      const topicData = {
        name,
        topicId: result.topicId || '(unknown)',
        memo: memo || '(No memo)',
        adminKeyRefId,
        submitKeyRefId,
        network: api.network.getCurrentNetwork(),
        createdAt: result.consensusTimestamp,
        updatedAt: result.consensusTimestamp,
      };

      // Step 6: Register alias if provided
      if (alias) {
        api.alias.register({
          alias,
          type: 'topic',
          network: api.network.getCurrentNetwork(),
          entityId: result.topicId,
          createdAt: result.consensusTimestamp,
        });
      }

      // Step 7: Save topic to state
      topicState.saveTopic(String(result.topicId), topicData);

      // Step 8: Prepare structured output data
      const outputData: CreateTopicOutput = {
        topicId: topicData.topicId,
        name: topicData.name,
        network: topicData.network,
        memo: memo, // Only include if present
        adminKeyPresent: Boolean(topicData.adminKeyRefId),
        submitKeyPresent: Boolean(topicData.submitKeyRefId),
        transactionId: result.transactionId || '',
        createdAt: topicData.createdAt,
      };

      // Return success result with JSON output
      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    } else {
      // Transaction execution failed
      return {
        status: Status.Failure,
        errorMessage: 'Failed to create topic',
      };
    }
  } catch (error: unknown) {
    // Catch and format any errors
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create topic', error),
    };
  }
}
