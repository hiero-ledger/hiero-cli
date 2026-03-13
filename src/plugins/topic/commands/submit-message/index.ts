/**
 * Submit Message Command Exports
 * For use by manifest, tests, and external consumers
 */
export {
  TOPIC_SUBMIT_MESSAGE_COMMAND_NAME,
  topicSubmitMessage,
  TopicTopicSubmitMessageCommand,
} from './handler';
export type { SubmitMessageOutput } from './output';
export {
  TOPIC_TOPIC_SUBMIT_MESSAGE_TEMPLATE,
  TopicTopicSubmitMessageOutputSchema,
} from './output';
