import { NULL_TOKEN } from '@/core/shared/constants';

export const isNullOrNonEmpty = (v: unknown): boolean => {
  if (v === NULL_TOKEN) return true;
  if (Array.isArray(v) && v.length > 0) return true;
  return false;
};
