/**
 * Topic List Command Handler
 * Handles listing topics from state
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../utils/errors';
import { ZustandTopicStateHelper } from '../../zustand-state-helper';
import { ListTopicsOutput } from './output';

/**
 * Default export handler function for topic listing
 * @param args - Command handler arguments from CLI core
 * @returns Promise resolving to CommandExecutionResult with structured output
 */
export async function listTopics(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper for topic state management
  const topicState = new ZustandTopicStateHelper(api.state, logger);

  // Extract command arguments for filtering
  const networkFilter = args.args.network as string | undefined;

  // Log progress indicator (not final output)
  logger.log('Listing topics...');

  try {
    // Step 1: Get all topics from state
    let topics = topicState.listTopics();

    // Step 2: Apply network filter if specified
    if (networkFilter) {
      topics = topics.filter((topic) => topic.network === networkFilter);
    }

    // Step 3: Calculate statistics for template rendering
    const stats = {
      withAdminKey: topics.filter((t) => t.adminKeyRefId).length,
      withSubmitKey: topics.filter((t) => t.submitKeyRefId).length,
      withMemo: topics.filter((t) => t.memo && t.memo !== '(No memo)').length,
      byNetwork: topics.reduce(
        (acc, topic) => {
          acc[topic.network] = (acc[topic.network] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    // Step 4: Transform topics into output format
    const topicsOutput = topics.map((topic) => ({
      name: topic.name,
      topicId: topic.topicId,
      network: topic.network,
      memo: topic.memo && topic.memo !== '(No memo)' ? topic.memo : null,
      adminKeyPresent: Boolean(topic.adminKeyRefId),
      submitKeyPresent: Boolean(topic.submitKeyRefId),
      createdAt: topic.createdAt,
    }));

    // Step 5: Prepare structured output data
    const outputData: ListTopicsOutput = {
      topics: topicsOutput,
      totalCount: topics.length,
      stats,
    };

    // Return success result with JSON output
    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    // Catch and format any errors
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list topics', error),
    };
  }
}
