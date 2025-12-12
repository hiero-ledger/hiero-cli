/**
 * Topic Create Command Handler
 * Handles topic creation using the Core API
 */
import { CommandHandlerArgs, TransactionResult } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { ZustandTopicStateHelper } from '../../zustand-state-helper';
import { CreateTopicOutput } from './output';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';
import { CreateTopicInputSchema } from './input';
import { PublicKey } from '@hashgraph/sdk';

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
  const adminKeyArg = validArgs.adminKey;
  const submitKeyArg = validArgs.submitKey;
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

  const adminKey =
    adminKeyArg &&
    (await api.keyResolver.getOrInitKey(adminKeyArg, keyManager, [
      'topic:admin',
      `topic:${name}`,
    ]));

  const submitKey =
    submitKeyArg &&
    (await api.keyResolver.getOrInitKey(submitKeyArg, keyManager, [
      'topic:submit',
      `topic:${name}`,
    ]));

  try {
    // Step 2: Create topic transaction using Core API
    const topicCreateResult = api.topic.createTopic({
      memo,
      adminKey: adminKey && PublicKey.fromString(adminKey.publicKey),
      submitKey: submitKey && PublicKey.fromString(submitKey.publicKey),
    });

    let result: TransactionResult;

    if (adminKey) {
      result = await api.txExecution.signAndExecuteWith(
        topicCreateResult.transaction,
        [adminKey.keyRefId],
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
        adminKeyRefId: adminKey?.keyRefId,
        submitKeyRefId: submitKey?.keyRefId,
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
