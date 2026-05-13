import { z } from 'zod';

import {
  Eip712DomainSchema,
  Eip712TypesSchema,
  typedJsonInput,
} from '@/core/schemas';

export const Eip712HashInputSchema = z.object({
  domain: typedJsonInput(Eip712DomainSchema).describe(
    'EIP-712 domain as inline JSON or path to a JSON file',
  ),
  types: typedJsonInput(Eip712TypesSchema).describe(
    'EIP-712 types definition as inline JSON or path to a JSON file',
  ),
  message: typedJsonInput(z.record(z.string(), z.unknown())).describe(
    'Message object as inline JSON or path to a JSON file',
  ),
});

export type Eip712HashInput = z.infer<typeof Eip712HashInputSchema>;
