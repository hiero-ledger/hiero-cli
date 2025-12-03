import { CoreApi } from '../../../../core/core-api/core-api.interface';
import { submitMessage } from '../../../../plugins/topic';

export async function submitMessageToTopic(
  message: string,
  topic: string,
  coreApi: CoreApi,
) {
  const topicMessageSubmitArgs: Record<string, unknown> = {
    topic: topic,
    message: message,
  };
  return submitMessage({
    args: topicMessageSubmitArgs,
    api: coreApi,
    state: coreApi.state,
    logger: coreApi.logger,
    config: coreApi.config,
  });
}
