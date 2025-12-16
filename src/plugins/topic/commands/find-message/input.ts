import { z } from 'zod';

import {
  EntityReferenceSchema,
  PositiveIntFilterFieldSchema,
} from '@/core/schemas';

/**
 * Input schema for topic find-message command
 * Validates arguments for finding messages in a topic
 *
 * Multiple sequence number filters can be provided, but they must not be contradictory:
 * - sequenceGt, sequenceGte, sequenceLt, sequenceLte, sequenceEq: filter operations
 * - sequenceEq cannot be combined with other filters
 * - Lower bound filters (gt/gte) must be less than upper bound filters (lt/lte)
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
      if (data.sequenceEq !== undefined) {
        const otherFilters = [
          data.sequenceGt,
          data.sequenceGte,
          data.sequenceLt,
          data.sequenceLte,
        ];
        const hasOtherFilters = otherFilters.some(
          (filter) => filter !== undefined,
        );
        if (hasOtherFilters) {
          return false;
        }
      }

      const lowerBound = data.sequenceGte ?? data.sequenceGt;
      const upperBound = data.sequenceLte ?? data.sequenceLt;

      if (lowerBound !== undefined && upperBound !== undefined) {
        // For gt/lt: lowerBound must be strictly less than upperBound
        // For gte/lte: lowerBound can be equal to upperBound
        const isStrictLower = data.sequenceGt !== undefined;
        const isStrictUpper = data.sequenceLt !== undefined;

        if (isStrictLower || isStrictUpper) {
          // At least one is strict, so lowerBound must be strictly less
          return lowerBound < upperBound;
        } else {
          // Both are inclusive, so lowerBound can be less than or equal
          return lowerBound <= upperBound;
        }
      }

      return true;
    },
    {
      message:
        'Sequence number filters are contradictory. sequenceEq cannot be combined with other filters, and lower bound filters (gt/gte) must be less than upper bound filters (lt/lte).',
    },
  );

export type FindMessageInput = z.infer<typeof FindMessageInputSchema>;
