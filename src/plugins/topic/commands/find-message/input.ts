import { z } from 'zod';
import {
  EntityReferenceSchema,
  PositiveIntFilterFieldSchema,
} from '../../../../core/schemas';

/**
 * Input schema for topic find-message command
 * Validates arguments for finding messages in a topic
 *
 * At least one sequence number filter must be provided:
 * - sequence: exact sequence number
 * - sequenceGt, sequenceGte, sequenceLt, sequenceLte, sequenceEq: filter operations
 */
export const FindMessageInputSchema = z.object({
  topic: EntityReferenceSchema.describe('Topic ID or topic name/alias'),
  sequenceGt: PositiveIntFilterFieldSchema.describe(
    'Filter messages with sequence number greater than',
  ),
  sequenceGte: PositiveIntFilterFieldSchema.describe(
    'Filter messages with sequence number greater than or equal to',
  ),
  sequenceLt: PositiveIntFilterFieldSchema.describe(
    'Filter messages with sequence number less than',
  ),
  sequenceLte: PositiveIntFilterFieldSchema.describe(
    'Filter messages with sequence number less than or equal to',
  ),
  sequenceEq: PositiveIntFilterFieldSchema.describe(
    'Filter messages with sequence number equal to',
  ),
});

export type FindMessageInput = z.infer<typeof FindMessageInputSchema>;
