import { AccountAPIResponseSchema } from '@/core/services/mirrornode/schemas';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';

import { createMockAccountAPIResponse } from './mocks';

describe('AccountAPIResponseSchema - key field', () => {
  test('accepts null key (hollow account)', () => {
    const result = AccountAPIResponseSchema.safeParse(
      createMockAccountAPIResponse({ key: null }),
    );
    expect(result.success).toBe(true);
  });

  test('accepts a valid key object', () => {
    const result = AccountAPIResponseSchema.safeParse(
      createMockAccountAPIResponse({
        key: { _type: MirrorNodeKeyType.ECDSA_SECP256K1, key: 'abcd' },
      }),
    );
    expect(result.success).toBe(true);
  });

  test('accepts a missing key', () => {
    const result = AccountAPIResponseSchema.safeParse(
      createMockAccountAPIResponse({ key: undefined }),
    );
    expect(result.success).toBe(true);
  });
});
