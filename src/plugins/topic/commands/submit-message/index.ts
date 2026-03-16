/**
 * Submit Message Command Exports
 * For use by manifest, tests, and external consumers
 */
export {
  TOPIC_SUBMIT_MESSAGE_COMMAND_NAME,
  topicSubmitMessage,
  TopicSubmitMessageCommand,
} from './handler';
export type { TopicSubmitMessageOutput } from './output';
export {
  TOPIC_SUBMIT_MESSAGE_TEMPLATE,
  TopicSubmitMessageOutputSchema,
} from './output';
