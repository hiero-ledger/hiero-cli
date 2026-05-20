import type {
  Eip712Domain,
  Eip712TypedDataField,
} from '@/core/types/shared.types';

import { TypedDataEncoder } from 'ethers';

import { ValidationError } from '@/core';

export function resolveHash(
  hash?: string,
  domain?: Eip712Domain,
  types?: Record<string, Eip712TypedDataField[]>,
  message?: Record<string, unknown>,
): string {
  if (hash) {
    return hash;
  }
  if (domain && types && message) {
    const { EIP712Domain: _ignored, ...filteredTypes } = types;
    return TypedDataEncoder.hash(domain, filteredTypes, message);
  }
  throw new ValidationError(
    'There was a problem with resolving input data for message hash',
  );
}
