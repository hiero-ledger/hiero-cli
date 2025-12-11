import { z } from 'zod';
import {
  EntityReferenceSchema,
  PositiveIntFilterFieldSchema,
} from '../../../../core/schemas';

/**
 * Input schema for topic find-message command
 * Validates arguments for finding messages in a topic
 *
 * Only one sequence number filter can be provided at a time:
 * - sequenceGt, sequenceGte, sequenceLt, sequenceLte, sequenceEq: filter operations
 */
export const FindMessageInputSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      const filters = [
        data.sequenceGt,
        data.sequenceGte,
        data.sequenceLt,
        data.sequenceLte,
        data.sequenceEq,
      ];
      const providedFilters = filters.filter((filter) => filter !== undefined);
      return providedFilters.length <= 1;
    },
    {
      message:
        'Only one sequence number filter can be provided at a time. Please specify only one of: -g (--sequence-gt), -G (--sequence-gte), -l (--sequence-lt), -L (--sequence-lte), or -e (--sequence-eq)',
    },
  );

export type FindMessageInput = z.infer<typeof FindMessageInputSchema>;
