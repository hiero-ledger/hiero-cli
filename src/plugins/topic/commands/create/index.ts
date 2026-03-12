/**
 * Create Topic Command Exports
 * For use by manifest, tests, and external consumers
 */
export {
  createTopic,
  CreateTopicCommand,
  TOPIC_CREATE_COMMAND_NAME,
} from './handler';
export type { CreateTopicOutput } from './output';
export { CREATE_TOPIC_TEMPLATE, CreateTopicOutputSchema } from './output';
