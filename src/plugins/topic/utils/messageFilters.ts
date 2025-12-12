/**
 * Message Filter Utilities
 * Utilities for filtering topic messages by sequence number
 */
import type { Filter } from '@/core/services/mirrornode/types';
import type { FindMessageInput } from '@/plugins/topic/commands/find-message/input';

/**
 * Helper function to build all filters for API query
 * Mirror Node API supports multiple filters in the same query parameter
 * @param params - Validated input parameters containing filter values
 * @returns Array of Filter objects
 */
export function buildApiFilters(params: FindMessageInput): Filter[] {
  const filters: Filter[] = [];

  if (params.sequenceEq !== undefined) {
    filters.push({
      field: 'sequenceNumber',
      operation: 'eq',
      value: params.sequenceEq,
    });
  }
  if (params.sequenceGt !== undefined) {
    filters.push({
      field: 'sequenceNumber',
      operation: 'gt',
      value: params.sequenceGt,
    });
  }
  if (params.sequenceGte !== undefined) {
    filters.push({
      field: 'sequenceNumber',
      operation: 'gte',
      value: params.sequenceGte,
    });
  }
  if (params.sequenceLt !== undefined) {
    filters.push({
      field: 'sequenceNumber',
      operation: 'lt',
      value: params.sequenceLt,
    });
  }
  if (params.sequenceLte !== undefined) {
    filters.push({
      field: 'sequenceNumber',
      operation: 'lte',
      value: params.sequenceLte,
    });
  }

  return filters;
}
