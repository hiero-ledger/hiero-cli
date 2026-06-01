import { AccountId } from '@hiero-ledger/sdk';

import { EvmAddressSchema } from '@/core/schemas';

export function toSdkAccountId(value: string): AccountId {
  return EvmAddressSchema.safeParse(value).success
    ? AccountId.fromEvmAddress(0, 0, value)
    : AccountId.fromString(value);
}
