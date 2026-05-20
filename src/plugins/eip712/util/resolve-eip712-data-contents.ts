import type {
  Eip712Data,
  JsonInput,
} from '@/plugins/eip712/types/shared.types';

import { z } from 'zod';

import { Eip712DomainSchema, Eip712TypesSchema } from '@/core/schemas';

import { resolveTypedJsonInput } from './resolve-typed-json-input';

export function resolveEip712DataContents(input: {
  domain?: JsonInput;
  types?: JsonInput;
  message?: JsonInput;
}): Eip712Data {
  return {
    domain: input.domain
      ? resolveTypedJsonInput(input.domain, Eip712DomainSchema)
      : undefined,
    types: input.types
      ? resolveTypedJsonInput(input.types, Eip712TypesSchema)
      : undefined,
    message: input.message
      ? resolveTypedJsonInput(input.message, z.record(z.string(), z.unknown()))
      : undefined,
  };
}
