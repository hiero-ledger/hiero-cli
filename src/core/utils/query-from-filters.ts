import { Filter } from '../services/mirrornode/types';

export function constructQueryFromFilters(
  baseUrl: string,
  filters: Filter[],
): string {
  if (filters.length === 0) {
    return baseUrl;
  }

  const queryParams = filters.map(
    (filter) =>
      `${encodeURIComponent(filter.field)}=${
        filter.operation
      }:${encodeURIComponent(filter.value)}`,
  );
  return `${baseUrl}?${queryParams.join('&')}&limit=100`;
}
