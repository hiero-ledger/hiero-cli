/**
 * Submit Message Command Exports
 * For use by manifest, tests, and external consumers
 */
export {
  SubmitMessageCommand,
  TOPIC_SUBMIT_MESSAGE_COMMAND_NAME,
  topicSubmitMessage,
} from './handler';
export type { SubmitMessageOutput } from './output';
export { SUBMIT_MESSAGE_TEMPLATE, SubmitMessageOutputSchema } from './output';
